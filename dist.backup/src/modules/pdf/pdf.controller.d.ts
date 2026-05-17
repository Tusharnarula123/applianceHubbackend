import type { Response } from 'express';
import { PdfService } from './pdf.service.js';
export declare class PdfController {
    private pdfService;
    constructor(pdfService: PdfService);
    generateWarrantyPDF(warrantyId: string, res: Response): Promise<void>;
    generateClaimPDF(claimId: string, res: Response): Promise<void>;
    generateAppliancePDF(applianceId: string, res: Response): Promise<void>;
    generateBookingPDF(bookingId: string, res: Response): Promise<void>;
}
