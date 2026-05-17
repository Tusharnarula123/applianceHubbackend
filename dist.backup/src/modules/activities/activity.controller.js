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
import { Controller, Get, Post, Param, Body, Query, HttpCode, HttpStatus, } from '@nestjs/common';
import { ActivityService } from './activity.service.js';
let ActivityController = class ActivityController {
    activityService;
    constructor(activityService) {
        this.activityService = activityService;
    }
    async getByBusiness(businessId, limit = 50, offset = 0) {
        return this.activityService.getActivitiesByBusiness(businessId, limit, offset);
    }
    async getByAppliance(applianceId, limit = 50) {
        return this.activityService.getActivitiesByAppliance(applianceId, limit);
    }
    async getByType(businessId, type, limit = 50) {
        return this.activityService.getActivitiesByType(businessId, type, limit);
    }
    async getStats(businessId, days = 30) {
        return this.activityService.getDashboardStats(businessId, days);
    }
    async log(data) {
        return this.activityService.log(data.business_id, data.type, data.text, data.appliance_id, data.metadata);
    }
};
__decorate([
    Get('business/:businessId'),
    __param(0, Param('businessId')),
    __param(1, Query('limit')),
    __param(2, Query('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "getByBusiness", null);
__decorate([
    Get('appliance/:applianceId'),
    __param(0, Param('applianceId')),
    __param(1, Query('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "getByAppliance", null);
__decorate([
    Get('business/:businessId/type/:type'),
    __param(0, Param('businessId')),
    __param(1, Param('type')),
    __param(2, Query('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "getByType", null);
__decorate([
    Get('business/:businessId/stats'),
    __param(0, Param('businessId')),
    __param(1, Query('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "getStats", null);
__decorate([
    Post(),
    HttpCode(HttpStatus.CREATED),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ActivityController.prototype, "log", null);
ActivityController = __decorate([
    Controller('api/activities'),
    __metadata("design:paramtypes", [ActivityService])
], ActivityController);
export { ActivityController };
//# sourceMappingURL=activity.controller.js.map