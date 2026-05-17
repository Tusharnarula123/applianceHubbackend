import type { Cache } from 'cache-manager';
export declare class CacheService {
    private cacheManager;
    constructor(cacheManager: Cache);
    get<T>(key: string): Promise<T | null | undefined>;
    set<T>(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    deleteMany(keys: string[]): Promise<void>;
    clear(): Promise<void>;
    static keys: {
        appliance: (applianceId: string) => string;
        appliancesList: (businessId: string) => string;
        applianceDocuments: (applianceId: string) => string;
        applianceClaims: (applianceId: string) => string;
        applianceBookings: (applianceId: string) => string;
        applianceQrCodes: (applianceId: string) => string;
        business: (businessId: string) => string;
        businessUsers: (businessId: string) => string;
        claim: (claimId: string) => string;
        booking: (bookingId: string) => string;
        chatSession: (sessionId: string) => string;
        chatMessages: (sessionId: string) => string;
        notifications: (businessId: string) => string;
        activities: (businessId: string) => string;
    };
    invalidateApplianceCaches(applianceId: string, businessId?: string): Promise<void>;
    invalidateBusinessCaches(businessId: string): Promise<void>;
    invalidateClaimCaches(claimId: string, applianceId: string): Promise<void>;
}
