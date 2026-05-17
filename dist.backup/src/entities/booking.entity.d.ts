import { ApplianceEntity } from './appliance.entity.js';
import { ClaimEntity } from './claim.entity.js';
import { NotificationEntity } from './notification.entity.js';
export declare class BookingEntity {
    id: string;
    appliance_id: string;
    claim_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    service_type: string;
    preferred_date: Date;
    preferred_time: string;
    status: string;
    notes: string;
    created_at: Date;
    appliance: ApplianceEntity;
    claim: ClaimEntity;
    notifications: NotificationEntity[];
}
