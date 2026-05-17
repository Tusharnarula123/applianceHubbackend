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
import { ActivityEntity } from '../../entities/activity.entity.js';
import { CacheService } from '../../common/cache.service.js';
import { v4 as uuidv4 } from 'uuid';
let ActivityService = class ActivityService {
    activityRepository;
    cacheService;
    constructor(activityRepository, cacheService) {
        this.activityRepository = activityRepository;
        this.cacheService = cacheService;
    }
    async getActivitiesByBusiness(businessId, limit = 50, offset = 0) {
        const cacheKey = CacheService.keys.activities(businessId);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        const [activities, total] = await this.activityRepository.findAndCount({
            where: { business_id: businessId },
            relations: ['appliance'],
            order: { created_at: 'DESC' },
            take: limit,
            skip: offset,
        });
        const response = { data: activities, total, limit, offset };
        await this.cacheService.set(cacheKey, response, 1800);
        return response;
    }
    async getActivitiesByAppliance(applianceId, limit = 50) {
        return this.activityRepository.find({
            where: { appliance_id: applianceId },
            relations: ['business'],
            order: { created_at: 'DESC' },
            take: limit,
        });
    }
    async getActivitiesByType(businessId, type, limit = 50) {
        return this.activityRepository.find({
            where: { business_id: businessId, type },
            relations: ['appliance'],
            order: { created_at: 'DESC' },
            take: limit,
        });
    }
    async log(businessId, type, text, applianceId, metadata) {
        const activity = this.activityRepository.create({
            id: uuidv4(),
            business_id: businessId,
            appliance_id: applianceId,
            type,
            text,
            metadata,
        });
        const result = await this.activityRepository.save(activity);
        await this.cacheService.delete(CacheService.keys.activities(businessId));
        return result;
    }
    async getDashboardStats(businessId, days = 30) {
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);
        const activities = await this.activityRepository.find({
            where: {
                business_id: businessId,
                created_at: {
                    gte: dateFrom,
                },
            },
            select: ['id', 'type', 'created_at'],
        });
        const stats = {
            total: activities.length,
            by_type: {
                claim: activities.filter(a => a.type === 'claim').length,
                scan: activities.filter(a => a.type === 'scan').length,
                resolve: activities.filter(a => a.type === 'resolve').length,
                upload: activities.filter(a => a.type === 'upload').length,
            },
            by_day: {},
        };
        activities.forEach(activity => {
            const day = activity.created_at.toISOString().split('T')[0];
            stats.by_day[day] = (stats.by_day[day] || 0) + 1;
        });
        return stats;
    }
};
ActivityService = __decorate([
    Injectable(),
    __param(0, InjectRepository(ActivityEntity)),
    __metadata("design:paramtypes", [Repository,
        CacheService])
], ActivityService);
export { ActivityService };
//# sourceMappingURL=activity.service.js.map