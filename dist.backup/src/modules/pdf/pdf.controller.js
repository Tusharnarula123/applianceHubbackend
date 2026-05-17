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
import { Controller, Get, Param, UseGuards, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PdfService } from './pdf.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';
let PdfController = class PdfController {
    pdfService;
    constructor(pdfService) {
        this.pdfService = pdfService;
    }
    async generateWarrantyPDF(warrantyId, res) {
        const pdf = (await this.pdfService.generateWarrantyPDF(warrantyId));
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="warranty-${warrantyId}.pdf"`,
        });
        res.send(pdf);
    }
    async generateClaimPDF(claimId, res) {
        const pdf = (await this.pdfService.generateClaimPDF(claimId));
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="claim-${claimId}.pdf"`,
        });
        res.send(pdf);
    }
    async generateAppliancePDF(applianceId, res) {
        const pdf = (await this.pdfService.generateAppliancePDF(applianceId));
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="appliance-${applianceId}.pdf"`,
        });
        res.send(pdf);
    }
    async generateBookingPDF(bookingId, res) {
        const pdf = (await this.pdfService.generateBookingPDF(bookingId));
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="booking-${bookingId}.pdf"`,
        });
        res.send(pdf);
    }
};
__decorate([
    Get('warranty/:warrantyId'),
    UseGuards(JwtAuthGuard),
    ApiBearerAuth(),
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: 'Generate warranty certificate PDF' }),
    __param(0, Param('warrantyId')),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PdfController.prototype, "generateWarrantyPDF", null);
__decorate([
    Get('claim/:claimId'),
    UseGuards(JwtAuthGuard),
    ApiBearerAuth(),
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: 'Generate claim details PDF' }),
    __param(0, Param('claimId')),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PdfController.prototype, "generateClaimPDF", null);
__decorate([
    Get('appliance/:applianceId'),
    UseGuards(JwtAuthGuard),
    ApiBearerAuth(),
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: 'Generate appliance report PDF' }),
    __param(0, Param('applianceId')),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PdfController.prototype, "generateAppliancePDF", null);
__decorate([
    Get('booking/:bookingId'),
    UseGuards(JwtAuthGuard),
    ApiBearerAuth(),
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: 'Generate booking confirmation PDF' }),
    __param(0, Param('bookingId')),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PdfController.prototype, "generateBookingPDF", null);
PdfController = __decorate([
    ApiTags('PDF'),
    Controller('pdf'),
    __metadata("design:paramtypes", [PdfService])
], PdfController);
export { PdfController };
//# sourceMappingURL=pdf.controller.js.map