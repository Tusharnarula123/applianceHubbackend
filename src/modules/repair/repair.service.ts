import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';

import { RepairAgentEntity } from '../../entities/repair-agent.entity.js';
import { RepairRequestEntity, RepairStatus } from '../../entities/repair-request.entity.js';
import { RepairReviewEntity } from '../../entities/repair-review.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';

/* ─── DTOs ─────────────────────────────────────────────────── */
export interface CreateRepairRequestDto {
  appliance_id: string;
  session_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_city?: string;
  customer_zipcode?: string;
  issue_description: string;
}

export interface AssignAgentDto {
  agent_id: string;
  scheduled_date?: string;
}

export interface UpdateRepairStatusDto {
  status: RepairStatus;
  repair_cost?: number;
  agent_notes?: string;
  internal_notes?: string;
  completed_date?: string;
}

export interface CreateRepairReviewDto {
  repair_request_id: string;
  rating: number;
  comment?: string;
  reviewer_name?: string;
}

export interface CreateAgentDto {
  business_id?: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  photo_url?: string;
  specializations?: string[];
  service_areas?: string[];
  is_marketplace?: boolean;
  bio?: string;
}

@Injectable()
export class RepairService {
  private readonly logger = new Logger(RepairService.name);

  constructor(
    @InjectRepository(RepairAgentEntity)
    private readonly agentRepo: Repository<RepairAgentEntity>,

    @InjectRepository(RepairRequestEntity)
    private readonly requestRepo: Repository<RepairRequestEntity>,

    @InjectRepository(RepairReviewEntity)
    private readonly reviewRepo: Repository<RepairReviewEntity>,

    @InjectRepository(ApplianceEntity)
    private readonly applianceRepo: Repository<ApplianceEntity>,

    private readonly config: ConfigService,
  ) {}

  /* ══════════════════════ AGENTS ══════════════════════ */

  async createAgent(dto: CreateAgentDto): Promise<RepairAgentEntity> {
    const agent = this.agentRepo.create({ id: uuidv4(), ...dto });
    return this.agentRepo.save(agent);
  }

  async getAgentsByBusiness(businessId: string): Promise<RepairAgentEntity[]> {
    return this.agentRepo.find({
      where: [
        { business_id: businessId },
        { is_marketplace: true, is_active: true },
      ],
      order: { rating: 'DESC', total_jobs: 'DESC' },
    });
  }

