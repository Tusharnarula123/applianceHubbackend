import {
  Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards,
  HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CasesService } from './cases.service.js';
import { RecallsService, type RecallInput } from './recalls.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';

@ApiTags('Support Cases')
@Controller('api')
export class CasesController {
  constructor(
    private readonly cases: CasesService,
    private readonly recalls: RecallsService,
  ) {}

  // ── Support cases (dashboard) ─────────────────────────────────────────────

  @Get('support-cases/business/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List support cases prepared by the AI for a business' })
  @ApiParam({ name: 'businessId' })
  @ApiQuery({ name: 'outcome', required: false })
  @ApiQuery({ name: 'appliance_id', required: false })
  list(
    @Param('businessId') businessId: string,
    @Query('outcome') outcome?: string,
    @Query('appliance_id') applianceId?: string,
  ) {
    return this.cases.listCases(businessId, { outcome, appliance_id: applianceId });
  }

  @Get('support-cases/business/:businessId/metrics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Outcome metrics: verified resolution rate, escalation rate, case completeness' })
  @ApiQuery({ name: 'days', required: false, example: 30 })
  metrics(@Param('businessId') businessId: string, @Query('days') days?: string) {
    const d = Math.min(Math.max(Number(days) || 30, 1), 365);
    return this.cases.metrics(businessId, d);
  }

  @Patch('support-cases/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a case outcome or resolution note' })
  update(@Param('id') id: string, @Body() body: { outcome?: string; resolution_note?: string }) {
    return this.cases.updateCase(id, body);
  }

  // ── Knowledge gaps ────────────────────────────────────────────────────────

  @Get('knowledge-gaps/business/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Questions customers asked that the manuals could not answer' })
  @ApiQuery({ name: 'appliance_id', required: false })
  gaps(@Param('businessId') businessId: string, @Query('appliance_id') applianceId?: string) {
    return this.cases.listGaps(businessId, applianceId);
  }

  @Post('knowledge-gaps/:id/dismiss')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  dismissGap(@Param('id') id: string) {
    return this.cases.dismissGap(id);
  }

  // ── Maintenance schedule ──────────────────────────────────────────────────

  /** Public: the customer chatbot shows this too. */
  @Get('appliances/:applianceId/maintenance')
  @ApiOperation({ summary: 'Maintenance schedule: verified manual items plus custom tasks' })
  maintenance(@Param('applianceId') applianceId: string) {
    return this.cases.getMaintenance(applianceId);
  }

  @Post('appliances/:applianceId/maintenance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a custom maintenance task' })
  addTask(
    @Param('applianceId') applianceId: string,
    @Body() body: { title?: string; frequency?: string; details?: string },
  ) {
    if (!body.title?.trim() || !body.frequency?.trim()) {
      throw new BadRequestException('title and frequency are required');
    }
    return this.cases.addMaintenanceTask(applianceId, { title: body.title, frequency: body.frequency, details: body.details });
  }

  @Delete('maintenance-tasks/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  deleteTask(@Param('id') id: string) {
    return this.cases.deleteMaintenanceTask(id);
  }

  // ── Recall & safety notices (module K) ────────────────────────────────────

  @Get('recalls/business/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Recall and safety notices published by the brand' })
  listRecalls(@Param('businessId') businessId: string) {
    return this.recalls.list(businessId);
  }

  @Post('recalls')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a recall or safety notice' })
  createRecall(@Body() body: RecallInput) {
    if (!body.business_id || !body.title?.trim() || !body.description?.trim() || !body.remedy?.trim()) {
      throw new BadRequestException('business_id, title, description and remedy are required');
    }
    if (!body.appliance_id && !(body.affected_models ?? []).length) {
      throw new BadRequestException('Choose an appliance or list at least one affected model');
    }
    return this.recalls.create(body);
  }

  @Patch('recalls/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  updateRecall(@Param('id') id: string, @Body() body: Partial<RecallInput>) {
    return this.recalls.update(id, body);
  }

  @Delete('recalls/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  deleteRecall(@Param('id') id: string) {
    return this.recalls.remove(id);
  }

  /** Public: the customer chat page checks this on load. */
  @Get('appliances/:applianceId/recalls')
  @ApiOperation({ summary: 'Active recall notices for an appliance (optionally by serial)' })
  @ApiQuery({ name: 'serial', required: false })
  activeRecalls(@Param('applianceId') applianceId: string, @Query('serial') serial?: string) {
    return this.recalls.activeFor(applianceId, serial);
  }

  // ── Part compatibility (module E) ─────────────────────────────────────────

  @Get('parts/compatibility/:businessId')
  @ApiOperation({ summary: 'Catalog parts that list a model number as compatible' })
  @ApiQuery({ name: 'model', required: true })
  @ApiQuery({ name: 'q', required: false })
  compatibility(@Param('businessId') businessId: string, @Query('model') model: string, @Query('q') q?: string) {
    if (!model?.trim()) throw new BadRequestException('model is required');
    return this.recalls.compatibleParts(businessId, model, q);
  }
}
