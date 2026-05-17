import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityEntity } from '../../entities/activity.entity.js';
import { ActivityController } from './activity.controller.js';
import { ActivityService } from './activity.service.js';
import { CacheService } from '../../common/cache.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ActivityEntity])],
  controllers: [ActivityController],
  providers: [ActivityService, CacheService],
  exports: [ActivityService],
})
export class ActivityModule {}
