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
import { Controller, Get, Post, Put, Delete, Param, Body, Query, HttpCode, HttpStatus, } from '@nestjs/common';
import { BookingService } from './booking.service.js';
let BookingController = class BookingController {
    bookingService;
    constructor(bookingService) {
        this.bookingService = bookingService;
    }
    async getById(id) {
        return this.bookingService.getBookingById(id);
    }
    async getByAppliance(applianceId) {
        return this.bookingService.getBookingsByAppliance(applianceId);
    }
    async getByStatus(status) {
        return this.bookingService.getBookingsByStatus(status);
    }
    async getUpcoming(limit = 50) {
        return this.bookingService.getUpcomingBookings(limit);
    }
    async create(data) {
        return this.bookingService.create(data.appliance_id, data);
    }
    async update(id, data) {
        return this.bookingService.update(id, data);
    }
    async delete(id) {
        return this.bookingService.delete(id);
    }
};
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "getById", null);
__decorate([
    Get('appliance/:applianceId'),
    __param(0, Param('applianceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "getByAppliance", null);
__decorate([
    Get('status/:status'),
    __param(0, Param('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "getByStatus", null);
__decorate([
    Get('upcoming/list'),
    __param(0, Query('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "getUpcoming", null);
__decorate([
    Post(),
    HttpCode(HttpStatus.CREATED),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "create", null);
__decorate([
    Put(':id'),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "update", null);
__decorate([
    Delete(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "delete", null);
BookingController = __decorate([
    Controller('api/bookings'),
    __metadata("design:paramtypes", [BookingService])
], BookingController);
export { BookingController };
//# sourceMappingURL=booking.controller.js.map