import {
  Controller, Get, Post, Patch, Param, Body, Query, Req, Res, UseGuards, UseInterceptors,
  UploadedFile, UploadedFiles, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import type { Response } from 'express';
import type { File as MulterFile } from 'multer';
import { ResolveService } from './resolve.service.js';
import { JourneyService, type Actor } from './journey.service.js';
import { AiChatService } from '../chat/ai-chat.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';

const sendFile = (res: Response, file: { buffer: Buffer; mime: string; name: string }, inline = true) => {
  res.set({
    'Content-Type': file.mime,
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${file.name.replace(/[^\w.\- ]/g, '_')}"`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.send(file.buffer);
};

/** Public (customer) side of the repair journey: identify → diagnose → case → follow. */
@ApiTags('Repair journey')
@Controller('v1')
export class JourneyPublicController {
  constructor(
    private readonly resolver: ResolveService,
    private readonly journey: JourneyService,
    private readonly aiChat: AiChatService,
  ) {}

  @Get('products/resolve')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiOperation({ summary: 'Resolve a barcode / typed model to catalogue candidates (exact or needs confirmation)' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'method', required: false, description: 'qr | barcode | typed' })
  @ApiQuery({ name: 'brand', required: false, description: 'Limit to one brand (business id)' })
  resolve(@Query('q') q: string, @Query('method') method?: string, @Query('brand') brand?: string) {
    return this.resolver.resolve(q, method ?? 'typed', brand || null);
  }

  @Post('products/resolve/photo')
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 8 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Read the model number from a photo of the rating plate, then resolve it' })
  resolvePhoto(@UploadedFile() photo: MulterFile, @Query('brand') brand?: string) {
    if (!photo) throw new BadRequestException('Attach a photo of the model label');
    return this.resolver.readLabel(photo.buffer, photo.mimetype, brand || null);
  }

  @Post('products/resolve/:resolutionId/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer confirms which product they have' })
  confirm(@Param('resolutionId') id: string, @Body() body: { appliance_id?: string; edited?: boolean }) {
    if (!body.appliance_id) throw new BadRequestException('appliance_id is required');
    return this.resolver.confirm(id, body.appliance_id, Boolean(body.edited));
  }

  @Post('diagnostic-sessions')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({ summary: 'Start a guided diagnostic (AI chat) session for a resolved product' })
  startSession(@Body() body: { appliance_id?: string; customer_name?: string; customer_email?: string }) {
    if (!body.appliance_id) throw new BadRequestException('appliance_id is required');
    return this.aiChat.createAiSession(body.appliance_id, { customer_name: body.customer_name, customer_email: body.customer_email });
  }

  // ── Case tracking (token from the case link) ──────────────────────────────

  @Get('cases/:token')
  @ApiOperation({ summary: 'Customer case page: canonical status, confirmed events, next step' })
  getCase(@Param('token') token: string) {
    return this.journey.publicCase(token);
  }

  @Patch('cases/:token')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  updateCase(@Param('token') token: string, @Body() body: Record<string, any>) {
    return this.journey.updateDetails(token, body);
  }

  @Post('cases/:token/evidence')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 6, { limits: { fileSize: 15 * 1024 * 1024 } }))
  addEvidence(@Param('token') token: string, @UploadedFiles() files: MulterFile[]) {
    return this.journey.addEvidence(token, files ?? []);
  }

  @Get('cases/:token/evidence/:evidenceId')
  async evidence(@Param('token') token: string, @Param('evidenceId') id: string, @Res() res: Response) {
    sendFile(res, await this.journey.evidenceForCustomer(token, id));
  }

  @Post('cases/:token/outcome')
  @HttpCode(HttpStatus.OK)
  outcome(@Param('token') token: string, @Body() body: { fixed?: boolean; note?: string }) {
    return this.journey.confirmOutcome(token, body);
  }
}

/** Brand dashboard side: case detail, evidence, claim packet, operations metrics. */
@ApiTags('Repair journey')
@Controller('v1/journey')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class JourneyDashboardController {
  constructor(private readonly journey: JourneyService) {}

  private actor(req: any): Actor {
    return { id: req.user?.id, email: req.user?.email, business_id: req.user?.business_id };
  }

  @Get('cases/:id')
  teamCase(@Req() req: any, @Param('id') id: string) {
    return this.journey.teamCase(this.actor(req), id);
  }

  @Get('cases/:id/evidence/:evidenceId')
  async evidence(@Req() req: any, @Param('id') id: string, @Param('evidenceId') evidenceId: string, @Res() res: Response) {
    sendFile(res, await this.journey.evidenceForTeam(this.actor(req), id, evidenceId));
  }

  @Get('cases/:id/claim-packet')
  @ApiOperation({ summary: 'Warranty claim packet PDF (evidence only — no coverage decision)' })
  async claimPacket(@Req() req: any, @Param('id') id: string, @Res() res: Response) {
    const { pdf, filename } = await this.journey.claimPacket(this.actor(req), id);
    sendFile(res, { buffer: pdf, mime: 'application/pdf', name: filename }, false);
  }

  @Get('service-ops')
  @ApiQuery({ name: 'days', required: false })
  serviceOps(@Req() req: any, @Query('days') days?: string) {
    return this.journey.serviceOps(this.actor(req), Math.min(Math.max(Number(days) || 90, 7), 365));
  }
}
