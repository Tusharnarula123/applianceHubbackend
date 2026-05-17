import { Controller, Get, Param, UseGuards, Res, HttpCode, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PdfService } from './pdf.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';

@ApiTags('PDF')
@Controller('pdf')
export class PdfController {
  constructor(private pdfService: PdfService) {}

  @Get('warranty/:warrantyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate warranty certificate PDF' })
  async generateWarrantyPDF(@Param('warrantyId') warrantyId: string, @Res() res: Response) {
    const pdf = (await this.pdfService.generateWarrantyPDF(warrantyId)) as Buffer;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="warranty-${warrantyId}.pdf"`,
    });
    res.send(pdf);
  }

  @Get('claim/:claimId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate claim details PDF' })
  async generateClaimPDF(@Param('claimId') claimId: string, @Res() res: Response) {
    const pdf = (await this.pdfService.generateClaimPDF(claimId)) as Buffer;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="claim-${claimId}.pdf"`,
    });
    res.send(pdf);
  }

  @Get('appliance/:applianceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate appliance report PDF' })
  async generateAppliancePDF(@Param('applianceId') applianceId: string, @Res() res: Response) {
    const pdf = (await this.pdfService.generateAppliancePDF(applianceId)) as Buffer;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="appliance-${applianceId}.pdf"`,
    });
    res.send(pdf);
  }

  @Get('booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate booking confirmation PDF' })
  async generateBookingPDF(@Param('bookingId') bookingId: string, @Res() res: Response) {
    const pdf = (await this.pdfService.generateBookingPDF(bookingId)) as Buffer;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="booking-${bookingId}.pdf"`,
    });
    res.send(pdf);
  }
}
