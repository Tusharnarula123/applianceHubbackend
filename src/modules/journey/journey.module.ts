import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SupportCaseEntity } from '../../entities/support-case.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { ProductResolutionEntity } from '../../entities/case-event.entity.js';
import {
  ProductIdentifierEntity, ExternalRecordMappingEntity, CaseDeliveryEntity,
} from '../../entities/connect-records.entity.js';
import { RepairRequestEntity } from '../../entities/repair-request.entity.js';
import { PartsOrderEntity } from '../../entities/parts-order.entity.js';
import { CasesModule } from '../cases/cases.module.js';
import { ChatModule } from '../chat/chat.module.js';
import { StorageService } from '../../common/storage.service.js';
import { ResolveService } from './resolve.service.js';
import { JourneyService } from './journey.service.js';
import { JourneyPublicController, JourneyDashboardController } from './journey.controller.js';

@Module({
  imports: [
    ConfigModule,
    CasesModule,
    ChatModule,
    TypeOrmModule.forFeature([
      SupportCaseEntity,
      ApplianceEntity,
      ProductResolutionEntity,
      ProductIdentifierEntity,
      ExternalRecordMappingEntity,
      CaseDeliveryEntity,
      RepairRequestEntity,
      PartsOrderEntity,
    ]),
  ],
  controllers: [JourneyPublicController, JourneyDashboardController],
  providers: [ResolveService, JourneyService, StorageService],
})
export class JourneyModule {}
