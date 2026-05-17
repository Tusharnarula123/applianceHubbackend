import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { CacheService } from '../../common/cache.service.js';
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

    // Single query with all relations loaded (no N+1 problem)
    const appliance = await this.applianceRepository.findOne({
      where: { id: applianceId },
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
    // Batch load all appliances with counts in one query
    const [appliances, total] = await this.applianceRepository.findAndCount({
      where: { business_id: businessId },
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
      where: { id: applianceId },
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
      where: { id: applianceId },
      relations: ['claims', 'claims.warranty_registration'],
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
      where: { id: applianceId },
      relations: ['bookings'],
      select: ['id', 'name', 'model', 'status'],
    });

    if (appliance) {
      await this.cacheService.set(cacheKey, appliance, 3600);
    }

    return appliance;
  }

  /**
   * Get appliance QR codes (optimized for QR code view)
   */
  async getApplianceWithQrCodes(applianceId: string) {
    const cacheKey = CacheService.keys.applianceQrCodes(applianceId);
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const appliance = await this.applianceRepository.findOne({
      where: { id: applianceId },
      relations: ['qr_codes'],
      select: ['id', 'name', 'model'],
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
   * Delete appliance (cascade deletes related data)
   */
  async delete(applianceId: string, businessId?: string) {
    console.log(`[DELETE] Starting delete for appliance: ${applianceId}`);

    try {
      // Verify appliance exists
      const appliance = await this.applianceRepository.findOne({
        where: { id: applianceId },
      });

      if (!appliance) {
        console.log(`[DELETE] Appliance not found`);
        return {
          message: 'Appliance not found',
          success: false,
        };
      }

      const actualBusinessId = businessId || appliance.business_id;
      console.log(`[DELETE] Found appliance, business_id: ${actualBusinessId}`);

      // Disable foreign key checks temporarily
      await this.applianceRepository.query(`SET FOREIGN_KEY_CHECKS=0`);
      console.log(`[DELETE] Disabled FOREIGN_KEY_CHECKS`);

      try {
        // Delete all child records
        const childTables = [
          'documents',
          'claims',
          'bookings',
          'qr_codes',
          'chat_sessions',
          'offers',
          'warranty_registrations',
          'activities',
        ];

        for (const table of childTables) {
          await this.applianceRepository.query(
            `DELETE FROM ${table} WHERE appliance_id = ?`,
            [applianceId]
          );
          console.log(`[DELETE] Deleted from ${table}`);
        }

        // Delete the appliance itself
        await this.applianceRepository.query(
          `DELETE FROM appliances WHERE id = ?`,
          [applianceId]
        );
        console.log(`[DELETE] Deleted from appliances`);

        // Re-enable foreign key checks
        await this.applianceRepository.query(`SET FOREIGN_KEY_CHECKS=1`);
        console.log(`[DELETE] Re-enabled FOREIGN_KEY_CHECKS`);

        // Verify deletion
        const exists = await this.applianceRepository.findOne({
          where: { id: applianceId },
        });
        const success = !exists;
        console.log(`[DELETE] Verification - appliance exists: ${!!exists}, success: ${success}`);

        // Invalidate caches
        await this.cacheService.invalidateApplianceCaches(applianceId, actualBusinessId);

        return {
          message: 'Appliance deleted successfully',
          success,
          appliance_id: applianceId,
        };
      } catch (error) {
        // Re-enable foreign key checks on error
        await this.applianceRepository.query(`SET FOREIGN_KEY_CHECKS=1`);
        throw error;
      }
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
    // Batch query all stats in one go
    const appliance = await this.applianceRepository.findOne({
      where: { id: applianceId },
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
