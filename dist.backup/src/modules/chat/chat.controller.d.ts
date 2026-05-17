import { ChatService } from './chat.service.js';
export declare class ChatController {
    private chatService;
    constructor(chatService: ChatService);
    getSession(sessionId: string): Promise<{} | null>;
    getMessages(sessionId: string, limit?: number, offset?: number): Promise<import("../../entities/message.entity.js").MessageEntity[]>;
    getAppliances(applianceId: string): Promise<import("../../entities/chat-session.entity.js").ChatSessionEntity[]>;
    getActiveSessions(applianceId: string, limit?: number): Promise<import("../../entities/chat-session.entity.js").ChatSessionEntity[]>;
    createSession(data: {
        appliance_id: string;
    } & any): Promise<import("../../entities/chat-session.entity.js").ChatSessionEntity>;
    addMessage(sessionId: string, data: {
        role: string;
        content: string;
    }): Promise<import("../../entities/message.entity.js").MessageEntity>;
    endSession(sessionId: string): Promise<{} | null>;
}
