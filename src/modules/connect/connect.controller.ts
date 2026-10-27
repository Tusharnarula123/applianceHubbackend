import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, Headers,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConnectService, type Actor } from './connect.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';

/**
 * Scana Connect API (v1). Every authenticated route is scoped to the caller's
 * own business — the business id comes from the token, never from the URL.
 */
@ApiTags('Scana Connect')
@Controller('v1/connect')
export class ConnectController {
  constructor(private readonly connect: ConnectService) {}

  private actor(req: any): Actor {
    return { id: req.user?.id, email: req.user?.email, business_id: req.user?.business_id };
  }

  @Get('overview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Connection health, product counts and delivery queue' })
  overview(@Req() req: any) {
    return this.connect.overview(this.actor(req));
  }

  // ── Connections ───────────────────────────────────────────────────────────

  @Get('connections')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  listConnections(@Req() req: any) {
    return this.connect.listConnections(this.actor(req));
  }

  @Post('connections')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a webhook connection. The signing secret is returned once.' })
  createConnection(@Req() req: any, @Body() body: { name?: string; url?: string; mode?: string; require_approval?: boolean }) {
    return this.connect.createConnection(this.actor(req), body);
  }

  @Patch('connections/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  updateConnection(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.connect.updateConnection(this.actor(req), id, body);
  }

  @Post('connections/:id/test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a signed test event to the webhook' })
  testConnection(@Req() req: any, @Param('id') id: string) {
    return this.connect.testConnection(this.actor(req), id);
  }

  @Post('connections/:id/rotate-secret')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  rotateSecret(@Req() req: any, @Param('id') id: string) {
    return this.connect.rotateSecret(this.actor(req), id);
  }

  @Delete('connections/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  deleteConnection(@Req() req: any, @Param('id') id: string) {
    return this.connect.deleteConnection(this.actor(req), id);
  }

  // ── Deliveries ────────────────────────────────────────────────────────────

  @Get('deliveries')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'status', required: false })
  listDeliveries(@Req() req: any, @Query('status') status?: string) {
    return this.connect.listDeliveries(this.actor(req), status);
  }

  @Post('deliveries/:id/approve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  approve(@Req() req: any, @Param('id') id: string) {
    return this.connect.approveDelivery(this.actor(req), id);
  }

  @Post('deliveries/:id/reject')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  reject(@Req() req: any, @Param('id') id: string) {
    return this.connect.rejectDelivery(this.actor(req), id);
  }

  @Post('deliveries/:id/retry')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  retry(@Req() req: any, @Param('id') id: string) {
    return this.connect.retryDelivery(this.actor(req), id);
  }

  // ── Catalogue import ──────────────────────────────────────────────────────

  @Post('products/imports/preview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Parse a catalogue CSV and preview matches — nothing is saved' })
  previewImport(@Req() req: any, @Body() body: { csv?: string; mapping?: Record<string, string> }) {
    return this.connect.previewCatalog(this.actor(req), body as any);
  }

  @Post('products/imports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Import confirmed catalogue rows' })
  runImport(@Req() req: any, @Body() body: any) {
    return this.connect.importCatalog(this.actor(req), body);
  }

  // ── History ───────────────────────────────────────────────────────────────

  @Get('sync-runs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  syncRuns(@Req() req: any) {
    return this.connect.listRuns(this.actor(req));
  }

  @Get('audit-events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  audit(@Req() req: any) {
    const a = this.actor(req);
    return this.connect.listAudit(a.business_id ?? '');
  }

  // ── Inbound webhook (public, signature-verified) ──────────────────────────

  @Post('webhooks/:connectionId')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive ticket id / status updates from the help desk (HMAC-signed)' })
  inbound(
    @Param('connectionId') connectionId: string,
    @Req() req: any,
    @Headers('x-scana-signature') signature?: string,
  ) {
    const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body ?? {});
    return this.connect.handleInbound(connectionId, raw, signature);
  }
}
