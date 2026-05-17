var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ApplianceService } from './appliance.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';
let DashboardController = class DashboardController {
    applianceService;
    constructor(applianceService) {
        this.applianceService = applianceService;
    }
    async getDashboardStats(businessId) {
        const appliances = await this.applianceService.getAppliancesByBusiness(businessId, 1000, 0);
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
    async getDashboardAppliances(businessId, limit = 20, offset = 0, sort = 'created_at') {
        return this.applianceService.getAppliancesByBusiness(businessId, limit, offset);
    }
    async getRecentActivity(businessId, limit = 50) {
        return {
            business_id: businessId,
            activities: [],
            total: 0,
        };
    }
    async getDashboardSummary(businessId) {
        const appliances = await this.applianceService.getAppliancesByBusiness(businessId, 1000, 0);
        return {
            business_id: businessId,
            summary: {
                total_appliances: appliances.data.length,
                appliances_needing_attention: appliances.data.filter(a => (a.pending_claims || 0) > 0 || (a.status === 'inactive')).length,
                total_active_warranties: appliances.data.reduce((sum, a) => sum + (a.active_warranties || 0), 0),
                recent_bookings_count: appliances.data.reduce((sum, a) => sum + (a.bookings_count || 0), 0),
            },
            last_updated: new Date(),
        };
    }
    async getWarrantyStatus(businessId) {
        const appliances = await this.applianceService.getAppliancesByBusiness(businessId, 1000, 0);
        const warranties = {
            active: 0,
            expired: 0,
            void: 0,
        };
        appliances.data.forEach((appliance) => {
            if (appliance.warranties && appliance.warranties.length > 0) {
                appliance.warranties.forEach((warranty) => {
                    if (warranty.status === 'active')
                        warranties.active++;
                    else if (warranty.status === 'expired')
                        warranties.expired++;
                    else if (warranty.status === 'void')
                        warranties.void++;
                });
            }
        });
        return {
            business_id: businessId,
            warranty_status: warranties,
            total_warranties: warranties.active + warranties.expired + warranties.void,
        };
    }
};
__decorate([
    Get('stats/:businessId'),
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: 'Get dashboard overview statistics' }),
    ApiParam({ name: 'businessId', description: 'Business ID' }),
    __param(0, Param('businessId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getDashboardStats", null);
__decorate([
    Get('appliances/:businessId'),
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: 'Get appliances with dashboard info' }),
    ApiParam({ name: 'businessId', description: 'Business ID' }),
    ApiQuery({ name: 'limit', required: false, example: 20 }),
    ApiQuery({ name: 'offset', required: false, example: 0 }),
    ApiQuery({ name: 'sort', required: false, description: 'Sort by field (created_at, name, etc.)' }),
    __param(0, Param('businessId')),
    __param(1, Query('limit')),
    __param(2, Query('offset')),
    __param(3, Query('sort')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getDashboardAppliances", null);
__decorate([
    Get('recent-activity/:businessId'),
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: 'Get recent activity feed' }),
    ApiParam({ name: 'businessId', description: 'Business ID' }),
    ApiQuery({ name: 'limit', required: false, example: 50 }),
    __param(0, Param('businessId')),
    __param(1, Query('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getRecentActivity", null);
__decorate([
    Get('summary/:businessId'),
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: 'Get dashboard summary' }),
    ApiParam({ name: 'businessId', description: 'Business ID' }),
    __param(0, Param('businessId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getDashboardSummary", null);
__decorate([
    Get('warranty-status/:businessId'),
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: 'Get warranty status breakdown' }),
    ApiParam({ name: 'businessId', description: 'Business ID' }),
    __param(0, Param('businessId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DashboardController.prototype, "getWarrantyStatus", null);
DashboardController = __decorate([
    ApiTags('Dashboard'),
    Controller('api/dashboard'),
    UseGuards(JwtAuthGuard),
    ApiBearerAuth(),
    __metadata("design:paramtypes", [ApplianceService])
], DashboardController);
export { DashboardController };
//# sourceMappingURL=dashboard.controller.js.map