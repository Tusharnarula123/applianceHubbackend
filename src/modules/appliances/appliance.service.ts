import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { CacheService } from '../../common/cache.service.js';
import { QrCodeService } from '../qr/qr-code.service.js';
import { v4 as uuidv4 } from 'uuid';

type DashboardAppliance = ApplianceEntity & Partial<{
  documents_count: number;
  claims_count: number;
  active_warranties: number;
  pending_claims: number;
  bookings_count: number;
  total_scans: number;
  warranties: any[];
}>;

@Injectable()
export class ApplianceService {
  constructor(
    @InjectRepository(ApplianceEntity)
    private applianceRepository: Repository<ApplianceEntity>,
    private cacheService: CacheService,
    private qrCodeService: QrCodeService,
  ) {}

  /**
   * Get single appliance with all relations (eager loaded)
   * Uses caching to prevent repeated queries
   */
  async getApplianceById(applianceId: string) {
    const cacheKey = CacheService.keys.appliance(applianceId);
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Single query with all relations loaded (no N+1 problem, excluding deleted)
    const appliance = await this.applianceRepository.findOne({
      where: { id: applianceId, deleted_at: IsNull() },
      relations: [
        'business',
        'qr_codes',
        'documents',
        'warranties',
        'claims',
        'bookings',
        'chat_sessions',
        'offers',
      ],
    });

    if (appliance) {
      // Add count fields for consistency with list endpoint
      const result = {
        ...appliance,
        documents_count: appliance.documents?.length || 0,
        claims_count: appliance.claims?.length || 0,
      };
      await this.cacheService.set(cacheKey, result, 3600);
      return result;
    }

    return appliance;
  }

  /**
   * Get all appliances for a business (batch query)
   * Loads all appliances with basic info, documents count, claims count
   * NOTE: Caching disabled for this endpoint to ensure deletes show immediately
   */
  async getAppliancesByBusiness(
    businessId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{
    data: DashboardAppliance[];
    total: number;
    limit: number;
    offset: number;
  }> {
    // Batch load all appliances with counts in one query (excluding deleted)
    const [appliances, total] = await this.applianceRepository.findAndCount({
      where: { business_id: businessId, deleted_at: IsNull() },
      relations: ['documents', 'claims', 'qr_codes'],
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    // Add counts to each appliance
    const result: DashboardAppliance[] = appliances.map(appliance => ({
      ...appliance,
      documents_count: appliance.documents?.length || 0,
      claims_count: appliance.claims?.length || 0,
    }));

    const response = { data: result, total, limit, offset };

    return response;
  }

  /**
   * Get appliance with only documents (optimized for specific view)
   */
  async getApplianceWithDocuments(applianceId: string) {
    const cacheKey = CacheService.keys.applianceDocuments(applianceId);
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const appliance = await this.applianceRepository.findOne({
      where: { id: applianceId, deleted_at: IsNull() },
      relations: ['documents'],
      select: ['id', 'name', 'model', 'status'],
    });

    if (appliance) {
      await this.cacheService.set(cacheKey, appliance, 3600);
    }

    return appliance;
  }

  /**
   * Get appliance with claims (optimized for claims view)
   */
  async getApplianceWithClaims(applianceId: string) {
    const cacheKey = CacheService.keys.applianceClaims(applianceId);
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const appliance = await this.applianceRepository.findOne({
      where: { id: applianceId, deleted_at: IsNull() },
      relations: ['claims', 'claims.warranty'],
      select: ['id', 'name', 'model', 'status'],
    });

    if (appliance) {
      await this.cacheService.set(cacheKey, appliance, 3600);
    }

    return appliance;
  }

  /**
   * Get appliance with bookings (optimized for bookings view)
   */
  async getApplianceWithBookings(applianceId: string) {
    const cacheKey = CacheService.keys.applianceBookings(applianceId);
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const appliance = await this.applianceRepository.findOne({
      where: { id: applianceId, deleted_at: IsNull() },
      relations: ['bookings'],
      select: ['id', 'name', 'model', 'status'],
    });

    if (appliance) {
      await this.cacheService.set(cacheKey, appliance, 3600);
    }

    return appliance;
  }

  /**
   * Create new appliance
   */
  async create(businessId: string, data: Partial<ApplianceEntity>) {
    const appliance = this.applianceRepository.create({
      id: uuidv4(),
      business_id: businessId,
      ...data,
    });

    const result = await this.applianceRepository.save(appliance);

    // Invalidate business appliances list cache
    await this.cacheService.invalidateApplianceCaches(result.id, businessId);

    if (result.model?.trim()) {
      await this.qrCodeService.generateForAppliance(result.id);
    }

    return result;
  }

  /**
   * Update appliance
   */
  async update(applianceId: string, businessId: string, data: Partial<ApplianceEntity>) {
    await this.applianceRepository.update(applianceId, data);

    // Invalidate all related caches
    await this.cacheService.invalidateApplianceCaches(applianceId, businessId);

    return this.getApplianceById(applianceId);
  }

  /**
   * Delete appliance (soft delete - marks as deleted)
   */
  async delete(applianceId: string, businessId?: string) {
    console.log(`[DELETE] Starting soft delete for appliance: ${applianceId}`);

    try {
      // Verify appliance exists and is not already deleted
      const appliance = await this.applianceRepository.findOne({
        where: { id: applianceId, deleted_at: IsNull() },
      });

      if (!appliance) {
        console.log(`[DELETE] Appliance not found or already deleted`);
        return {
          message: 'Appliance not found or already deleted',
          success: false,
        };
      }

      const actualBusinessId = businessId || appliance.business_id;
      console.log(`[DELETE] Found appliance, marking as deleted, business_id: ${actualBusinessId}`);

      // Soft delete: set deleted_at timestamp
      await this.applianceRepository.update(applianceId, {
        deleted_at: new Date(),
      });
      console.log(`[DELETE] Marked appliance as deleted`);

      // Invalidate caches
      await this.cacheService.invalidateApplianceCaches(applianceId, actualBusinessId);
      console.log(`[DELETE] Invalidated caches`);

      return {
        message: 'Appliance deleted successfully',
        success: true,
        appliance_id: applianceId,
      };
    } catch (error) {
      console.error(`[DELETE] Fatal error:`, error);
      return {
        message: 'Error deleting appliance',
        error: error.message,
        success: false,
      };
    }
  }

  /**
   * Get appliance statistics (for dashboard)
   */
  async getApplianceStats(applianceId: string) {
    // Batch query all stats in one go (excluding deleted)
    const appliance = await this.applianceRepository.findOne({
      where: { id: applianceId, deleted_at: IsNull() },
      relations: [
        'documents',
        'claims',
        'bookings',
        'qr_codes',
        'warranties',
        'chat_sessions',
      ],
    });

    if (!appliance) {
      return null;
    }

    return {
      id: applianceId,
      name: appliance.name,
      documents_count: appliance.documents?.length || 0,
      claims_count: appliance.claims?.length || 0,
      pending_claims: appliance.claims?.filter(c => c.status !== 'resolved')?.length || 0,
      bookings_count: appliance.bookings?.length || 0,
      qr_codes_count: appliance.qr_codes?.length || 0,
      total_scans: appliance.qr_codes?.reduce((sum, qr) => sum + qr.scan_count, 0) || 0,
      active_warranties: appliance.warranties?.filter(w => w.status === 'active')?.length || 0,
      chat_sessions_count: appliance.chat_sessions?.length || 0,
    };
  }
}
