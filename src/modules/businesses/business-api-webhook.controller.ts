import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { BusinessService } from './business.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';

@ApiTags('Business - API & Webhooks')
@Controller('api/businesses/:businessId')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BusinessApiWebhookController {
  constructor(private businessService: BusinessService) {}

  /**
   * GET /api/businesses/:businessId/api-key
   * Get API key for business
   */
  @Get('api-key')
  @ApiOperation({ summary: 'Get API key' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  async getApiKey(@Param('businessId') businessId: string) {
    return this.businessService.getApiKey(businessId);
  }

  /**
   * POST /api/businesses/:businessId/api-key/regenerate
   * Regenerate API key
   */
  @Post('api-key/regenerate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate API key' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  async regenerateApiKey(@Param('businessId') businessId: string) {
    return this.businessService.regenerateApiKey(businessId);
  }

  /**
   * GET /api/businesses/:businessId/webhook
   * Get webhook configuration
   */
  @Get('webhook')
  @ApiOperation({ summary: 'Get webhook configuration' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  async getWebhook(@Param('businessId') businessId: string) {
    return this.businessService.getWebhookConfig(businessId);
  }

  /**
   * PUT /api/businesses/:businessId/webhook
   * Update webhook configuration
   */
  @Put('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update webhook configuration' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  async updateWebhook(
    @Param('businessId') businessId: string,
    @Body() data: { url: string; active: boolean; events?: string[] },
  ) {
    return this.businessService.updateWebhookConfig(businessId, data);
  }

  /**
   * POST /api/businesses/:businessId/webhook/test
   * Send test webhook event
   */
  @Post('webhook/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send test webhook event' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  async testWebhook(
    @Param('businessId') businessId: string,
    @Body() data: { event_type: string },
  ) {
    return this.businessService.testWebhook(businessId, data.event_type);
  }

  /**
   * GET /api/businesses/:businessId/plan
   * Get current plan
   */
  @Get('plan')
  @ApiOperation({ summary: 'Get current plan' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  async getPlan(@Param('businessId') businessId: string) {
    return this.businessService.getPlan(businessId);
  }
}
