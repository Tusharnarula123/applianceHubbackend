import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatSessionEntity } from '../../entities/chat-session.entity.js';
import { MessageEntity } from '../../entities/message.entity.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { CacheService } from '../../common/cache.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ChatSessionEntity, MessageEntity])],
  controllers: [ChatController],
  providers: [ChatService, CacheService],
  exports: [ChatService],
})
export class ChatModule {}
