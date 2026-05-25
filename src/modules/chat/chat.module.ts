import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ChatSessionEntity } from '../../entities/chat-session.entity.js';
import { MessageEntity } from '../../entities/message.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { WarrantyRegistrationEntity } from '../../entities/warranty-registration.entity.js';
import { ClaimEntity } from '../../entities/claim.entity.js';
import { BookingEntity } from '../../entities/booking.entity.js';
import { QrCodeEntity } from '../../entities/qr-code.entity.js';
import { DocumentEntity } from '../../entities/document.entity.js';
import { DocumentChunkEntity } from '../../entities/document-chunk.entity.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { AiChatController } from './ai-chat.controller.js';
import { AiChatService } from './ai-chat.service.js';
import { RagService } from './rag.service.js';
import { CacheService } from '../../common/cache.service.js';
import { ActivityModule } from '../activities/activity.module.js';

@Module({
  imports: [
    ConfigModule,
    ActivityModule,
    TypeOrmModule.forFeature([
      ChatSessionEntity,
      MessageEntity,
      ApplianceEntity,
      WarrantyRegistrationEntity,
      ClaimEntity,
      BookingEntity,
      QrCodeEntity,
      DocumentEntity,
      DocumentChunkEntity,
    ]),
  ],
  controllers: [ChatController, AiChatController],
  providers: [ChatService, AiChatService, RagService, CacheService],
  exports: [ChatService, AiChatService, RagService],
})
export class ChatModule {}
