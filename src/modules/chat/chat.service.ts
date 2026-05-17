import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSessionEntity } from '../../entities/chat-session.entity.js';
import { MessageEntity } from '../../entities/message.entity.js';
import { CacheService } from '../../common/cache.service.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatSessionEntity)
    private chatSessionRepository: Repository<ChatSessionEntity>,
    @InjectRepository(MessageEntity)
    private messageRepository: Repository<MessageEntity>,
    private cacheService: CacheService,
  ) {}

  /**
   * Get chat session with all messages (batch loaded)
   */
  async getChatSessionWithMessages(sessionId: string) {
    const cacheKey = CacheService.keys.chatSession(sessionId);
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Single query with all messages
    const session = await this.chatSessionRepository.findOne({
      where: { id: sessionId },
      relations: ['messages', 'appliance', 'qr_code'],
      order: { messages: { created_at: 'ASC' } },
    });

    if (session) {
      await this.cacheService.set(cacheKey, session, 1800);
    }

    return session;
  }

  /**
   * Get messages for a chat session (pagination)
   */
  async getMessages(sessionId: string, limit: number = 50, offset: number = 0) {
    return this.messageRepository.find({
      where: { chat_session_id: sessionId },
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get all chat sessions for an appliance
   */
  async getChatSessionsByAppliance(applianceId: string) {
    return this.chatSessionRepository.find({
      where: { appliance_id: applianceId },
      relations: ['messages'],
      order: { started_at: 'DESC' },
    });
  }

  /**
   * Create new chat session
   */
  async createSession(applianceId: string, data: Partial<ChatSessionEntity>) {
    const session = this.chatSessionRepository.create({
      id: uuidv4(),
      appliance_id: applianceId,
      ...data,
    });

    return this.chatSessionRepository.save(session);
  }

  /**
   * Add message to chat session
   */
  async addMessage(sessionId: string, role: string, content: string) {
    const message = this.messageRepository.create({
      id: uuidv4(),
      chat_session_id: sessionId,
      role,
      content,
    });

    return this.messageRepository.save(message);
  }

  /**
   * End chat session
   */
  async endSession(sessionId: string) {
    await this.chatSessionRepository.update(sessionId, {
      ended_at: new Date(),
    });

    await this.cacheService.delete(CacheService.keys.chatSession(sessionId));

    return this.getChatSessionWithMessages(sessionId);
  }

  /**
   * Get sessions for appliance with filter
   */
  async getSessions(applianceId: string, limit: number = 50) {
    return this.chatSessionRepository.find({
      where: { appliance_id: applianceId },
      relations: ['appliance', 'messages'],
      order: { started_at: 'DESC' },
      take: limit,
    });
  }
}
