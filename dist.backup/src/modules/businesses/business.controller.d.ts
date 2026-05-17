import { BusinessService } from './business.service.js';
import { BusinessEntity } from '../../entities/business.entity.js';
export declare class BusinessController {
    private businessService;
    constructor(businessService: BusinessService);
    getAll(limit?: number, offset?: number): Promise<{
        data: BusinessEntity[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getById(id: string): Promise<{} | null>;
    getUsers(id: string): Promise<{}>;
    getStats(id: string): Promise<{
        id: string;
        name: string;
        plan: string;
        users_count: number;
        appliances_count: number;
        total_claims: any;
        total_bookings: any;
        total_scans: any;
    } | null>;
    create(data: Partial<BusinessEntity>): Promise<BusinessEntity>;
    update(id: string, data: Partial<BusinessEntity>): Promise<{} | null>;
    delete(id: string): Promise<import("typeorm").DeleteResult>;
}
