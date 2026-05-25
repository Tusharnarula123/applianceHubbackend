import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ActivityService, type ActivityType } from './activity.service.js';

@Controller('api/activities')
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Get('business/:businessId')
  async getByBusiness(
    @Param('businessId') businessId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.activityService.getActivitiesByBusiness(businessId, limit, offset);
  }

  @Get('appliance/:applianceId/stats')
  async getApplianceStats(
    @Param('applianceId') applianceId: string,
    @Query('days') days: number = 30,
  ) {
    return this.activityService.getApplianceDashboardStats(applianceId, days);
  }

  @Get('appliance/:applianceId')
  async getByAppliance(
    @Param('applianceId') applianceId: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.activityService.getActivitiesByAppliance(applianceId, limit);
  }

  @Get('business/:businessId/type/:type')
  async getByType(
    @Param('businessId') businessId: string,
    @Param('type') type: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.activityService.getActivitiesByType(businessId, type, limit);
  }

  @Get('business/:businessId/stats')
  async getStats(@Param('businessId') businessId: string, @Query('days') days: number = 30) {
    return this.activityService.getDashboardStats(businessId, days);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async log(
    @Body() data: {
      business_id: string;
      type: string;
      text: string;
      appliance_id?: string;
      metadata?: any;
    },
  ) {
    return this.activityService.log(
      data.business_id,
      data.type as ActivityType,
      data.text,
      data.appliance_id,
      data.metadata,
    );
  }
}
