import { Repository } from 'typeorm';
import { ChatSessionEntity } from '../../entities/chat-session.entity.js';
import { MessageEntity } from '../../entities/message.entity.js';
import { CacheService } from '../../common/cache.service.js';
export declare class ChatService {
    private chatSessionRepository;
    private messageRepository;
    private cacheService;
    constructor(chatSessionRepository: Repository<ChatSessionEntity>, messageRepository: Repository<MessageEntity>, cacheService: CacheService);
    getChatSessionWithMessages(sessionId: string): Promise<{} | null>;
    getMessages(sessionId: string, limit?: number, offset?: number): Promise<MessageEntity[]>;
    getChatSessionsByAppliance(applianceId: string): Promise<ChatSessionEntity[]>;
    createSession(applianceId: string, data: Partial<ChatSessionEntity>): Promise<ChatSessionEntity>;
    addMessage(sessionId: string, role: string, content: string): Promise<MessageEntity>;
    endSession(sessionId: string): Promise<{} | null>;
    getSessions(applianceId: string, limit?: number): Promise<ChatSessionEntity[]>;
}
