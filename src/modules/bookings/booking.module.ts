import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BookingEntity } from '../../entities/booking.entity.js';
import { BookingController } from './booking.controller.js';
import { BookingService } from './booking.service.js';
import { CacheService } from '../../common/cache.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([BookingEntity])],
  controllers: [BookingController],
  providers: [BookingService, CacheService],
  exports: [BookingService],
})
export class BookingModule {}
