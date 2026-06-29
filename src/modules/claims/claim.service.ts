import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ClaimEntity } from '../../entities/claim.entity.js';
import { WarrantyRegistrationEntity } from '../../entities/warranty-registration.entity.js';
import { CacheService } from '../../common/cache.service.js';
import { ActivityService } from '../activities/activity.service.js';
import { resolveClaimWarrantyId } from '../../common/resolve-claim-warranty.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ClaimService {
  constructor(
    @InjectRepository(ClaimEntity)
    private claimRepository: Repository<ClaimEntity>,
    @InjectRepository(WarrantyRegistrationEntity)
    private warrantyRepository: Repository<WarrantyRegistrationEntity>,
    private cacheService: CacheService,
    private activityService: ActivityService,
  ) {}

  async getClaimById(claimId: string) {
    const cacheKey = CacheService.keys.claim(claimId);
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const claim = await this.claimRepository.findOne({
      where: { id: claimId },
      relations: ['appliance', 'warranty', 'bookings', 'notifications'],
    });

    if (claim) {
      await this.cacheService.set(cacheKey, claim, 3600);
    }

    return claim;
  }

  async getClaimsByAppliance(applianceId: string) {
    const claims = await this.claimRepository.find({
      where: { appliance_id: applianceId },
      relations: ['warranty', 'bookings'],
      order: { filed_at: 'DESC' },
    });

    return {
      appliance_id: applianceId,
      claims,
      total: claims.length,
    };
  }

  /** All claims for a business (dashboard claim history) — includes chatbot-filed claims */
  async getClaimsByBusiness(businessId: string, limit: number = 50, offset: number = 0) {
    const [claims, total] = await this.claimRepository.findAndCount({
      where: {
        appliance: {
          business_id: businessId,
          deleted_at: IsNull(),
        },
      },
      relations: ['appliance', 'warranty'],
      order: { filed_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    return {
      business_id: businessId,
      data: claims.map((claim) => ({
        id: claim.id,
        appliance_id: claim.appliance_id,
        appliance_name: claim.appliance?.name ?? null,
        appliance_model: claim.appliance?.model ?? null,
        customer_name: claim.customer_name,
        customer_email: claim.customer_email,
        customer_phone: claim.customer_phone,
        issue: claim.issue,
        status: claim.status,
        priority: claim.priority,
        warranty_id: claim.warranty_id,
        filed_at: claim.filed_at,
        resolved_at: claim.resolved_at,
        resolution_notes: claim.resolution_notes,
      })),
      total,
      limit,
      offset,
    };
  }

  async getClaimsByStatus(applianceId: string, status: string) {
    return this.claimRepository.find({
      where: { appliance_id: applianceId, status },
      relations: ['warranty', 'bookings'],
      order: { priority: 'DESC', filed_at: 'DESC' },
    });
  }

  async create(applianceId: string, warrantyId: string | null | undefined, data: Partial<ClaimEntity>) {
    const resolvedWarrantyId = await resolveClaimWarrantyId(
      this.warrantyRepository,
      applianceId,
      warrantyId ?? data.warranty_id,
      data.customer_email,
    );

    const claim = this.claimRepository.create({
      id: uuidv4(),
      appliance_id: applianceId,
      warranty_id: resolvedWarrantyId ?? undefined,
      ...data,
    });

    const result = await this.claimRepository.save(claim);
    await this.cacheService.invalidateClaimCaches(result.id, applianceId);
    await this.activityService.logForAppliance(
      applianceId,
      'claim',
      `Claim filed: ${result.customer_name}`,
      { claim_id: result.id, source: 'api' },
    );
    return result;
  }

  async update(claimId: string, applianceId: string, data: Partial<ClaimEntity>) {
    await this.claimRepository.update(claimId, data);
    await this.cacheService.invalidateClaimCaches(claimId, applianceId);
    if (data.status === 'resolved') {
      const claim = await this.claimRepository.findOne({ where: { id: claimId } });
      await this.activityService.logForAppliance(
        applianceId,
        'resolve',
        `Claim resolved: ${claim?.customer_name ?? claimId}`,
        { claim_id: claimId, source: 'api' },
      );
    }
    return this.getClaimById(claimId);
  }

  async delete(claimId: string, applianceId: string) {
    const result = await this.claimRepository.delete(claimId);
    await this.cacheService.invalidateClaimCaches(claimId, applianceId);
    return result;
  }
}
