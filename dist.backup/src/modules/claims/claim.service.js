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
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClaimEntity } from '../../entities/claim.entity.js';
import { CacheService } from '../../common/cache.service.js';
import { v4 as uuidv4 } from 'uuid';
let ClaimService = class ClaimService {
    claimRepository;
    cacheService;
    constructor(claimRepository, cacheService) {
        this.claimRepository = claimRepository;
        this.cacheService = cacheService;
    }
    async getClaimById(claimId) {
        const cacheKey = CacheService.keys.claim(claimId);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        const claim = await this.claimRepository.findOne({
            where: { id: claimId },
            relations: ['appliance', 'warranty', 'bookings', 'notifications'],
        });
        if (claim) {
            await this.cacheService.set(cacheKey, claim, 3600);
        }
        return claim;
    }
    async getClaimsByAppliance(applianceId) {
        const claims = await this.claimRepository.find({
            where: { appliance_id: applianceId },
            relations: ['warranty', 'bookings'],
            order: { filed_at: 'DESC' },
        });
        return claims;
    }
    async getClaimsByStatus(applianceId, status) {
        return this.claimRepository.find({
            where: { appliance_id: applianceId, status },
            relations: ['warranty', 'bookings'],
            order: { priority: 'DESC', filed_at: 'DESC' },
        });
    }
    async create(applianceId, warrantyId, data) {
        const claim = this.claimRepository.create({
            id: uuidv4(),
            appliance_id: applianceId,
            warranty_id: warrantyId,
            ...data,
        });
        const result = await this.claimRepository.save(claim);
        return result;
    }
    async update(claimId, applianceId, data) {
        await this.claimRepository.update(claimId, data);
        await this.cacheService.invalidateClaimCaches(claimId, applianceId);
        return this.getClaimById(claimId);
    }
    async delete(claimId, applianceId) {
        const result = await this.claimRepository.delete(claimId);
        await this.cacheService.invalidateClaimCaches(claimId, applianceId);
        return result;
    }
};
ClaimService = __decorate([
    Injectable(),
    __param(0, InjectRepository(ClaimEntity)),
    __metadata("design:paramtypes", [Repository,
        CacheService])
], ClaimService);
export { ClaimService };
//# sourceMappingURL=claim.service.js.map