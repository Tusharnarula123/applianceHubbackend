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
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { BusinessService } from './business.service.js';
let BusinessController = class BusinessController {
    businessService;
    constructor(businessService) {
        this.businessService = businessService;
    }
    async getAll(limit = 50, offset = 0) {
        return this.businessService.getAllBusinesses(limit, offset);
    }
    async getById(id) {
        return this.businessService.getBusinessById(id);
    }
    async getUsers(id) {
        return this.businessService.getBusinessUsers(id);
    }
    async getStats(id) {
        return this.businessService.getBusinessStats(id);
    }
    async create(data) {
        return this.businessService.create(data);
    }
    async update(id, data) {
        return this.businessService.update(id, data);
    }
    async delete(id) {
        return this.businessService.delete(id);
    }
};
__decorate([
    Get(),
    ApiOperation({ summary: 'Get all businesses' }),
    ApiQuery({ name: 'limit', required: false, example: 50 }),
    ApiQuery({ name: 'offset', required: false, example: 0 }),
    ApiResponse({ status: 200, description: 'List of all businesses' }),
    __param(0, Query('limit')),
    __param(1, Query('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "getAll", null);
__decorate([
    Get(':id'),
    ApiOperation({ summary: 'Get single business with all relations' }),
    ApiParam({ name: 'id', description: 'Business ID (UUID)' }),
    ApiResponse({ status: 200, description: 'Business with users, appliances, and activities' }),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "getById", null);
__decorate([
    Get(':id/users'),
    ApiOperation({ summary: 'Get all users in a business' }),
    ApiParam({ name: 'id', description: 'Business ID (UUID)' }),
    ApiResponse({ status: 200, description: 'List of business users' }),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "getUsers", null);
__decorate([
    Get(':id/stats'),
    ApiOperation({ summary: 'Get business statistics for dashboard' }),
    ApiParam({ name: 'id', description: 'Business ID (UUID)' }),
    ApiResponse({ status: 200, description: 'Business dashboard statistics' }),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "getStats", null);
__decorate([
    Post(),
    HttpCode(HttpStatus.CREATED),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "create", null);
__decorate([
    Put(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "update", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BusinessController.prototype, "delete", null);
BusinessController = __decorate([
    ApiTags('Businesses'),
    Controller('api/businesses'),
    __metadata("design:paramtypes", [BusinessService])
], BusinessController);
export { BusinessController };
//# sourceMappingURL=business.controller.js.map