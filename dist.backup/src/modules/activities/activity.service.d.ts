import { Repository } from 'typeorm';
import { ActivityEntity } from '../../entities/activity.entity.js';
import { CacheService } from '../../common/cache.service.js';
export declare class ActivityService {
    private activityRepository;
    private cacheService;
    constructor(activityRepository: Repository<ActivityEntity>, cacheService: CacheService);
    getActivitiesByBusiness(businessId: string, limit?: number, offset?: number): Promise<{}>;
    getActivitiesByAppliance(applianceId: string, limit?: number): Promise<ActivityEntity[]>;
    getActivitiesByType(businessId: string, type: string, limit?: number): Promise<ActivityEntity[]>;
    log(businessId: string, type: string, text: string, applianceId?: string, metadata?: any): Promise<ActivityEntity>;
    getDashboardStats(businessId: string, days?: number): Promise<{
        total: number;
        by_type: {
            claim: number;
            scan: number;
            resolve: number;
            upload: number;
        };
        by_day: {};
    }>;
}
