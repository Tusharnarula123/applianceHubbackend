import { ApplianceEntity } from './appliance.entity.js';
import { ClaimEntity } from './claim.entity.js';
export declare class WarrantyRegistrationEntity {
    id: string;
    appliance_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    serial_number: string;
    purchase_date: Date;
    receipt_url: string;
    expiry_date: Date;
    status: string;
    created_at: Date;
    appliance: ApplianceEntity;
    claims: ClaimEntity[];
}
