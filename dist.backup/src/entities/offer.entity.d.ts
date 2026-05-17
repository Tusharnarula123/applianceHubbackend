import { ApplianceEntity } from './appliance.entity.js';
export declare class OfferEntity {
    id: string;
    appliance_id: string;
    title: string;
    description: string;
    discount_amount: number;
    discount_percentage: number;
    valid_from: Date;
    valid_until: Date;
    is_active: boolean;
    usage_count: number;
    max_usage_count: number;
    metadata: Record<string, any>;
    created_at: Date;
    appliance: ApplianceEntity;
}
