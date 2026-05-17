import { ApplianceEntity } from './appliance.entity.js';
import { ChatSessionEntity } from './chat-session.entity.js';
export declare class QrCodeEntity {
    id: string;
    appliance_id: string;
    url: string;
    scan_count: number;
    created_at: Date;
    appliance: ApplianceEntity;
    chat_sessions: ChatSessionEntity[];
}
