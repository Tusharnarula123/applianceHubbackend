import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { ApplianceController } from './appliance.controller.js';
import { DashboardController } from './dashboard.controller.js';
import { ApplianceService } from './appliance.service.js';
import { CacheService } from '../../common/cache.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ApplianceEntity])],
  controllers: [ApplianceController, DashboardController],
  providers: [ApplianceService, CacheService],
  exports: [ApplianceService],
})
export class ApplianceModule {}
