import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { ActivityEntity } from '../../entities/activity.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { CacheService } from '../../common/cache.service.js';
import { v4 as uuidv4 } from 'uuid';

export type ActivityType = 'claim' | 'scan' | 'resolve' | 'upload';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityEntity)
    private activityRepository: Repository<ActivityEntity>,
    @InjectRepository(ApplianceEntity)
    private applianceRepository: Repository<ApplianceEntity>,
    private cacheService: CacheService,
  ) {}

  /**
   * Get all activities for a business (recent first)
   */
  async getActivitiesByBusiness(businessId: string, limit: number = 50, offset: number = 0): Promise<{
    data: ActivityEntity[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const cacheKey = CacheService.keys.activities(businessId);
    const cached = await this.cacheService.get<{
      data: ActivityEntity[];
      total: number;
      limit: number;
      offset: number;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    // Batch load activities with relations
    const [activities, total] = await this.activityRepository.findAndCount({
      where: { business_id: businessId },
      relations: ['appliance'],
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });

    const response = { data: activities, total, limit, offset };
    await this.cacheService.set(cacheKey, response, 1800);

    return response;
  }

  /**
   * Get activities for specific appliance
   */
  async getActivitiesByAppliance(applianceId: string, limit: number = 50) {
    return this.activityRepository.find({
      where: { appliance_id: applianceId },
      relations: ['business'],
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get activities by type
   */
  async getActivitiesByType(businessId: string, type: string, limit: number = 50) {
    return this.activityRepository.find({
      where: { business_id: businessId, type },
      relations: ['appliance'],
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Create activity (log action)
   */
  /**
   * Log activity for an appliance (resolves business_id automatically).
   */
  async logForAppliance(
    applianceId: string,
    type: ActivityType,
    text: string,
    metadata?: Record<string, any>,
  ) {
    const appliance = await this.applianceRepository.findOne({
      where: { id: applianceId },
      select: ['id', 'business_id', 'name'],
    });
    if (!appliance) return null;
    return this.log(appliance.business_id, type, text, applianceId, metadata);
  }

  async log(businessId: string, type: ActivityType, text: string, applianceId?: string, metadata?: any) {
    const activity = this.activityRepository.create({
      id: uuidv4(),
      business_id: businessId,
      appliance_id: applianceId,
      type,
      text,
      metadata,
    });

    const result = await this.activityRepository.save(activity);

    // Invalidate business activities cache
    await this.cacheService.delete(CacheService.keys.activities(businessId));

    return result;
  }

  /**
   * Get activity dashboard stats
   */
  async getApplianceDashboardStats(applianceId: string, days: number = 30) {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const activities = await this.activityRepository.find({
      where: {
        appliance_id: applianceId,
        created_at: MoreThanOrEqual(dateFrom),
      },
      select: ['id', 'type', 'created_at'],
    });

    const stats = {
      total: activities.length,
      by_type: {
        claim: activities.filter((a) => a.type === 'claim').length,
        scan: activities.filter((a) => a.type === 'scan').length,
        resolve: activities.filter((a) => a.type === 'resolve').length,
        upload: activities.filter((a) => a.type === 'upload').length,
      },
      by_day: {} as Record<string, number>,
    };

    activities.forEach((activity) => {
      const day = activity.created_at.toISOString().split('T')[0];
      stats.by_day[day] = (stats.by_day[day] || 0) + 1;
    });

    return stats;
  }

  async getDashboardStats(businessId: string, days: number = 30) {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // Batch load activities and count by type
    const activities = await this.activityRepository.find({
      where: {
        business_id: businessId,
        created_at: MoreThanOrEqual(dateFrom),
      },
      select: ['id', 'type', 'created_at'],
    });

    // Process data after query (not in query)
    const stats = {
      total: activities.length,
      by_type: {
        claim: activities.filter(a => a.type === 'claim').length,
        scan: activities.filter(a => a.type === 'scan').length,
        resolve: activities.filter(a => a.type === 'resolve').length,
        upload: activities.filter(a => a.type === 'upload').length,
      },
      by_day: {},
    };

    // Group by day
    activities.forEach(activity => {
      const day = activity.created_at.toISOString().split('T')[0];
      stats.by_day[day] = (stats.by_day[day] || 0) + 1;
    });

    return stats;
  }
}
