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
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { CacheService } from '../../common/cache.service.js';
import { v4 as uuidv4 } from 'uuid';
let ApplianceService = class ApplianceService {
    applianceRepository;
    cacheService;
    constructor(applianceRepository, cacheService) {
        this.applianceRepository = applianceRepository;
        this.cacheService = cacheService;
    }
    async getApplianceById(applianceId) {
        const cacheKey = CacheService.keys.appliance(applianceId);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        const appliance = await this.applianceRepository.findOne({
            where: { id: applianceId },
            relations: [
                'business',
                'qr_codes',
                'documents',
                'warranties',
                'claims',
                'bookings',
                'chat_sessions',
                'offers',
            ],
        });
        if (appliance) {
            await this.cacheService.set(cacheKey, appliance, 3600);
        }
        return appliance;
    }
    async getAppliancesByBusiness(businessId, limit = 50, offset = 0) {
        const cacheKey = CacheService.keys.appliancesList(businessId);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        const [appliances, total] = await this.applianceRepository.findAndCount({
            where: { business_id: businessId },
            relations: ['documents', 'claims', 'qr_codes'],
            order: { created_at: 'DESC' },
            take: limit,
            skip: offset,
        });
        const result = appliances.map(appliance => ({
            ...appliance,
            documents_count: appliance.documents?.length || 0,
            claims_count: appliance.claims?.length || 0,
        }));
        const response = { data: result, total, limit, offset };
        await this.cacheService.set(cacheKey, response, 1800);
        return response;
    }
    async getApplianceWithDocuments(applianceId) {
        const cacheKey = CacheService.keys.applianceDocuments(applianceId);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        const appliance = await this.applianceRepository.findOne({
            where: { id: applianceId },
            relations: ['documents'],
            select: ['id', 'name', 'model', 'status'],
        });
        if (appliance) {
            await this.cacheService.set(cacheKey, appliance, 3600);
        }
        return appliance;
    }
    async getApplianceWithClaims(applianceId) {
        const cacheKey = CacheService.keys.applianceClaims(applianceId);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        const appliance = await this.applianceRepository.findOne({
            where: { id: applianceId },
            relations: ['claims', 'claims.warranty_registration'],
            select: ['id', 'name', 'model', 'status'],
        });
        if (appliance) {
            await this.cacheService.set(cacheKey, appliance, 3600);
        }
        return appliance;
    }
    async getApplianceWithBookings(applianceId) {
        const cacheKey = CacheService.keys.applianceBookings(applianceId);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        const appliance = await this.applianceRepository.findOne({
            where: { id: applianceId },
            relations: ['bookings'],
            select: ['id', 'name', 'model', 'status'],
        });
        if (appliance) {
            await this.cacheService.set(cacheKey, appliance, 3600);
        }
        return appliance;
    }
    async getApplianceWithQrCodes(applianceId) {
        const cacheKey = CacheService.keys.applianceQrCodes(applianceId);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        const appliance = await this.applianceRepository.findOne({
            where: { id: applianceId },
            relations: ['qr_codes'],
            select: ['id', 'name', 'model'],
        });
        if (appliance) {
            await this.cacheService.set(cacheKey, appliance, 3600);
        }
        return appliance;
    }
    async create(businessId, data) {
        const appliance = this.applianceRepository.create({
            id: uuidv4(),
            business_id: businessId,
            ...data,
        });
        const result = await this.applianceRepository.save(appliance);
        await this.cacheService.invalidateApplianceCaches(result.id, businessId);
        return result;
    }
    async update(applianceId, businessId, data) {
        await this.applianceRepository.update(applianceId, data);
        await this.cacheService.invalidateApplianceCaches(applianceId, businessId);
        return this.getApplianceById(applianceId);
    }
    async delete(applianceId, businessId) {
        const result = await this.applianceRepository.delete(applianceId);
        await this.cacheService.invalidateApplianceCaches(applianceId, businessId);
        return result;
    }
    async getApplianceStats(applianceId) {
        const appliance = await this.applianceRepository.findOne({
            where: { id: applianceId },
            relations: [
                'documents',
                'claims',
                'bookings',
                'qr_codes',
                'warranties',
                'chat_sessions',
            ],
        });
        if (!appliance) {
            return null;
        }
        return {
            id: applianceId,
            name: appliance.name,
            documents_count: appliance.documents?.length || 0,
            claims_count: appliance.claims?.length || 0,
            pending_claims: appliance.claims?.filter(c => c.status !== 'resolved')?.length || 0,
            bookings_count: appliance.bookings?.length || 0,
            qr_codes_count: appliance.qr_codes?.length || 0,
            total_scans: appliance.qr_codes?.reduce((sum, qr) => sum + qr.scan_count, 0) || 0,
            active_warranties: appliance.warranties?.filter(w => w.status === 'active')?.length || 0,
            chat_sessions_count: appliance.chat_sessions?.length || 0,
        };
    }
};
ApplianceService = __decorate([
    Injectable(),
    __param(0, InjectRepository(ApplianceEntity)),
    __metadata("design:paramtypes", [Repository,
        CacheService])
], ApplianceService);
export { ApplianceService };
//# sourceMappingURL=appliance.service.js.map