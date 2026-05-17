import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../entities/booking.entity.js';
import { CacheService } from '../../common/cache.service.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(BookingEntity)
    private bookingRepository: Repository<BookingEntity>,
    private cacheService: CacheService,
  ) {}

  async getBookingById(bookingId: string) {
    const cacheKey = CacheService.keys.booking(bookingId);
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Single query with all relations
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['appliance', 'claim', 'notifications'],
    });

    if (booking) {
      await this.cacheService.set(cacheKey, booking, 3600);
    }

    return booking;
  }

  async getBookingsByAppliance(applianceId: string) {
    // Batch query all bookings with relations
    return this.bookingRepository.find({
      where: { appliance_id: applianceId },
      relations: ['claim'],
      order: { preferred_date: 'DESC' },
    });
  }

  async getBookingsByStatus(status: string) {
    return this.bookingRepository.find({
      where: { status },
      relations: ['appliance', 'claim'],
      order: { preferred_date: 'ASC' },
    });
  }

  async getUpcomingBookings(limit: number = 50) {
    // Batch load upcoming bookings
    return this.bookingRepository.find({
      where: { status: 'scheduled' },
      relations: ['appliance', 'claim'],
      order: { preferred_date: 'ASC' },
      take: limit,
    });
  }

  async create(applianceId: string, data: Partial<BookingEntity>) {
    const booking = this.bookingRepository.create({
      id: uuidv4(),
      appliance_id: applianceId,
      ...data,
    });

    return this.bookingRepository.save(booking);
  }

  async update(bookingId: string, data: Partial<BookingEntity>) {
    await this.bookingRepository.update(bookingId, data);
    await this.cacheService.delete(CacheService.keys.booking(bookingId));
    return this.getBookingById(bookingId);
  }

  async delete(bookingId: string) {
    return this.bookingRepository.delete(bookingId);
  }
}
