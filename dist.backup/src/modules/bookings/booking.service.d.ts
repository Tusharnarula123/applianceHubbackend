import { Repository } from 'typeorm';
import { BookingEntity } from '../../entities/booking.entity.js';
import { CacheService } from '../../common/cache.service.js';
export declare class BookingService {
    private bookingRepository;
    private cacheService;
    constructor(bookingRepository: Repository<BookingEntity>, cacheService: CacheService);
    getBookingById(bookingId: string): Promise<{} | null>;
    getBookingsByAppliance(applianceId: string): Promise<BookingEntity[]>;
    getBookingsByStatus(status: string): Promise<BookingEntity[]>;
    getUpcomingBookings(limit?: number): Promise<BookingEntity[]>;
    create(applianceId: string, data: Partial<BookingEntity>): Promise<BookingEntity>;
    update(bookingId: string, data: Partial<BookingEntity>): Promise<{} | null>;
    delete(bookingId: string): Promise<import("typeorm").DeleteResult>;
}
