import { ApplianceService } from './appliance.service.js';
export declare class DashboardController {
    private applianceService;
    constructor(applianceService: ApplianceService);
    getDashboardStats(businessId: string): Promise<{
        total_appliances: number;
        active_appliances: number;
        total_documents: number;
        total_warranties: number;
        total_claims: number;
        pending_claims: number;
        total_bookings: number;
        total_qr_scans: number;
    }>;
    getDashboardAppliances(businessId: string, limit?: number, offset?: number, sort?: string): Promise<{
        data: (import("../../entities/appliance.entity.js").ApplianceEntity & Partial<{
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
    getRecentActivity(businessId: string, limit?: number): Promise<{
        business_id: string;
        activities: never[];
        total: number;
    }>;
    getDashboardSummary(businessId: string): Promise<{
        business_id: string;
        summary: {
            total_appliances: number;
            appliances_needing_attention: number;
            total_active_warranties: number;
            recent_bookings_count: number;
        };
        last_updated: Date;
    }>;
    getWarrantyStatus(businessId: string): Promise<{
        business_id: string;
        warranty_status: {
            active: number;
            expired: number;
            void: number;
        };
        total_warranties: number;
    }>;
}
