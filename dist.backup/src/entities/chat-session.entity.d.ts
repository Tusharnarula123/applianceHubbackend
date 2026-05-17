import { ApplianceEntity } from './appliance.entity.js';
import { QrCodeEntity } from './qr-code.entity.js';
import { MessageEntity } from './message.entity.js';
export declare class ChatSessionEntity {
    id: string;
    appliance_id: string;
    qr_code_id: string;
    customer_identifier: string;
    started_at: Date;
    ended_at: Date;
    appliance: ApplianceEntity;
    qr_code: QrCodeEntity;
    messages: MessageEntity[];
}
