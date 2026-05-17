import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessEntity } from '../../entities/business.entity.js';
import { BusinessController } from './business.controller.js';
import { BusinessUsersController } from './business-users.controller.js';
import { BusinessApiWebhookController } from './business-api-webhook.controller.js';
import { BusinessService } from './business.service.js';
import { CacheService } from '../../common/cache.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessEntity])],
  controllers: [BusinessController, BusinessUsersController, BusinessApiWebhookController],
  providers: [BusinessService, CacheService],
  exports: [BusinessService],
})
export class BusinessModule {}
