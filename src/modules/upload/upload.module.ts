import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from '../../entities/document.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { UploadService } from './upload.service.js';
import { UploadController } from './upload.controller.js';
import { ChatModule } from '../chat/chat.module.js';
import { ActivityModule } from '../activities/activity.module.js';
import { CacheService } from '../../common/cache.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity, ApplianceEntity]),
    ChatModule,
    ActivityModule,
  ],
  controllers: [UploadController],
  providers: [UploadService, CacheService],
  exports: [UploadService],
})
export class UploadModule {}
