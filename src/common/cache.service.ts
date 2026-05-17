import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null | undefined> {
    const value = await this.cacheManager.get<T>(key);
    return value ?? null;
  }

  /**
   * Set value in cache with TTL
   */
  async set<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
    await this.cacheManager.set(key, value, ttl * 1000); // Convert seconds to ms
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<void> {
    console.log(`[CACHE] Deleting key: ${key}`);
    await this.cacheManager.del(key);
    console.log(`[CACHE] Deleted key: ${key}`);
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[]): Promise<void> {
    console.log(`[CACHE] Deleting multiple keys:`, keys);
    await Promise.all(keys.map(key => this.cacheManager.del(key)));
    console.log(`[CACHE] Deleted multiple keys:`, keys);
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    await this.cacheManager.clear();
  }

  /**
   * Cache key generators
   */
  static keys = {
    appliance: (applianceId: string) => `appliance:${applianceId}`,
    appliancesList: (businessId: string) => `appliances:list:${businessId}`,
    applianceDocuments: (applianceId: string) => `appliance:${applianceId}:documents`,
    applianceClaims: (applianceId: string) => `appliance:${applianceId}:claims`,
    applianceBookings: (applianceId: string) => `appliance:${applianceId}:bookings`,
    applianceQrCodes: (applianceId: string) => `appliance:${applianceId}:qrcodes`,
    business: (businessId: string) => `business:${businessId}`,
    businessUsers: (businessId: string) => `business:${businessId}:users`,
    claim: (claimId: string) => `claim:${claimId}`,
    booking: (bookingId: string) => `booking:${bookingId}`,
    chatSession: (sessionId: string) => `chat:${sessionId}`,
    chatMessages: (sessionId: string) => `chat:${sessionId}:messages`,
    notifications: (businessId: string) => `notifications:${businessId}`,
    activities: (businessId: string) => `activities:${businessId}`,
  };

  /**
   * Invalidate appliance-related caches
   */
  async invalidateApplianceCaches(applianceId: string, businessId?: string): Promise<void> {
    const keys = [
      CacheService.keys.appliance(applianceId),
      CacheService.keys.applianceDocuments(applianceId),
      CacheService.keys.applianceClaims(applianceId),
      CacheService.keys.applianceBookings(applianceId),
      CacheService.keys.applianceQrCodes(applianceId),
    ];

    if (businessId) {
      keys.push(CacheService.keys.appliancesList(businessId));
    }

    await this.deleteMany(keys);
  }

  /**
   * Invalidate business-related caches
   */
  async invalidateBusinessCaches(businessId: string): Promise<void> {
    const keys = [
      CacheService.keys.business(businessId),
      CacheService.keys.businessUsers(businessId),
      CacheService.keys.appliancesList(businessId),
      CacheService.keys.notifications(businessId),
      CacheService.keys.activities(businessId),
    ];

    await this.deleteMany(keys);
  }

  /**
   * Invalidate claim-related caches
   */
  async invalidateClaimCaches(claimId: string, applianceId: string): Promise<void> {
    const keys = [
      CacheService.keys.claim(claimId),
      CacheService.keys.applianceClaims(applianceId),
    ];

    await this.deleteMany(keys);
  }
}
