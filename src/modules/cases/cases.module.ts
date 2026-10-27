import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportCaseEntity } from '../../entities/support-case.entity.js';
import { KnowledgeGapEntity } from '../../entities/knowledge-gap.entity.js';
import { MaintenanceTaskEntity } from '../../entities/maintenance-task.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { DocumentKnowledgeEntity } from '../../entities/document-knowledge.entity.js';
import { RecallNoticeEntity } from '../../entities/recall-notice.entity.js';
import { SparePartEntity } from '../../entities/spare-part.entity.js';
import { RecallsService } from './recalls.service.js';
import { CasesService } from './cases.service.js';
import { CasesController } from './cases.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupportCaseEntity,
      KnowledgeGapEntity,
      MaintenanceTaskEntity,
      ApplianceEntity,
      DocumentKnowledgeEntity,
      RecallNoticeEntity,
      SparePartEntity,
    ]),
  ],
  controllers: [CasesController],
  providers: [CasesService, RecallsService],
  exports: [CasesService, RecallsService],
})
export class CasesModule {}
