import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClaimEntity } from '../../entities/claim.entity.js';
import { WarrantyRegistrationEntity } from '../../entities/warranty-registration.entity.js';
import { ClaimController } from './claim.controller.js';
import { ClaimService } from './claim.service.js';
import { CacheService } from '../../common/cache.service.js';
import { ActivityModule } from '../activities/activity.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([ClaimEntity, WarrantyRegistrationEntity]), ActivityModule],
  controllers: [ClaimController],
  providers: [ClaimService, CacheService],
  exports: [ClaimService],
})
export class ClaimModule {}
