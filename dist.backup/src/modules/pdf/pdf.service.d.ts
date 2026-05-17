import { Repository } from 'typeorm';
import { WarrantyRegistrationEntity } from '../../entities/warranty-registration.entity.js';
import { ClaimEntity } from '../../entities/claim.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { BookingEntity } from '../../entities/booking.entity.js';
export declare class PdfService {
    private warrantyRepository;
    private claimRepository;
    private applianceRepository;
    private bookingRepository;
    constructor(warrantyRepository: Repository<WarrantyRegistrationEntity>, claimRepository: Repository<ClaimEntity>, applianceRepository: Repository<ApplianceEntity>, bookingRepository: Repository<BookingEntity>);
    generateWarrantyPDF(warrantyId: string): Promise<unknown>;
    generateClaimPDF(claimId: string): Promise<unknown>;
    generateAppliancePDF(applianceId: string): Promise<unknown>;
    generateBookingPDF(bookingId: string): Promise<unknown>;
}
