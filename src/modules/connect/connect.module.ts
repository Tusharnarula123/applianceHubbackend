import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { IntegrationConnectionEntity } from '../../entities/integration-connection.entity.js';
import {
  SyncRunEntity, CaseDeliveryEntity, ExternalRecordMappingEntity,
  WebhookEventEntity, AuditEventEntity, ProductIdentifierEntity,
} from '../../entities/connect-records.entity.js';
import { SupportCaseEntity } from '../../entities/support-case.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { ConnectService } from './connect.service.js';
import { ConnectController } from './connect.controller.js';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      IntegrationConnectionEntity,
      SyncRunEntity,
      CaseDeliveryEntity,
      ExternalRecordMappingEntity,
      WebhookEventEntity,
      AuditEventEntity,
      ProductIdentifierEntity,
      SupportCaseEntity,
      ApplianceEntity,
    ]),
  ],
  controllers: [ConnectController],
  providers: [ConnectService],
  exports: [ConnectService],
})
export class ConnectModule {}
