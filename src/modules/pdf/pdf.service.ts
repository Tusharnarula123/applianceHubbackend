import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import { WarrantyRegistrationEntity } from '../../entities/warranty-registration.entity.js';
import { ClaimEntity } from '../../entities/claim.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { BookingEntity } from '../../entities/booking.entity.js';

@Injectable()
export class PdfService {
  constructor(
    @InjectRepository(WarrantyRegistrationEntity)
    private warrantyRepository: Repository<WarrantyRegistrationEntity>,
    @InjectRepository(ClaimEntity)
    private claimRepository: Repository<ClaimEntity>,
    @InjectRepository(ApplianceEntity)
    private applianceRepository: Repository<ApplianceEntity>,
    @InjectRepository(BookingEntity)
    private bookingRepository: Repository<BookingEntity>,
  ) {}

  async generateWarrantyPDF(warrantyId: string) {
    const warranty = await this.warrantyRepository.findOne({
      where: { id: warrantyId },
      relations: ['appliance'],
    });

    if (!warranty) {
      throw new NotFoundException('Warranty not found');
    }

    const doc = new PDFDocument();
    const buffer: Buffer[] = [];

    doc.on('data', (chunk) => buffer.push(chunk));

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('WARRANTY CERTIFICATE', { align: 'center' });
    doc.moveDown();

    // Warranty Details
    doc.fontSize(12).font('Helvetica');
    doc.text(`Warranty ID: ${warranty.id}`);
    doc.text(`Status: ${warranty.status}`);
    doc.moveDown();

    // Customer Information
    doc.fontSize(14).font('Helvetica-Bold').text('Customer Information');
    doc.fontSize(11).font('Helvetica');
    doc.text(`Name: ${warranty.customer_name}`);
    doc.text(`Email: ${warranty.customer_email}`);
    if (warranty.customer_phone) {
      doc.text(`Phone: ${warranty.customer_phone}`);
    }
    doc.moveDown();

    // Appliance Information
    doc.fontSize(14).font('Helvetica-Bold').text('Appliance Information');
    doc.fontSize(11).font('Helvetica');
    if (warranty.appliance) {
      doc.text(`Model: ${warranty.appliance.model}`);
      doc.text(`Category: ${warranty.appliance.category}`);
      doc.text(`SKU: ${warranty.appliance.sku}`);
    }
    doc.moveDown();

    // Warranty Terms
    doc.fontSize(14).font('Helvetica-Bold').text('Warranty Terms');
    doc.fontSize(11).font('Helvetica');
    if (warranty.purchase_date) {
      doc.text(`Purchase Date: ${new Date(warranty.purchase_date).toLocaleDateString()}`);
    }
    if (warranty.expiry_date) {
      doc.text(`Expiry Date: ${new Date(warranty.expiry_date).toLocaleDateString()}`);
    }
    if (warranty.serial_number) {
      doc.text(`Serial Number: ${warranty.serial_number}`);
    }
    doc.moveDown();

    doc.fontSize(10).text('This warranty certificate is valid only for the appliance mentioned above.', {
      align: 'center',
    });

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffer));
      });
      doc.on('error', reject);
    });
  }

  async generateClaimPDF(claimId: string) {
    const claim = await this.claimRepository.findOne({
      where: { id: claimId },
      relations: ['appliance', 'warranty'],
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    const doc = new PDFDocument();
    const buffer: Buffer[] = [];

    doc.on('data', (chunk) => buffer.push(chunk));

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('CLAIM DETAILS', { align: 'center' });
    doc.moveDown();

    // Claim Information
    doc.fontSize(12).font('Helvetica');
    doc.text(`Claim ID: ${claim.id}`);
    doc.text(`Status: ${claim.status}`);
    doc.text(`Priority: ${claim.priority}`);
    doc.moveDown();

    // Customer Information
    doc.fontSize(14).font('Helvetica-Bold').text('Customer Information');
    doc.fontSize(11).font('Helvetica');
    doc.text(`Name: ${claim.customer_name}`);
    doc.text(`Email: ${claim.customer_email}`);
    if (claim.customer_phone) {
      doc.text(`Phone: ${claim.customer_phone}`);
    }
    doc.moveDown();

    // Issue Details
    doc.fontSize(14).font('Helvetica-Bold').text('Issue Description');
    doc.fontSize(11).font('Helvetica');
    doc.text(claim.issue, { width: 500 });
    doc.moveDown();

    // Resolution
    if (claim.resolution_notes) {
      doc.fontSize(14).font('Helvetica-Bold').text('Resolution');
      doc.fontSize(11).font('Helvetica');
      doc.text(claim.resolution_notes, { width: 500 });
    }
    doc.moveDown();

    // Dates
    if (claim.filed_at) {
      doc.text(`Filed Date: ${new Date(claim.filed_at).toLocaleDateString()}`);
    }
    if (claim.resolved_at) {
      doc.text(`Resolved Date: ${new Date(claim.resolved_at).toLocaleDateString()}`);
    }

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffer));
      });
      doc.on('error', reject);
    });
  }

  async generateAppliancePDF(applianceId: string) {
    const appliance = await this.applianceRepository.findOne({
      where: { id: applianceId },
      relations: ['business', 'documents', 'warranties', 'claims', 'bookings'],
    });

    if (!appliance) {
      throw new NotFoundException('Appliance not found');
    }

    const doc = new PDFDocument();
    const buffer: Buffer[] = [];

    doc.on('data', (chunk) => buffer.push(chunk));

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('APPLIANCE REPORT', { align: 'center' });
    doc.moveDown();

    // Appliance Information
    doc.fontSize(14).font('Helvetica-Bold').text('Appliance Information');
    doc.fontSize(11).font('Helvetica');
    doc.text(`Name: ${appliance.name}`);
    doc.text(`Model: ${appliance.model}`);
    doc.text(`SKU: ${appliance.sku}`);
    doc.text(`Category: ${appliance.category}`);
    doc.text(`Status: ${appliance.status}`);
    if (appliance.color) {
      doc.text(`Color: ${appliance.color}`);
    }
    doc.moveDown();

    // Business Information
    if (appliance.business) {
      doc.fontSize(14).font('Helvetica-Bold').text('Business Information');
      doc.fontSize(11).font('Helvetica');
      doc.text(`Business: ${appliance.business.name}`);
      if (appliance.business.contact_phone) {
        doc.text(`Phone: ${appliance.business.contact_phone}`);
      }
    }
    doc.moveDown();

    // Statistics
    doc.fontSize(14).font('Helvetica-Bold').text('Statistics');
    doc.fontSize(11).font('Helvetica');
    doc.text(`Total Documents: ${appliance.documents?.length || 0}`);
    doc.text(`Total Warranties: ${appliance.warranties?.length || 0}`);
    doc.text(`Total Claims: ${appliance.claims?.length || 0}`);
    doc.text(`Total Bookings: ${appliance.bookings?.length || 0}`);
    doc.text(`Total QR Scans: ${appliance.scans_count || 0}`);
    doc.moveDown();

    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffer));
      });
      doc.on('error', reject);
    });
  }

  async generateBookingPDF(bookingId: string) {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['appliance', 'claim'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const doc = new PDFDocument();
    const buffer: Buffer[] = [];

    doc.on('data', (chunk) => buffer.push(chunk));

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('SERVICE BOOKING CONFIRMATION', { align: 'center' });
    doc.moveDown();

    // Booking Details
    doc.fontSize(12).font('Helvetica');
    doc.text(`Booking ID: ${booking.id}`);
    doc.text(`Service Type: ${booking.service_type}`);
    doc.text(`Status: ${booking.status}`);
    doc.moveDown();

    // Customer Information
    doc.fontSize(14).font('Helvetica-Bold').text('Customer Information');
    doc.fontSize(11).font('Helvetica');
    doc.text(`Name: ${booking.customer_name}`);
    doc.text(`Email: ${booking.customer_email}`);
    if (booking.customer_phone) {
      doc.text(`Phone: ${booking.customer_phone}`);
    }
    doc.moveDown();

    // Appliance Information
    if (booking.appliance) {
      doc.fontSize(14).font('Helvetica-Bold').text('Appliance Information');
      doc.fontSize(11).font('Helvetica');
      doc.text(`Model: ${booking.appliance.model}`);
      doc.text(`Category: ${booking.appliance.category}`);
    }
    doc.moveDown();

    // Service Details
    doc.fontSize(14).font('Helvetica-Bold').text('Service Details');
    doc.fontSize(11).font('Helvetica');
    doc.text(`Preferred Date: ${new Date(booking.preferred_date).toLocaleDateString()}`);
    if (booking.preferred_time) {
      doc.text(`Preferred Time: ${booking.preferred_time}`);
    }
    if (booking.notes) {
      doc.text(`Notes: ${booking.notes}`);
    }

    doc.end();

    return new Promise((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffer));
      });
      doc.on('error', reject);
    });
  }
}
