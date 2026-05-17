var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarrantyRegistrationEntity } from '../../entities/warranty-registration.entity.js';
import { ClaimEntity } from '../../entities/claim.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { BookingEntity } from '../../entities/booking.entity.js';
import { PdfService } from './pdf.service.js';
import { PdfController } from './pdf.controller.js';
let PdfModule = class PdfModule {
};
PdfModule = __decorate([
    Module({
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
], PdfModule);
export { PdfModule };
//# sourceMappingURL=pdf.module.js.map