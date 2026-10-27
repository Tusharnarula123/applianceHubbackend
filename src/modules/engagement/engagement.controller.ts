import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, Res, Headers,
  UseGuards, HttpCode, HttpStatus, ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import * as crypto from 'crypto';
import { EngagementService, type Actor } from './engagement.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';

/** Brand dashboard: campaigns, audiences, subscribers and the outbox. */
@ApiTags('Campaigns & notifications')
@Controller('v1/engagement')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EngagementDashboardController {
  constructor(private readonly engagement: EngagementService) {}

  private actor(req: any): Actor {
    return { id: req.user?.id, email: req.user?.email, business_id: req.user?.business_id };
  }

  @Get('campaigns')
  list(@Req() req: any) {
    return this.engagement.listCampaigns(this.actor(req));
  }

  @Post('campaigns')
  create(@Req() req: any, @Body() body: Record<string, any>) {
    return this.engagement.createCampaign(this.actor(req), body);
  }

  @Patch('campaigns/:id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: Record<string, any>) {
    return this.engagement.updateCampaign(this.actor(req), id, body);
  }

  @Delete('campaigns/:id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.engagement.deleteCampaign(this.actor(req), id);
  }

  @Get('campaigns/:id/stats')
  @ApiQuery({ name: 'days', required: false })
  stats(@Req() req: any, @Param('id') id: string, @Query('days') days?: string) {
    return this.engagement.campaignStats(this.actor(req), id, Math.min(Math.max(Number(days) || 30, 7), 90));
  }

  @Get('campaigns/:id/audience')
  @ApiOperation({ summary: 'How many opted-in customers would receive this campaign, per channel' })
  audience(@Req() req: any, @Param('id') id: string) {
    return this.engagement.audiencePreview(this.actor(req), id);
  }

  @Post('campaigns/:id/send')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Queue the campaign for every eligible opted-in customer' })
  send(@Req() req: any, @Param('id') id: string) {
    return this.engagement.sendCampaign(this.actor(req), id);
  }

  @Get('subscribers')
  subscribers(@Req() req: any) {
    return this.engagement.subscriberSummary(this.actor(req));
  }

  @Get('notifications')
  jobs(@Req() req: any) {
    return this.engagement.listJobs(this.actor(req));
  }

  @Get('channels')
  channels() {
    return this.engagement.channelStatus();
  }

  @Post('test')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  test(@Req() req: any, @Body() body: { channel?: string; to?: string; push_subscription?: Record<string, any> }) {
    return this.engagement.sendTest(this.actor(req), body);
  }
}

/** Public endpoints used by the chat page, emails and Meta. */
@ApiTags('Campaigns & notifications')
@Controller('api')
export class EngagementPublicController {
  constructor(
    private readonly engagement: EngagementService,
    private readonly config: ConfigService,
  ) {}

  @Get('engagement/placement')
  @ApiOperation({ summary: 'Best offer for a product at a moment in the chat (or null)' })
  @ApiQuery({ name: 'appliance_id', required: true })
  @ApiQuery({ name: 'moment', required: true })
  @ApiQuery({ name: 'session_id', required: false })
  async placement(@Query('appliance_id') applianceId: string, @Query('moment') moment: string, @Query('session_id') sessionId?: string) {
    return { offer: await this.engagement.placement(applianceId, moment, sessionId) };
  }

  /** Tracked click → 302 to the brand's page with UTM tags. */
  @Get('c/:campaignId')
  async click(
    @Param('campaignId') campaignId: string,
    @Query('ch') channel: string,
    @Query('sid') sessionId: string | undefined,
    @Query('s') subscriberId: string | undefined,
    @Res() res: Response,
  ) {
    const url = await this.engagement.click(campaignId, channel ?? 'chat', sessionId, subscriberId);
    res.redirect(302, url);
  }

  @Get('engagement/push-key')
  pushKey() {
    return { public_key: this.engagement.pushPublicKey() };
  }

  @Post('engagement/subscribe')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer opts in to reminders and/or offers for one product' })
  subscribe(@Body() body: Record<string, any>) {
    return this.engagement.subscribe(body);
  }

  @Get('engagement/preferences/:token')
  preferences(@Param('token') token: string) {
    return this.engagement.getPreferences(token);
  }

  @Post('engagement/preferences/:token')
  @HttpCode(HttpStatus.OK)
  updatePreferences(@Param('token') token: string, @Body() body: Record<string, any>) {
    return this.engagement.updatePreferences(token, body);
  }

  /** One-click unsubscribe from email clients (List-Unsubscribe-Post). */
  @Post('engagement/preferences/:token/unsubscribe')
  @HttpCode(HttpStatus.OK)
  oneClick(@Param('token') token: string) {
    return this.engagement.updatePreferences(token, { unsubscribe_all: true });
  }

  // ── Meta WhatsApp webhook ─────────────────────────────────────────────────

  /** Meta calls this once to verify the webhook URL. */
  @Get('engagement/whatsapp/webhook')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const expected = this.config.get<string>('WHATSAPP_VERIFY_TOKEN');
    if (mode === 'subscribe' && expected && token === expected) return res.status(200).send(challenge);
    return res.status(403).send('Forbidden');
  }

  /** Incoming WhatsApp messages: STOP / UNSUBSCRIBE turns off WhatsApp offers for that number. */
  @Post('engagement/whatsapp/webhook')
  @HttpCode(HttpStatus.OK)
  async inbound(@Req() req: any, @Headers('x-hub-signature-256') signature?: string) {
    const appSecret = this.config.get<string>('WHATSAPP_APP_SECRET');
    if (appSecret) {
      const raw: Buffer = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
      const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(raw).digest('hex')}`;
      const ok = signature && signature.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
      if (!ok) throw new ForbiddenException('Invalid signature');
    }
    let optedOut = 0;
    for (const entry of req.body?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        for (const m of change?.value?.messages ?? []) {
          const text = String(m?.text?.body ?? m?.button?.text ?? '').trim().toUpperCase();
          if (m?.from && /^(STOP|UNSUBSCRIBE|STOP ALL|CANCEL)$/.test(text)) {
            optedOut += await this.engagement.whatsappOptOut(String(m.from));
          }
        }
      }
    }
    return { received: true, opted_out: optedOut };
  }
}
