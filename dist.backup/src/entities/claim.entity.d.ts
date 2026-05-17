import { ApplianceEntity } from './appliance.entity.js';
import { WarrantyRegistrationEntity } from './warranty-registration.entity.js';
import { BookingEntity } from './booking.entity.js';
import { NotificationEntity } from './notification.entity.js';
export declare class ClaimEntity {
    id: string;
    appliance_id: string;
    warranty_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    issue: string;
    status: string;
    priority: string;
    resolution_notes: string;
    filed_at: Date;
    resolved_at: Date;
    appliance: ApplianceEntity;
    warranty: WarrantyRegistrationEntity;
    bookings: BookingEntity[];
    notifications: NotificationEntity[];
}
