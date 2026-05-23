import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QrCodeEntity } from '../../entities/qr-code.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { QrCodeController } from './qr-code.controller.js';
import { QrCodeService } from './qr-code.service.js';
import { CacheService } from '../../common/cache.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([QrCodeEntity, ApplianceEntity])],
  controllers: [QrCodeController],
  providers: [QrCodeService, CacheService],
  exports: [QrCodeService],
})
export class QrCodeModule {}
