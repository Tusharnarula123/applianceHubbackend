import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { SparePartEntity } from '../../entities/spare-part.entity.js';
import { PartsOrderEntity, PartsOrderStatus, OrderLineItem } from '../../entities/parts-order.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';

export interface CreatePartDto {
  business_id: string;
  appliance_id?: string;
  name: string;
  part_number?: string;
  description?: string;
  compatible_models?: string;
  price: number;
  stock_quantity?: number;
  image_url?: string;
  category?: string;
  lead_time_days?: number;
}

export interface CreateOrderDto {
  appliance_id: string;
  session_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  items: OrderLineItem[];
}

@Injectable()
export class SparePartsService {
  private readonly logger = new Logger(SparePartsService.name);

  constructor(
    @InjectRepository(SparePartEntity)
    private readonly partRepo: Repository<SparePartEntity>,

    @InjectRepository(PartsOrderEntity)
    private readonly orderRepo: Repository<PartsOrderEntity>,

    @InjectRepository(ApplianceEntity)
    private readonly applianceRepo: Repository<ApplianceEntity>,
  ) {}

  /* ══════════════════════ PARTS CATALOG ══════════════════════ */

  async createPart(dto: CreatePartDto): Promise<SparePartEntity> {
    const part = this.partRepo.create({ id: uuidv4(), ...dto });
    return this.partRepo.save(part);
  }

