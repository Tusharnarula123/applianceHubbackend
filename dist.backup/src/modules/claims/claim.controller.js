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
import { ClaimService } from './claim.service.js';
let ClaimController = class ClaimController {
    claimService;
    constructor(claimService) {
        this.claimService = claimService;
    }
    async getById(id) {
        return this.claimService.getClaimById(id);
    }
    async getByAppliance(applianceId) {
        return this.claimService.getClaimsByAppliance(applianceId);
    }
    async getByStatus(applianceId, status) {
        return this.claimService.getClaimsByStatus(applianceId, status);
    }
    async create(data) {
        return this.claimService.create(data.appliance_id, data.warranty_registration_id, data);
    }
    async update(id, data) {
        return this.claimService.update(id, data.appliance_id, data);
    }
    async delete(id, applianceId) {
        return this.claimService.delete(id, applianceId);
    }
};
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClaimController.prototype, "getById", null);
__decorate([
    Get('appliance/:applianceId'),
    __param(0, Param('applianceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClaimController.prototype, "getByAppliance", null);
__decorate([
    Get('appliance/:applianceId/status/:status'),
    __param(0, Param('applianceId')),
    __param(1, Param('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClaimController.prototype, "getByStatus", null);
__decorate([
    Post(),
    HttpCode(HttpStatus.CREATED),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ClaimController.prototype, "create", null);
__decorate([
    Put(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ClaimController.prototype, "update", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id')),
    __param(1, Query('applianceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClaimController.prototype, "delete", null);
ClaimController = __decorate([
    Controller('api/claims'),
    __metadata("design:paramtypes", [ClaimService])
], ClaimController);
export { ClaimController };
//# sourceMappingURL=claim.controller.js.map