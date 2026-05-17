import { Controller, Get, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ApplianceService } from './appliance.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';

@ApiTags('Dashboard')
@Controller('api/dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private applianceService: ApplianceService) {}

  /**
   * GET /api/dashboard/stats/:businessId
   * Get dashboard overview statistics
   */
  @Get('stats/:businessId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get dashboard overview statistics' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  async getDashboardStats(@Param('businessId') businessId: string) {
    const appliances = await this.applianceService.getAppliancesByBusiness(businessId, 1000, 0);

    // Calculate aggregated statistics
    const stats = {
      total_appliances: appliances.data.length,
      active_appliances: appliances.data.filter(a => a.status === 'active').length,
      total_documents: appliances.data.reduce((sum, a) => sum + (a.documents_count || 0), 0),
      total_warranties: appliances.data.reduce((sum, a) => sum + (a.active_warranties || 0), 0),
      total_claims: appliances.data.reduce((sum, a) => sum + (a.claims_count || 0), 0),
      pending_claims: appliances.data.reduce((sum, a) => sum + (a.pending_claims || 0), 0),
      total_bookings: appliances.data.reduce((sum, a) => sum + (a.bookings_count || 0), 0),
      total_qr_scans: appliances.data.reduce((sum, a) => sum + (a.total_scans || 0), 0),
    };

    return stats;
  }

  /**
   * GET /api/dashboard/appliances/:businessId
   * Get paginated appliances for dashboard
   */
  @Get('appliances/:businessId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get appliances with dashboard info' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort by field (created_at, name, etc.)' })
  async getDashboardAppliances(
    @Param('businessId') businessId: string,
    @Query('limit') limit: number = 20,
    @Query('offset') offset: number = 0,
    @Query('sort') sort: string = 'created_at',
  ) {
    return this.applianceService.getAppliancesByBusiness(businessId, limit, offset);
  }

  /**
   * GET /api/dashboard/recent-activity/:businessId
   * Get recent activity across all appliances
   */
  @Get('recent-activity/:businessId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get recent activity feed' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  async getRecentActivity(@Param('businessId') businessId: string, @Query('limit') limit: number = 50) {
    // This would typically fetch recent activities from Activity service
    // For now, returning a structure that can be populated
    return {
      business_id: businessId,
      activities: [],
      total: 0,
    };
  }

  /**
   * GET /api/dashboard/summary/:businessId
   * Get quick summary for dashboard header
   */
  @Get('summary/:businessId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get dashboard summary' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  async getDashboardSummary(@Param('businessId') businessId: string) {
    const appliances = await this.applianceService.getAppliancesByBusiness(businessId, 1000, 0);

    return {
      business_id: businessId,
      summary: {
        total_appliances: appliances.data.length,
        appliances_needing_attention: appliances.data.filter(
          a => (a.pending_claims || 0) > 0 || (a.status === 'inactive'),
        ).length,
        total_active_warranties: appliances.data.reduce(
          (sum, a) => sum + (a.active_warranties || 0),
          0,
        ),
        recent_bookings_count: appliances.data.reduce(
          (sum, a) => sum + (a.bookings_count || 0),
          0,
        ),
      },
      last_updated: new Date(),
    };
  }

  /**
   * GET /api/dashboard/warranty-status/:businessId
   * Get warranty status breakdown
   */
  @Get('warranty-status/:businessId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get warranty status breakdown' })
  @ApiParam({ name: 'businessId', description: 'Business ID' })
  async getWarrantyStatus(@Param('businessId') businessId: string) {
    const appliances = await this.applianceService.getAppliancesByBusiness(businessId, 1000, 0);

    // Group warranties by status
    const warranties = {
      active: 0,
      expired: 0,
      void: 0,
    };

    appliances.data.forEach((appliance) => {
      if (appliance.warranties && appliance.warranties.length > 0) {
        appliance.warranties.forEach((warranty: any) => {
          if (warranty.status === 'active') warranties.active++;
          else if (warranty.status === 'expired') warranties.expired++;
          else if (warranty.status === 'void') warranties.void++;
        });
      }
    });

    return {
      business_id: businessId,
      warranty_status: warranties,
      total_warranties: warranties.active + warranties.expired + warranties.void,
    };
  }
}
