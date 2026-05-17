import { BookingService } from './booking.service.js';
import { BookingEntity } from '../../entities/booking.entity.js';
export declare class BookingController {
    private bookingService;
    constructor(bookingService: BookingService);
    getById(id: string): Promise<{} | null>;
    getByAppliance(applianceId: string): Promise<BookingEntity[]>;
    getByStatus(status: string): Promise<BookingEntity[]>;
    getUpcoming(limit?: number): Promise<BookingEntity[]>;
    create(data: {
        appliance_id: string;
    } & Partial<BookingEntity>): Promise<BookingEntity>;
    update(id: string, data: Partial<BookingEntity>): Promise<{} | null>;
    delete(id: string): Promise<import("typeorm").DeleteResult>;
}
