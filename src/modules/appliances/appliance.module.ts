import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { ApplianceController } from './appliance.controller.js';
import { DashboardController } from './dashboard.controller.js';
import { ApplianceService } from './appliance.service.js';
import { CacheService } from '../../common/cache.service.js';
import { QrCodeModule } from '../qr/qr-code.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([ApplianceEntity]), QrCodeModule],
  controllers: [ApplianceController, DashboardController],
  providers: [ApplianceService, CacheService],
  exports: [ApplianceService],
})
export class ApplianceModule {}
