import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import {
  CampaignEntity, CampaignEventEntity, SubscriberEntity, NotificationJobEntity,
} from '../../entities/engagement.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { SupportCaseEntity } from '../../entities/support-case.entity.js';
import { WarrantyRegistrationEntity } from '../../entities/warranty-registration.entity.js';
import { CasesModule } from '../cases/cases.module.js';
import { ChannelsService } from './channels.service.js';
import { EngagementService } from './engagement.service.js';
import { EngagementDashboardController, EngagementPublicController } from './engagement.controller.js';

@Module({
  imports: [
    ConfigModule,
    CasesModule,
    TypeOrmModule.forFeature([
      CampaignEntity,
      CampaignEventEntity,
      SubscriberEntity,
      NotificationJobEntity,
      ApplianceEntity,
      SupportCaseEntity,
      WarrantyRegistrationEntity,
    ]),
  ],
  controllers: [EngagementDashboardController, EngagementPublicController],
  providers: [ChannelsService, EngagementService],
})
export class EngagementModule {}
