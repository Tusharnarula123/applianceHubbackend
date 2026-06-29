import { Controller, Get, Param, Res, HttpCode, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PdfService } from './pdf.service.js';

/**
 * Document generation endpoints — intentionally public (no JWT guard).
 * These URLs are opened directly in a browser. The user clicks
 * "Print / Save PDF" to save the document locally.
 * Security comes from the opaque UUID in the path.
 */
@ApiTags('PDF')
@Controller('api/pdf')
export class PdfController {
  constructor(private pdfService: PdfService) {}

  @Get('warranty/:warrantyId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate warranty certificate (HTML, printable)' })
  async generateWarrantyDoc(@Param('warrantyId') warrantyId: string, @Res() res: Response) {
    const html = await this.pdfService.generateWarrantyHTML(warrantyId);
    res.set({ 'Content-Type': 'text/html; charset=utf-8' });
    res.send(html);
  }

  @Get('claim/:claimId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate claim report (HTML, printable)' })
  async generateClaimDoc(@Param('claimId') claimId: string, @Res() res: Response) {
    const html = await this.pdfService.generateClaimHTML(claimId);
    res.set({ 'Content-Type': 'text/html; charset=utf-8' });
    res.send(html);
  }

  @Get('appliance/:applianceId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate appliance report (HTML, printable)' })
  async generateApplianceDoc(@Param('applianceId') applianceId: string, @Res() res: Response) {
    const html = await this.pdfService.generateApplianceHTML(applianceId);
    res.set({ 'Content-Type': 'text/html; charset=utf-8' });
    res.send(html);
  }

  @Get('booking/:bookingId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate booking confirmation (HTML, printable)' })
  async generateBookingDoc(@Param('bookingId') bookingId: string, @Res() res: Response) {
    const html = await this.pdfService.generateBookingHTML(bookingId);
    res.set({ 'Content-Type': 'text/html; charset=utf-8' });
    res.send(html);
  }
}