  async getAgent(agentId: string): Promise<RepairAgentEntity> {
    const agent = await this.agentRepo.findOne({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async updateAgent(agentId: string, updates: Partial<CreateAgentDto>): Promise<RepairAgentEntity> {
    await this.agentRepo.update(agentId, updates as any);
    return this.getAgent(agentId);
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.agentRepo.update(agentId, { is_active: false });
  }

  /**
   * Find available agents matching city / zipcode for a given appliance category.
   * Falls back to marketplace agents if no company agents match.
   */
  async findNearbyAgents(
    businessId: string,
    city: string,
    zipcode?: string,
    category?: string,
  ): Promise<RepairAgentEntity[]> {
    const all = await this.agentRepo.find({
      where: [
        { business_id: businessId, is_active: true },
        { is_marketplace: true, is_active: true },
      ],
    });

    const normalise = (s: string) => s.toLowerCase().trim();
    const cityN = normalise(city);
    const zipN = zipcode ? normalise(zipcode) : null;

    const scored = all.map(agent => {
      let score = 0;
      const areas = (agent.service_areas ?? []).map(normalise);
      if (areas.some(a => a === cityN || (zipN && a === zipN))) score += 30;
      else if (areas.some(a => a.includes(cityN) || cityN.includes(a))) score += 15;
      if (category && agent.specializations) {
        const specs = agent.specializations.map(normalise);
        if (specs.some(s => s.includes(normalise(category)) || normalise(category).includes(s))) score += 20;
      }
      score += Number(agent.rating) * 5;
      return { agent, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.agent);
  }

  /* ══════════════════════ REQUESTS ══════════════════════ */

  async createRequest(dto: CreateRepairRequestDto): Promise<RepairRequestEntity> {
    const req = this.requestRepo.create({ id: uuidv4(), ...dto });
    const saved = await this.requestRepo.save(req);
    this.logger.log(`Repair request created: ${saved.id} for appliance ${dto.appliance_id}`);
    return saved;
  }

  async getRequest(requestId: string): Promise<RepairRequestEntity> {
    const req = await this.requestRepo.findOne({
      where: { id: requestId },
      relations: ['agent', 'appliance'],
    });
    if (!req) throw new NotFoundException('Repair request not found');
    return req;
  }

  async getRequestsByAppliance(applianceId: string): Promise<RepairRequestEntity[]> {
    return this.requestRepo.find({
      where: { appliance_id: applianceId },
      relations: ['agent'],
      order: { created_at: 'DESC' },
    });
  }

  async getRequestsByBusiness(businessId: string): Promise<RepairRequestEntity[]> {
    // join through appliances
    return this.requestRepo
      .createQueryBuilder('rr')
      .innerJoin('appliances', 'a', 'a.id = rr.appliance_id AND a.business_id = :bid', { bid: businessId })
      .leftJoinAndSelect('rr.agent', 'agent')
      .orderBy('rr.created_at', 'DESC')
      .getMany();
  }

  async assignAgent(requestId: string, dto: AssignAgentDto): Promise<RepairRequestEntity> {
    const updates: any = {
      agent_id: dto.agent_id,
      status: RepairStatus.ASSIGNED,
    };
    if (dto.scheduled_date) updates.scheduled_date = new Date(dto.scheduled_date);
    await this.requestRepo.update(requestId, updates);
    // increment agent's total_jobs
    await this.agentRepo.increment({ id: dto.agent_id }, 'total_jobs', 1);
    return this.getRequest(requestId);
  }

  async updateStatus(requestId: string, dto: UpdateRepairStatusDto): Promise<RepairRequestEntity> {
    const updates: any = { status: dto.status };
    if (dto.repair_cost !== undefined) updates.repair_cost = dto.repair_cost;
    if (dto.agent_notes) updates.agent_notes = dto.agent_notes;
    if (dto.internal_notes) updates.internal_notes = dto.internal_notes;
    if (dto.status === RepairStatus.COMPLETED) {
      updates.completed_date = dto.completed_date ? new Date(dto.completed_date) : new Date();
    }
    await this.requestRepo.update(requestId, updates);
    return this.getRequest(requestId);
  }

  async getRepairSummaryBySession(sessionId: string): Promise<RepairRequestEntity | null> {
    return this.requestRepo.findOne({
      where: { session_id: sessionId },
      relations: ['agent'],
      order: { created_at: 'DESC' },
    });
  }

  /* ══════════════════════ REVIEWS ══════════════════════ */

  async submitReview(dto: CreateRepairReviewDto): Promise<RepairReviewEntity> {
    const request = await this.requestRepo.findOne({ where: { id: dto.repair_request_id } });
    if (!request) throw new NotFoundException('Repair request not found');
    if (request.status !== RepairStatus.COMPLETED)
      throw new Error('Cannot review — repair not yet completed');

    const review = this.reviewRepo.create({
      id: uuidv4(),
      repair_request_id: dto.repair_request_id,
      agent_id: request.agent_id!,
      rating: dto.rating,
      comment: dto.comment,
      reviewer_name: dto.reviewer_name,
    });
    const saved = await this.reviewRepo.save(review);
    // Update agent's cached rating
    await this.recalcAgentRating(request.agent_id!);
    return saved;
  }

  async getReviewsByAgent(agentId: string): Promise<RepairReviewEntity[]> {
    return this.reviewRepo.find({
      where: { agent_id: agentId },
      order: { created_at: 'DESC' },
    });
  }

  private async recalcAgentRating(agentId: string): Promise<void> {
    const reviews = await this.reviewRepo.find({ where: { agent_id: agentId } });
    if (!reviews.length) return;
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await this.agentRepo.update(agentId, { rating: Math.round(avg * 100) / 100 });
  }

  /* ══════════════════════ ANALYTICS ══════════════════════ */

  async getRepairStats(businessId: string): Promise<any> {
    const all = await this.getRequestsByBusiness(businessId);
    const total = all.length;
    const byStatus = {
      pending: all.filter(r => r.status === RepairStatus.PENDING).length,
      assigned: all.filter(r => r.status === RepairStatus.ASSIGNED).length,
      in_progress: all.filter(r => r.status === RepairStatus.IN_PROGRESS).length,
      completed: all.filter(r => r.status === RepairStatus.COMPLETED).length,
      cancelled: all.filter(r => r.status === RepairStatus.CANCELLED).length,
    };
    const completed = all.filter(r => r.status === RepairStatus.COMPLETED && r.repair_cost);
    const totalRevenue = completed.reduce((s, r) => s + Number(r.repair_cost ?? 0), 0);
    const avgCost = completed.length ? totalRevenue / completed.length : 0;
    return { total, byStatus, totalRevenue, avgCost };
  }
}
