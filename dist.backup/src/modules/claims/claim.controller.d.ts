import { ClaimService } from './claim.service.js';
import { ClaimEntity } from '../../entities/claim.entity.js';
export declare class ClaimController {
    private claimService;
    constructor(claimService: ClaimService);
    getById(id: string): Promise<{} | null>;
    getByAppliance(applianceId: string): Promise<ClaimEntity[]>;
    getByStatus(applianceId: string, status: string): Promise<ClaimEntity[]>;
    create(data: {
        appliance_id: string;
        warranty_registration_id: string;
    } & Partial<ClaimEntity>): Promise<ClaimEntity>;
    update(id: string, data: {
        appliance_id: string;
    } & Partial<ClaimEntity>): Promise<{} | null>;
    delete(id: string, applianceId: string): Promise<import("typeorm").DeleteResult>;
}
