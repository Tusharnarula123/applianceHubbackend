import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { RecallNoticeEntity } from '../../entities/recall-notice.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { SparePartEntity } from '../../entities/spare-part.entity.js';

export type RecallInput = {
  business_id: string;
  appliance_id?: string | null;
  title: string;
  description: string;
  remedy: string;
  affected_models?: string[] | null;
  serial_from?: string | null;
  serial_to?: string | null;
  severity?: string;
  official_url?: string | null;
  is_active?: boolean;
};

/** "WF45T-6000AW", "wf45t6000aw " → "WF45T6000AW" */
export function normalizeModel(model: string): string {
  return model.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Recall notices (module K) and part compatibility (module E).
 * Both match conservatively: exact normalised model numbers only, never fuzzy.
 */
@Injectable()
export class RecallsService {
  constructor(
    @InjectRepository(RecallNoticeEntity) private recallRepo: Repository<RecallNoticeEntity>,
    @InjectRepository(ApplianceEntity) private applianceRepo: Repository<ApplianceEntity>,
    @InjectRepository(SparePartEntity) private partRepo: Repository<SparePartEntity>,
  ) {}

  // ── Recall notices ────────────────────────────────────────────────────────

  private clean(input: Partial<RecallInput>): Partial<RecallNoticeEntity> {
    const out: Partial<RecallNoticeEntity> = {};
    if (input.appliance_id !== undefined) out.appliance_id = input.appliance_id || null;
    if (input.title !== undefined) out.title = input.title.trim().slice(0, 255);
    if (input.description !== undefined) out.description = input.description.trim();
    if (input.remedy !== undefined) out.remedy = input.remedy.trim();
    if (input.affected_models !== undefined) {
      out.affected_models = (input.affected_models ?? []).map((m) => m.trim()).filter(Boolean);
    }
    if (input.serial_from !== undefined) out.serial_from = input.serial_from?.trim() || null;
    if (input.serial_to !== undefined) out.serial_to = input.serial_to?.trim() || null;
    if (input.severity !== undefined) out.severity = input.severity === 'quality' ? 'quality' : 'safety';
    if (input.official_url !== undefined) out.official_url = input.official_url?.trim() || null;
    if (input.is_active !== undefined) out.is_active = Boolean(input.is_active);
    return out;
  }

  list(businessId: string) {
    return this.recallRepo.find({ where: { business_id: businessId }, order: { created_at: 'DESC' } });
  }

  create(input: RecallInput) {
    return this.recallRepo.save(
      this.recallRepo.create({ id: uuidv4(), business_id: input.business_id, is_active: true, ...this.clean(input) }),
    );
  }

  async update(id: string, patch: Partial<RecallInput>) {
    const row = await this.recallRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Recall notice not found');
    Object.assign(row, this.clean(patch));
    return this.recallRepo.save(row);
  }

  async remove(id: string) {
    await this.recallRepo.delete({ id });
    return { deleted: true };
  }

  private serialInRange(serial: string, from: string | null, to: string | null): boolean {
    const s = serial.trim().toUpperCase();
    if (from && s.length === from.length && s < from.toUpperCase()) return false;
    if (to && s.length === to.length && s > to.toUpperCase()) return false;
    // Different lengths can't be compared safely — treat as "possibly affected"
    return true;
  }

  /**
   * Active notices that apply to an appliance. With a serial number, notices
   * limited to a serial range are filtered; `serial_checked` tells the caller
   * whether the result is definitive.
   */
  async activeFor(applianceId: string, serial?: string | null) {
    const appliance = await this.applianceRepo.findOne({ where: { id: applianceId } });
    if (!appliance) throw new NotFoundException('Appliance not found');
    const all = await this.recallRepo.find({ where: { business_id: appliance.business_id, is_active: true } });
    const model = appliance.model ? normalizeModel(appliance.model) : null;

    const matching = all.filter((r) => {
      const byAppliance = r.appliance_id === applianceId;
      const byModel = !!model && (r.affected_models ?? []).some((m) => normalizeModel(m) === model);
      if (!byAppliance && !byModel) return false;
      if (serial && (r.serial_from || r.serial_to)) return this.serialInRange(serial, r.serial_from, r.serial_to);
      return true;
    });

    return matching.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      remedy: r.remedy,
      severity: r.severity,
      official_url: r.official_url,
      limited_to_serials: Boolean(r.serial_from || r.serial_to),
      serial_checked: Boolean(serial),
    }));
  }

  // ── Part compatibility (module E) ─────────────────────────────────────────

  /**
   * Parts from the brand's catalog whose compatible_models list contains the
   * given model (exact match after normalising). Optionally narrowed by a
   * part name / number search.
   */
  async compatibleParts(businessId: string, model: string, query?: string) {
    const target = normalizeModel(model);
    if (!target) return { model, exact: [], unverified: [] };
    const parts = await this.partRepo.find({ where: { business_id: businessId } });
    const q = query?.trim().toLowerCase();
    const matchesQuery = (p: SparePartEntity) =>
      !q || [p.name, p.part_number, p.category, p.description].some((v) => v?.toLowerCase().includes(q));

    const listed = (p: SparePartEntity) =>
      (p.compatible_models ?? '').split(/[,;\n]/).map(normalizeModel).filter(Boolean);

    const shape = (p: SparePartEntity) => ({
      id: p.id,
      name: p.name,
      part_number: p.part_number,
      price: Number(p.price),
      in_stock: Number(p.stock_quantity) > 0,
      is_available: p.is_available,
      lead_time_days: p.lead_time_days,
    });

    const relevant = parts.filter(matchesQuery);
    return {
      model,
      /** compatible_models explicitly lists this model */
      exact: relevant.filter((p) => listed(p).includes(target)).map(shape),
      /** parts with no compatibility data at all — fit cannot be confirmed */
      unverified: relevant.filter((p) => listed(p).length === 0).map(shape),
    };
  }
}
