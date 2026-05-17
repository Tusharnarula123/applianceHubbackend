import { ApplianceService } from './appliance.service.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
export declare class ApplianceController {
    private applianceService;
    constructor(applianceService: ApplianceService);
    getByBusiness(businessId: string, limit?: number, offset?: number): Promise<{
        data: (ApplianceEntity & Partial<{
            documents_count: number;
            claims_count: number;
            active_warranties: number;
            pending_claims: number;
            bookings_count: number;
            total_scans: number;
            warranties: any[];
        }>)[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getById(id: string): Promise<{} | null>;
    getWithDocuments(id: string): Promise<{} | null>;
    getWithClaims(id: string): Promise<{} | null>;
    getWithBookings(id: string): Promise<{} | null>;
    getWithQrCodes(id: string): Promise<{} | null>;
    getStats(id: string): Promise<{
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
    create(data: {
        business_id: string;
        name: string;
        model?: string;
        brand?: string;
        status?: string;
    }): Promise<ApplianceEntity>;
    update(id: string, data: {
        business_id: string;
    } & Partial<ApplianceEntity>): Promise<{} | null>;
    delete(id: string, businessId: string): Promise<import("typeorm").DeleteResult>;
}
