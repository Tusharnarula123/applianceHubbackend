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
import { Controller, Get, Post, Put, Delete, Param, Body, Query, HttpCode, HttpStatus, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ApplianceService } from './appliance.service.js';
let ApplianceController = class ApplianceController {
    applianceService;
    constructor(applianceService) {
        this.applianceService = applianceService;
    }
    async getByBusiness(businessId, limit = 50, offset = 0) {
        return this.applianceService.getAppliancesByBusiness(businessId, limit, offset);
    }
    async getById(id) {
        return this.applianceService.getApplianceById(id);
    }
    async getWithDocuments(id) {
        return this.applianceService.getApplianceWithDocuments(id);
    }
    async getWithClaims(id) {
        return this.applianceService.getApplianceWithClaims(id);
    }
    async getWithBookings(id) {
        return this.applianceService.getApplianceWithBookings(id);
    }
    async getWithQrCodes(id) {
        return this.applianceService.getApplianceWithQrCodes(id);
    }
    async getStats(id) {
        return this.applianceService.getApplianceStats(id);
    }
    async create(data) {
        return this.applianceService.create(data.business_id, data);
    }
    async update(id, data) {
        return this.applianceService.update(id, data.business_id, data);
    }
    async delete(id, businessId) {
        return this.applianceService.delete(id, businessId);
    }
};
__decorate([
    Get('business/:businessId'),
    ApiOperation({ summary: 'Get all appliances for a business' }),
    ApiParam({ name: 'businessId', description: 'Business ID (UUID)' }),
    ApiQuery({ name: 'limit', required: false, example: 50 }),
    ApiQuery({ name: 'offset', required: false, example: 0 }),
    ApiResponse({ status: 200, description: 'List of appliances with pagination' }),
    __param(0, Param('businessId')),
    __param(1, Query('limit')),
    __param(2, Query('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], ApplianceController.prototype, "getByBusiness", null);
__decorate([
    Get(':id'),
    ApiOperation({ summary: 'Get single appliance with all relations' }),
    ApiParam({ name: 'id', description: 'Appliance ID (UUID)' }),
    ApiResponse({ status: 200, description: 'Appliance with all relations (documents, claims, bookings, etc.)' }),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ApplianceController.prototype, "getById", null);
__decorate([
    Get(':id/documents'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ApplianceController.prototype, "getWithDocuments", null);
__decorate([
    Get(':id/claims'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ApplianceController.prototype, "getWithClaims", null);
__decorate([
    Get(':id/bookings'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ApplianceController.prototype, "getWithBookings", null);
__decorate([
    Get(':id/qrcodes'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ApplianceController.prototype, "getWithQrCodes", null);
__decorate([
    Get(':id/stats'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ApplianceController.prototype, "getStats", null);
__decorate([
    Post(),
    HttpCode(HttpStatus.CREATED),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ApplianceController.prototype, "create", null);
__decorate([
    Put(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ApplianceController.prototype, "update", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id')),
    __param(1, Query('businessId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ApplianceController.prototype, "delete", null);
ApplianceController = __decorate([
    ApiTags('Appliances'),
    Controller('api/appliances'),
    __metadata("design:paramtypes", [ApplianceService])
], ApplianceController);
export { ApplianceController };
//# sourceMappingURL=appliance.controller.js.map