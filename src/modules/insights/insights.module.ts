import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { ClaimEntity } from '../../entities/claim.entity.js';
import { RepairRequestEntity } from '../../entities/repair-request.entity.js';
import { SupportCaseEntity } from '../../entities/support-case.entity.js';
import { WarrantyRegistrationEntity } from '../../entities/warranty-registration.entity.js';
import { SparePartEntity } from '../../entities/spare-part.entity.js';
import { ChatModule } from '../chat/chat.module.js';
import { CasesModule } from '../cases/cases.module.js';
import { InsightsService } from './insights.service.js';
import { InsightsController } from './insights.controller.js';

@Module({
  imports: [
    ConfigModule,
    ChatModule,
    CasesModule,
    TypeOrmModule.forFeature([
      ApplianceEntity,
      ClaimEntity,
      RepairRequestEntity,
      SupportCaseEntity,
      WarrantyRegistrationEntity,
      SparePartEntity,
    ]),
  ],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}