  async getPartsByBusiness(businessId: string): Promise<SparePartEntity[]> {
    return this.partRepo.find({
      where: { business_id: businessId },
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async getPartsByAppliance(applianceId: string): Promise<SparePartEntity[]> {
    // Get business_id from appliance first
    const appliance = await this.applianceRepo.findOne({ where: { id: applianceId } });
    if (!appliance) return [];

    return this.partRepo
      .createQueryBuilder('p')
      .where('p.business_id = :bid', { bid: appliance.business_id })
      .andWhere('(p.appliance_id = :aid OR p.appliance_id IS NULL)', { aid: applianceId })
      .andWhere('p.is_available = 1')
      .orderBy('p.category', 'ASC')
      .addOrderBy('p.name', 'ASC')
      .getMany();
  }

  async getPart(partId: string): Promise<SparePartEntity> {
    const part = await this.partRepo.findOne({ where: { id: partId } });
    if (!part) throw new NotFoundException('Spare part not found');
    return part;
  }

  async updatePart(partId: string, updates: Partial<CreatePartDto>): Promise<SparePartEntity> {
    await this.partRepo.update(partId, updates as any);
    return this.getPart(partId);
  }

  async deletePart(partId: string): Promise<void> {
    await this.partRepo.update(partId, { is_available: false });
  }

  /**
   * AI-powered part suggestions based on appliance category + issue description.
   * Returns catalog parts when available; generates AI suggestions as fallback.
   */
  async suggestParts(applianceId: string, issueDescription: string): Promise<any[]> {
    const catalogParts = await this.getPartsByAppliance(applianceId);
    if (catalogParts.length > 0) {
      // Filter parts relevant to the issue (simple keyword match)
      const issueLower = issueDescription.toLowerCase();
      const relevant = catalogParts.filter(p => {
        const text = `${p.name} ${p.description ?? ''} ${p.category ?? ''}`.toLowerCase();
        return issueLower.split(' ').some(word => word.length > 3 && text.includes(word));
      });
      return (relevant.length > 0 ? relevant : catalogParts.slice(0, 6)).map(p => ({
        id: p.id,
        name: p.name,
        part_number: p.part_number,
        price: Number(p.price),
        description: p.description,
        is_available: p.is_available,
        lead_time_days: p.lead_time_days,
        source: 'catalog',
      }));
    }

    // Fallback: return generic AI-suggested parts based on common appliance issues
    const appliance = await this.applianceRepo.findOne({ where: { id: applianceId } });
    return this.generateAiPartSuggestions(appliance?.category ?? 'appliance', issueDescription);
  }

  private generateAiPartSuggestions(category: string, issue: string): any[] {
    const cat = category.toLowerCase();
    const iss = issue.toLowerCase();
    const suggestions: any[] = [];

    if (cat.includes('wash') || cat.includes('laundry')) {
      if (iss.includes('leak') || iss.includes('water')) {
        suggestions.push(
          { id: 'ai-1', name: 'Door Seal / Gasket', price: 45, source: 'ai_suggestion' },
          { id: 'ai-2', name: 'Water Inlet Valve', price: 35, source: 'ai_suggestion' },
          { id: 'ai-3', name: 'Drain Pump', price: 55, source: 'ai_suggestion' },
        );
      } else if (iss.includes('spin') || iss.includes('drum')) {
        suggestions.push(
          { id: 'ai-1', name: 'Drive Belt', price: 20, source: 'ai_suggestion' },
          { id: 'ai-2', name: 'Motor Coupling', price: 18, source: 'ai_suggestion' },
        );
      }
    } else if (cat.includes('fridge') || cat.includes('refriger')) {
      suggestions.push(
        { id: 'ai-1', name: 'Compressor Start Relay', price: 25, source: 'ai_suggestion' },
        { id: 'ai-2', name: 'Door Gasket', price: 40, source: 'ai_suggestion' },
        { id: 'ai-3', name: 'Thermostat', price: 30, source: 'ai_suggestion' },
      );
    } else if (cat.includes('ac') || cat.includes('air')) {
      suggestions.push(
        { id: 'ai-1', name: 'Air Filter', price: 15, source: 'ai_suggestion' },
        { id: 'ai-2', name: 'Capacitor', price: 22, source: 'ai_suggestion' },
        { id: 'ai-3', name: 'Fan Motor', price: 75, source: 'ai_suggestion' },
      );
    } else {
      suggestions.push(
        { id: 'ai-1', name: 'Control Board', price: 120, source: 'ai_suggestion' },
        { id: 'ai-2', name: 'Power Switch', price: 18, source: 'ai_suggestion' },
        { id: 'ai-3', name: 'Heating Element', price: 45, source: 'ai_suggestion' },
      );
    }

    return suggestions.map(s => ({
      ...s,
      description: `Commonly required for ${category} repairs. Price is an estimate — contact support for confirmation.`,
      is_available: true,
      lead_time_days: 3,
    }));
  }

  /* ══════════════════════ ORDERS ══════════════════════ */

  async createOrder(dto: CreateOrderDto): Promise<PartsOrderEntity> {
    const total = dto.items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const order = this.orderRepo.create({
      id: uuidv4(),
      ...dto,
      total_amount: total,
    });
    const saved = await this.orderRepo.save(order);
    this.logger.log(`Parts order ${saved.id} created — total $${total.toFixed(2)}`);
    // Decrement stock for catalog parts
    for (const item of dto.items) {
      if (!item.part_id.startsWith('ai-')) {
        await this.partRepo.decrement({ id: item.part_id }, 'stock_quantity', item.quantity);
      }
    }
    return saved;
  }

  async getOrder(orderId: string): Promise<PartsOrderEntity> {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async getOrdersByBusiness(businessId: string): Promise<PartsOrderEntity[]> {
    return this.orderRepo
      .createQueryBuilder('po')
      .innerJoin('appliances', 'a', 'a.id = po.appliance_id AND a.business_id = :bid', { bid: businessId })
      .orderBy('po.created_at', 'DESC')
      .getMany();
  }

  async getOrdersByAppliance(applianceId: string): Promise<PartsOrderEntity[]> {
    return this.orderRepo.find({
      where: { appliance_id: applianceId },
      order: { created_at: 'DESC' },
    });
  }

  async updateOrderStatus(
    orderId: string,
    status: PartsOrderStatus,
    tracking_number?: string,
  ): Promise<PartsOrderEntity> {
    const updates: any = { status };
    if (tracking_number) updates.tracking_number = tracking_number;
    await this.orderRepo.update(orderId, updates);
    return this.getOrder(orderId);
  }

  async getOrderBySession(sessionId: string): Promise<PartsOrderEntity | null> {
    return this.orderRepo.findOne({
      where: { session_id: sessionId },
      order: { created_at: 'DESC' },
    });
  }
}
