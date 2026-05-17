import { Repository } from 'typeorm';
import { BusinessEntity } from '../../entities/business.entity.js';
import { CacheService } from '../../common/cache.service.js';
export declare class BusinessService {
    private businessRepository;
    private cacheService;
    constructor(businessRepository: Repository<BusinessEntity>, cacheService: CacheService);
    getBusinessById(businessId: string): Promise<{} | null>;
    getBusinessUsers(businessId: string): Promise<{}>;
    getAllBusinesses(limit?: number, offset?: number): Promise<{
        data: BusinessEntity[];
        total: number;
        limit: number;
        offset: number;
    }>;
    create(data: Partial<BusinessEntity>): Promise<BusinessEntity>;
    update(businessId: string, data: Partial<BusinessEntity>): Promise<{} | null>;
    delete(businessId: string): Promise<import("typeorm").DeleteResult>;
    getBusinessStats(businessId: string): Promise<{
        id: string;
        name: string;
        plan: string;
        users_count: number;
        appliances_count: number;
        total_claims: any;
        total_bookings: any;
        total_scans: any;
    } | null>;
}
