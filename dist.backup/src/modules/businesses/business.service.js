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
import { BusinessEntity } from '../../entities/business.entity.js';
import { CacheService } from '../../common/cache.service.js';
import { v4 as uuidv4 } from 'uuid';
let BusinessService = class BusinessService {
    businessRepository;
    cacheService;
    constructor(businessRepository, cacheService) {
        this.businessRepository = businessRepository;
        this.cacheService = cacheService;
    }
    async getBusinessById(businessId) {
        const cacheKey = CacheService.keys.business(businessId);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        const business = await this.businessRepository.findOne({
            where: { id: businessId },
            relations: ['users', 'appliances', 'notifications', 'activities'],
        });
        if (business) {
            await this.cacheService.set(cacheKey, business, 3600);
        }
        return business;
    }
    async getBusinessUsers(businessId) {
        const cacheKey = CacheService.keys.businessUsers(businessId);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        const business = await this.businessRepository.findOne({
            where: { id: businessId },
            relations: ['users'],
            select: ['id', 'name', 'users'],
        });
        if (business) {
            await this.cacheService.set(cacheKey, business.users, 3600);
        }
        return business?.users || [];
    }
    async getAllBusinesses(limit = 50, offset = 0) {
        const [businesses, total] = await this.businessRepository.findAndCount({
            relations: ['users', 'appliances'],
            take: limit,
            skip: offset,
            order: { created_at: 'DESC' },
        });
        return { data: businesses, total, limit, offset };
    }
    async create(data) {
        const business = this.businessRepository.create({
            id: uuidv4(),
            ...data,
        });
        const result = await this.businessRepository.save(business);
        return result;
    }
    async update(businessId, data) {
        await this.businessRepository.update(businessId, data);
        await this.cacheService.invalidateBusinessCaches(businessId);
        return this.getBusinessById(businessId);
    }
    async delete(businessId) {
        const result = await this.businessRepository.delete(businessId);
        await this.cacheService.invalidateBusinessCaches(businessId);
        return result;
    }
    async getBusinessStats(businessId) {
        const business = await this.businessRepository.findOne({
            where: { id: businessId },
            relations: [
                'users',
                'appliances',
                'appliances.claims',
                'appliances.bookings',
                'appliances.qr_codes',
            ],
        });
        if (!business) {
            return null;
        }
        return {
            id: businessId,
            name: business.name,
            plan: business.plan,
            users_count: business.users?.length || 0,
            appliances_count: business.appliances?.length || 0,
            total_claims: business.appliances?.reduce((sum, app) => sum + (app.claims?.length || 0), 0) || 0,
            total_bookings: business.appliances?.reduce((sum, app) => sum + (app.bookings?.length || 0), 0) || 0,
            total_scans: business.appliances?.reduce((sum, app) => sum + (app.qr_codes?.reduce((qrSum, qr) => qrSum + qr.scan_count, 0) || 0), 0) || 0,
        };
    }
};
BusinessService = __decorate([
    Injectable(),
    __param(0, InjectRepository(BusinessEntity)),
    __metadata("design:paramtypes", [Repository,
        CacheService])
], BusinessService);
export { BusinessService };
//# sourceMappingURL=business.service.js.map