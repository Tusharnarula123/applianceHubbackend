import { Controller, Get, Post, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InsightsService } from './insights.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';

@ApiTags('Insights')
@Controller('api/insights')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Get('faults/:businessId')
  @ApiOperation({ summary: 'Recurring faults by product (themes and error codes) with period-over-period change' })
  @ApiQuery({ name: 'days', required: false, example: 90 })
  faults(@Param('businessId') businessId: string, @Query('days') days?: string) {
    return this.insights.recurringFaults(businessId, Math.min(Math.max(Number(days) || 90, 7), 365));
  }

  @Get('product-record/:businessId')
  @ApiOperation({ summary: 'Product record: timeline for a serial number or customer email' })
  @ApiQuery({ name: 'serial', required: false })
  @ApiQuery({ name: 'email', required: false })
  productRecord(
    @Param('businessId') businessId: string,
    @Query('serial') serial?: string,
    @Query('email') email?: string,
  ) {
    return this.insights.productRecord(businessId, { serial, email });
  }

  @Get('technician-brief/:repairRequestId')
  @ApiOperation({ summary: 'Brief for the technician: chat history, manual excerpts, compatible parts, similar repairs' })
  technicianBrief(@Param('repairRequestId') id: string) {
    return this.insights.technicianBrief(id);
  }

  @Post('doc-test/:applianceId')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test the manuals against realistic customer questions' })
  docTest(@Param('applianceId') applianceId: string) {
    return this.insights.simulateDocs(applianceId);
  }
}
