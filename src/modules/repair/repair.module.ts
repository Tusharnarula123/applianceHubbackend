import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { RepairAgentEntity } from '../../entities/repair-agent.entity.js';
import { RepairRequestEntity } from '../../entities/repair-request.entity.js';
import { RepairReviewEntity } from '../../entities/repair-review.entity.js';
import { SparePartEntity } from '../../entities/spare-part.entity.js';
import { PartsOrderEntity } from '../../entities/parts-order.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';

import { RepairService } from './repair.service.js';
import { SparePartsService } from './spare-parts.service.js';
import { RepairNotificationService } from './notification.service.js';

import {
  RepairAgentController,
  RepairRequestController,
  RepairReviewController,
  SparePartsController,
  PartsOrderController,
} from './repair.controller.js';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      RepairAgentEntity,
      RepairRequestEntity,
      RepairReviewEntity,
      SparePartEntity,
      PartsOrderEntity,
      ApplianceEntity,
    ]),
  ],
  controllers: [
    RepairAgentController,
    RepairRequestController,
    RepairReviewController,
    SparePartsController,
    PartsOrderController,
  ],
  providers: [RepairService, SparePartsService, RepairNotificationService],
  exports: [RepairService, SparePartsService],
})
export class RepairModule {}
