import { ActivityService } from './activity.service.js';
export declare class ActivityController {
    private activityService;
    constructor(activityService: ActivityService);
    getByBusiness(businessId: string, limit?: number, offset?: number): Promise<{}>;
    getByAppliance(applianceId: string, limit?: number): Promise<import("../../entities/activity.entity.js").ActivityEntity[]>;
    getByType(businessId: string, type: string, limit?: number): Promise<import("../../entities/activity.entity.js").ActivityEntity[]>;
    getStats(businessId: string, days?: number): Promise<{
        total: number;
        by_type: {
            claim: number;
            scan: number;
            resolve: number;
            upload: number;
        };
        by_day: {};
    }>;
    log(data: {
        business_id: string;
        type: string;
        text: string;
        appliance_id?: string;
        metadata?: any;
    }): Promise<import("../../entities/activity.entity.js").ActivityEntity>;
}
