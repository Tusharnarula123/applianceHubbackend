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
var CacheService_1;
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
let CacheService = class CacheService {
    static { CacheService_1 = this; }
    cacheManager;
    constructor(cacheManager) {
        this.cacheManager = cacheManager;
    }
    async get(key) {
        const value = await this.cacheManager.get(key);
        return value ?? null;
    }
    async set(key, value, ttl = 3600) {
        await this.cacheManager.set(key, value, ttl * 1000);
    }
    async delete(key) {
        await this.cacheManager.del(key);
    }
    async deleteMany(keys) {
        await Promise.all(keys.map(key => this.cacheManager.del(key)));
    }
    async clear() {
        await this.cacheManager.clear();
    }
    static keys = {
        appliance: (applianceId) => `appliance:${applianceId}`,
        appliancesList: (businessId) => `appliances:list:${businessId}`,
        applianceDocuments: (applianceId) => `appliance:${applianceId}:documents`,
        applianceClaims: (applianceId) => `appliance:${applianceId}:claims`,
        applianceBookings: (applianceId) => `appliance:${applianceId}:bookings`,
        applianceQrCodes: (applianceId) => `appliance:${applianceId}:qrcodes`,
        business: (businessId) => `business:${businessId}`,
        businessUsers: (businessId) => `business:${businessId}:users`,
        claim: (claimId) => `claim:${claimId}`,
        booking: (bookingId) => `booking:${bookingId}`,
        chatSession: (sessionId) => `chat:${sessionId}`,
        chatMessages: (sessionId) => `chat:${sessionId}:messages`,
        notifications: (businessId) => `notifications:${businessId}`,
        activities: (businessId) => `activities:${businessId}`,
    };
    async invalidateApplianceCaches(applianceId, businessId) {
        const keys = [
            CacheService_1.keys.appliance(applianceId),
            CacheService_1.keys.applianceDocuments(applianceId),
            CacheService_1.keys.applianceClaims(applianceId),
            CacheService_1.keys.applianceBookings(applianceId),
            CacheService_1.keys.applianceQrCodes(applianceId),
        ];
        if (businessId) {
            keys.push(CacheService_1.keys.appliancesList(businessId));
        }
        await this.deleteMany(keys);
    }
    async invalidateBusinessCaches(businessId) {
        const keys = [
            CacheService_1.keys.business(businessId),
            CacheService_1.keys.businessUsers(businessId),
            CacheService_1.keys.appliancesList(businessId),
            CacheService_1.keys.notifications(businessId),
            CacheService_1.keys.activities(businessId),
        ];
        await this.deleteMany(keys);
    }
    async invalidateClaimCaches(claimId, applianceId) {
        const keys = [
            CacheService_1.keys.claim(claimId),
            CacheService_1.keys.applianceClaims(applianceId),
        ];
        await this.deleteMany(keys);
    }
};
CacheService = CacheService_1 = __decorate([
    Injectable(),
    __param(0, Inject(CACHE_MANAGER)),
    __metadata("design:paramtypes", [Object])
], CacheService);
export { CacheService };
//# sourceMappingURL=cache.service.js.map