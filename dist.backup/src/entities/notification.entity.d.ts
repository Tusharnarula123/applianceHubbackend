import { BusinessEntity } from './business.entity.js';
import { ClaimEntity } from './claim.entity.js';
import { BookingEntity } from './booking.entity.js';
export declare class NotificationEntity {
    id: string;
    business_id: string;
    claim_id: string;
    booking_id: string;
    channel: string;
    recipient: string;
    message: string;
    status: string;
    sent_at: Date;
    created_at: Date;
    business: BusinessEntity;
    claim: ClaimEntity;
    booking: BookingEntity;
}
