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
import { DocumentKnowledgeEntity } from '../../entities/document-knowledge.entity.js';
import { RepairAgentEntity } from '../../entities/repair-agent.entity.js';
import { RepairRequestEntity } from '../../entities/repair-request.entity.js';
import { RepairReviewEntity } from '../../entities/repair-review.entity.js';
import { SparePartEntity } from '../../entities/spare-part.entity.js';
import { PartsOrderEntity } from '../../entities/parts-order.entity.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { AiChatController } from './ai-chat.controller.js';
import { AiChatService } from './ai-chat.service.js';
import { RagService } from './rag.service.js';
import { KnowledgeService } from './knowledge.service.js';
import { KnowledgeController } from './knowledge.controller.js';
import { CacheService } from '../../common/cache.service.js';
import { StorageService } from '../../common/storage.service.js';
import { DocumentFilesService } from '../../common/document-files.service.js';
import { DocumentBlobEntity } from '../../entities/document-blob.entity.js';
import { ActivityModule } from '../activities/activity.module.js';
import { CasesModule } from '../cases/cases.module.js';
import { RepairService } from '../repair/repair.service.js';
import { SparePartsService } from '../repair/spare-parts.service.js';
import { RepairNotificationService } from '../repair/notification.service.js';

@Module({
  imports: [
    ConfigModule,
    ActivityModule,
    CasesModule,
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
      DocumentKnowledgeEntity,
      DocumentBlobEntity,
      RepairAgentEntity,
      RepairRequestEntity,
      RepairReviewEntity,
      SparePartEntity,
      PartsOrderEntity,
    ]),
  ],
  controllers: [ChatController, AiChatController, KnowledgeController],
  providers: [
    ChatService,
    AiChatService,
    RagService,
    KnowledgeService,
    CacheService,
    StorageService,
    DocumentFilesService,
    RepairService,
    SparePartsService,
    RepairNotificationService,
  ],
  exports: [ChatService, AiChatService, RagService, KnowledgeService, DocumentFilesService],
})
export class ChatModule {}
