import { Repository } from 'typeorm';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { CacheService } from '../../common/cache.service.js';
type DashboardAppliance = ApplianceEntity & Partial<{
    documents_count: number;
    claims_count: number;
    active_warranties: number;
    pending_claims: number;
    bookings_count: number;
    total_scans: number;
    warranties: any[];
}>;
export declare class ApplianceService {
    private applianceRepository;
    private cacheService;
    constructor(applianceRepository: Repository<ApplianceEntity>, cacheService: CacheService);
    getApplianceById(applianceId: string): Promise<{} | null>;
    getAppliancesByBusiness(businessId: string, limit?: number, offset?: number): Promise<{
        data: DashboardAppliance[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getApplianceWithDocuments(applianceId: string): Promise<{} | null>;
    getApplianceWithClaims(applianceId: string): Promise<{} | null>;
    getApplianceWithBookings(applianceId: string): Promise<{} | null>;
    getApplianceWithQrCodes(applianceId: string): Promise<{} | null>;
    create(businessId: string, data: Partial<ApplianceEntity>): Promise<ApplianceEntity>;
    update(applianceId: string, businessId: string, data: Partial<ApplianceEntity>): Promise<{} | null>;
    delete(applianceId: string, businessId: string): Promise<import("typeorm").DeleteResult>;
    getApplianceStats(applianceId: string): Promise<{
        id: string;
        name: string;
        documents_count: number;
        claims_count: number;
        pending_claims: number;
        bookings_count: number;
        qr_codes_count: number;
        total_scans: number;
        active_warranties: number;
        chat_sessions_count: number;
    } | null>;
}
export {};
