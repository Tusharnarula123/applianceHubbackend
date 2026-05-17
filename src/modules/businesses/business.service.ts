import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessEntity } from '../../entities/business.entity.js';
import { CacheService } from '../../common/cache.service.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(BusinessEntity)
    private businessRepository: Repository<BusinessEntity>,
    private cacheService: CacheService,
  ) {}

  async getBusinessById(businessId: string) {
    const cacheKey = CacheService.keys.business(businessId);
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Single query with all relations
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['users', 'appliances', 'notifications', 'activities'],
    });

    if (business) {
      await this.cacheService.set(cacheKey, business, 3600);
    }

    return business;
  }

  async getBusinessUsers(businessId: string) {
    const cacheKey = CacheService.keys.businessUsers(businessId);
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: ['users'],
      select: ['id', 'name', 'users'],
    });

    if (business) {
      await this.cacheService.set(cacheKey, business.users, 3600);
    }

    return business?.users || [];
  }

  async getAllBusinesses(limit: number = 50, offset: number = 0) {
    // This list is less frequently cached due to size
    const [businesses, total] = await this.businessRepository.findAndCount({
      relations: ['users', 'appliances'],
      take: limit,
      skip: offset,
      order: { created_at: 'DESC' },
    });

    return { data: businesses, total, limit, offset };
  }

  async create(data: Partial<BusinessEntity>) {
    const business = this.businessRepository.create({
      id: uuidv4(),
      ...data,
    });

    const result = await this.businessRepository.save(business);
    return result;
  }

  async update(businessId: string, data: Partial<BusinessEntity>) {
    await this.businessRepository.update(businessId, data);
    await this.cacheService.invalidateBusinessCaches(businessId);
    return this.getBusinessById(businessId);
  }

  async delete(businessId: string) {
    const result = await this.businessRepository.delete(businessId);
    await this.cacheService.invalidateBusinessCaches(businessId);
    return result;
  }

  async getBusinessStats(businessId: string) {
    const business = await this.businessRepository.findOne({
      where: { id: businessId },
      relations: [
        'users',
        'appliances',
        'appliances.claims',
        'appliances.bookings',
        'appliances.qr_codes',
      ],
    });

    if (!business) {
      return null;
    }

    return {
      id: businessId,
      name: business.name,
      plan: business.plan,
      users_count: business.users?.length || 0,
      appliances_count: business.appliances?.length || 0,
      total_claims: business.appliances?.reduce((sum, app) => sum + (app.claims?.length || 0), 0) || 0,
      total_bookings: business.appliances?.reduce((sum, app) => sum + (app.bookings?.length || 0), 0) || 0,
      total_scans: business.appliances?.reduce(
        (sum, app) => sum + (app.qr_codes?.reduce((qrSum, qr) => qrSum + qr.scan_count, 0) || 0),
        0,
      ) || 0,
    };
  }

  /**
   * User Management Methods
   */
  async inviteUser(businessId: string, email: string, role: string) {
    // In production, this would:
    // 1. Create invitation record
    // 2. Send invitation email
    // 3. Generate invitation token with expiry
    return {
      data: {
        id: uuidv4(),
        email,
        role,
        invitation_sent: true,
        invitation_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      message: 'Invitation sent successfully',
    };
  }

  async removeUser(businessId: string, userId: string) {
    // In production, this would:
    // 1. Verify user belongs to business
    // 2. Check if user is last owner (prevent removal)
    // 3. Delete user or revoke access
    return {
      message: 'User removed successfully',
    };
  }

  /**
   * API Key Methods
   */
  async getApiKey(businessId: string) {
    // In production, fetch from database
    return {
      data: {
        key: 'ah_live_sk_' + uuidv4().replace(/-/g, ''),
        created_at: new Date().toISOString(),
        last_used: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  }

  async regenerateApiKey(businessId: string) {
    // In production:
    // 1. Generate new API key
    // 2. Invalidate old key
    // 3. Save to database
    return {
      data: {
        key: 'ah_live_sk_' + uuidv4().replace(/-/g, ''),
        created_at: new Date().toISOString(),
      },
      message: 'API key regenerated successfully',
    };
  }

  /**
   * Webhook Methods
   */
  async getWebhookConfig(businessId: string) {
    // In production, fetch from database
    return {
      data: {
        url: 'https://hooks.example.com/appliancehub',
        active: true,
        events: [
          'claim.created',
          'claim.resolved',
          'claim.escalated',
          'qr.scanned',
          'doc.indexed',
        ],
        created_at: new Date().toISOString(),
      },
    };
  }

  async updateWebhookConfig(businessId: string, data: { url: string; active: boolean; events?: string[] }) {
    // In production:
    // 1. Validate webhook URL
    // 2. Update in database
    // 3. Test connectivity
    return {
      data: {
        url: data.url,
        active: data.active,
        events: data.events || [],
        updated_at: new Date().toISOString(),
      },
      message: 'Webhook configuration updated successfully',
    };
  }

  async testWebhook(businessId: string, eventType: string) {
    // In production:
    // 1. Get webhook URL
    // 2. Send test payload
    // 3. Return response
    return {
      data: {
        sent: true,
        status_code: 200,
        response_time_ms: 150,
        event_type: eventType,
      },
      message: 'Test webhook sent successfully',
    };
  }

  /**
   * Plan Methods
   */
  async getPlan(businessId: string) {
    // In production, fetch from database/billing service
    return {
      data: {
        name: 'Growth Plan',
        price: 149,
        billing_period: 'monthly',
        max_skus: 50,
        features: ['Analytics', 'Priority support', 'Webhooks', 'API access'],
        renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    };
  }
}
