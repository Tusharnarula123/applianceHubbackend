import { Repository } from 'typeorm';
import { ClaimEntity } from '../../entities/claim.entity.js';
import { CacheService } from '../../common/cache.service.js';
export declare class ClaimService {
    private claimRepository;
    private cacheService;
    constructor(claimRepository: Repository<ClaimEntity>, cacheService: CacheService);
    getClaimById(claimId: string): Promise<{} | null>;
    getClaimsByAppliance(applianceId: string): Promise<ClaimEntity[]>;
    getClaimsByStatus(applianceId: string, status: string): Promise<ClaimEntity[]>;
    create(applianceId: string, warrantyId: string, data: Partial<ClaimEntity>): Promise<ClaimEntity>;
    update(claimId: string, applianceId: string, data: Partial<ClaimEntity>): Promise<{} | null>;
    delete(claimId: string, applianceId: string): Promise<import("typeorm").DeleteResult>;
}
