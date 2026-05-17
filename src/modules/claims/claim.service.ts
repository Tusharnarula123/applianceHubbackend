import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClaimEntity } from '../../entities/claim.entity.js';
import { CacheService } from '../../common/cache.service.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ClaimService {
  constructor(
    @InjectRepository(ClaimEntity)
    private claimRepository: Repository<ClaimEntity>,
    private cacheService: CacheService,
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

    return claims;
  }

  async getClaimsByStatus(applianceId: string, status: string) {
    return this.claimRepository.find({
      where: { appliance_id: applianceId, status },
      relations: ['warranty', 'bookings'],
      order: { priority: 'DESC', filed_at: 'DESC' },
    });
  }

  async create(applianceId: string, warrantyId: string, data: Partial<ClaimEntity>) {
    const claim = this.claimRepository.create({
      id: uuidv4(),
      appliance_id: applianceId,
      warranty_id: warrantyId,
      ...data,
    });

    const result = await this.claimRepository.save(claim);
    return result;
  }

  async update(claimId: string, applianceId: string, data: Partial<ClaimEntity>) {
    await this.claimRepository.update(claimId, data);
    await this.cacheService.invalidateClaimCaches(claimId, applianceId);
    return this.getClaimById(claimId);
  }

  async delete(claimId: string, applianceId: string) {
    const result = await this.claimRepository.delete(claimId);
    await this.cacheService.invalidateClaimCaches(claimId, applianceId);
    return result;
  }
}
