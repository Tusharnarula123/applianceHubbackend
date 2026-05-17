var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingEntity } from '../../entities/booking.entity.js';
import { CacheService } from '../../common/cache.service.js';
import { v4 as uuidv4 } from 'uuid';
let BookingService = class BookingService {
    bookingRepository;
    cacheService;
    constructor(bookingRepository, cacheService) {
        this.bookingRepository = bookingRepository;
        this.cacheService = cacheService;
    }
    async getBookingById(bookingId) {
        const cacheKey = CacheService.keys.booking(bookingId);
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            return cached;
        }
        const booking = await this.bookingRepository.findOne({
            where: { id: bookingId },
            relations: ['appliance', 'claim', 'notifications'],
        });
        if (booking) {
            await this.cacheService.set(cacheKey, booking, 3600);
        }
        return booking;
    }
    async getBookingsByAppliance(applianceId) {
        return this.bookingRepository.find({
            where: { appliance_id: applianceId },
            relations: ['claim'],
            order: { preferred_date: 'DESC' },
        });
    }
    async getBookingsByStatus(status) {
        return this.bookingRepository.find({
            where: { status },
            relations: ['appliance', 'claim'],
            order: { preferred_date: 'ASC' },
        });
    }
    async getUpcomingBookings(limit = 50) {
        return this.bookingRepository.find({
            where: { status: 'scheduled' },
            relations: ['appliance', 'claim'],
            order: { preferred_date: 'ASC' },
            take: limit,
        });
    }
    async create(applianceId, data) {
        const booking = this.bookingRepository.create({
            id: uuidv4(),
            appliance_id: applianceId,
            ...data,
        });
        return this.bookingRepository.save(booking);
    }
    async update(bookingId, data) {
        await this.bookingRepository.update(bookingId, data);
        await this.cacheService.delete(CacheService.keys.booking(bookingId));
        return this.getBookingById(bookingId);
    }
    async delete(bookingId) {
        return this.bookingRepository.delete(bookingId);
    }
};
BookingService = __decorate([
    Injectable(),
    __param(0, InjectRepository(BookingEntity)),
    __metadata("design:paramtypes", [Repository,
        CacheService])
], BookingService);
export { BookingService };
//# sourceMappingURL=booking.service.js.map