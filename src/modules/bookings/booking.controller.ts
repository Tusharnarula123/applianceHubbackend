import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookingService } from './booking.service.js';
import { BookingEntity } from '../../entities/booking.entity.js';

@Controller('api/bookings')
export class BookingController {
  constructor(private bookingService: BookingService) {}

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.bookingService.getBookingById(id);
  }

  @Get('appliance/:applianceId')
  async getByAppliance(@Param('applianceId') applianceId: string) {
    return this.bookingService.getBookingsByAppliance(applianceId);
  }

  @Get('status/:status')
  async getByStatus(@Param('status') status: string) {
    return this.bookingService.getBookingsByStatus(status);
  }

  @Get('upcoming/list')
  async getUpcoming(@Query('limit') limit: number = 50) {
    return this.bookingService.getUpcomingBookings(limit);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() data: { appliance_id: string } & Partial<BookingEntity>) {
    return this.bookingService.create(data.appliance_id, data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: Partial<BookingEntity>) {
    return this.bookingService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.bookingService.delete(id);
  }
}
