import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { ActivityEntity } from '../../entities/activity.entity.js';
import { CacheService } from '../../common/cache.service.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityEntity)
    private activityRepository: Repository<ActivityEntity>,
    private cacheService: CacheService,
  ) {}

  /**
   * Get all activities for a business (recent first)
   */
  async getActivitiesByBusiness(businessId: string, limit: number = 50, offset: number = 0) {
    const cacheKey = CacheService.keys.activities(businessId);
    const cached = await this.cacheService.get(cacheKey);

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
  async log(businessId: string, type: string, text: string, applianceId?: string, metadata?: any) {
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
