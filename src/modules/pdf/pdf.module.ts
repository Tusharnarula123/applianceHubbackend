import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarrantyRegistrationEntity } from '../../entities/warranty-registration.entity.js';
import { ClaimEntity } from '../../entities/claim.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { BookingEntity } from '../../entities/booking.entity.js';
import { PdfService } from './pdf.service.js';
import { PdfController } from './pdf.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WarrantyRegistrationEntity,
      ClaimEntity,
      ApplianceEntity,
      BookingEntity,
    ]),
  ],
  controllers: [PdfController],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
