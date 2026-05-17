import { ChatSessionEntity } from './chat-session.entity.js';
export declare class MessageEntity {
    id: string;
    chat_session_id: string;
    role: string;
    content: string;
    message_type: string;
    metadata: Record<string, any>;
    created_at: Date;
    chat_session: ChatSessionEntity;
}
