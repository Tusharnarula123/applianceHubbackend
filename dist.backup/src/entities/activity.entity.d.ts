import { BusinessEntity } from './business.entity.js';
import { ApplianceEntity } from './appliance.entity.js';
export declare class ActivityEntity {
    id: string;
    business_id: string;
    appliance_id: string;
    type: string;
    text: string;
    metadata: Record<string, any>;
    created_at: Date;
    business: BusinessEntity;
    appliance: ApplianceEntity;
}
