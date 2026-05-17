var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSessionEntity } from '../../entities/chat-session.entity.js';
import { MessageEntity } from '../../entities/message.entity.js';
import { CacheService } from '../../common/cache.service.js';
import { v4 as uuidv4 } from 'uuid';
let ChatService = class ChatService {
    chatSessionRepository;
    messageRepository;
    cacheService;
    constructor(chatSessionRepository, messageRepository, cacheService) {
        this.chatSessionRepository = chatSessionRepository;
        this.messageRepository = messageRepository;
        this.cacheService = cacheService;
    }
    async getChatSessionWithMessages(sessionId) {
        const cacheKey = CacheService.keys.chatSession(sessionId);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
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
    async getMessages(sessionId, limit = 50, offset = 0) {
        return this.messageRepository.find({
            where: { chat_session_id: sessionId },
            order: { created_at: 'DESC' },
            take: limit,
            skip: offset,
        });
    }
    async getChatSessionsByAppliance(applianceId) {
        return this.chatSessionRepository.find({
            where: { appliance_id: applianceId },
            relations: ['messages'],
            order: { started_at: 'DESC' },
        });
    }
    async createSession(applianceId, data) {
        const session = this.chatSessionRepository.create({
            id: uuidv4(),
            appliance_id: applianceId,
            ...data,
        });
        return this.chatSessionRepository.save(session);
    }
    async addMessage(sessionId, role, content) {
        const message = this.messageRepository.create({
            id: uuidv4(),
            chat_session_id: sessionId,
            role,
            content,
        });
        return this.messageRepository.save(message);
    }
    async endSession(sessionId) {
        await this.chatSessionRepository.update(sessionId, {
            ended_at: new Date(),
        });
        await this.cacheService.delete(CacheService.keys.chatSession(sessionId));
        return this.getChatSessionWithMessages(sessionId);
    }
    async getSessions(applianceId, limit = 50) {
        return this.chatSessionRepository.find({
            where: { appliance_id: applianceId },
            relations: ['appliance', 'messages'],
            order: { started_at: 'DESC' },
            take: limit,
        });
    }
};
ChatService = __decorate([
    Injectable(),
    __param(0, InjectRepository(ChatSessionEntity)),
    __param(1, InjectRepository(MessageEntity)),
    __metadata("design:paramtypes", [Repository,
        Repository,
        CacheService])
], ChatService);
export { ChatService };
//# sourceMappingURL=chat.service.js.map