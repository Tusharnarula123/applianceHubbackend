import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { SupportCaseEntity, SupportCaseOutcome } from '../../entities/support-case.entity.js';
import { KnowledgeGapEntity } from '../../entities/knowledge-gap.entity.js';
import { MaintenanceTaskEntity } from '../../entities/maintenance-task.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { DocumentKnowledgeEntity } from '../../entities/document-knowledge.entity.js';

export type CaseInput = {
  appliance_id: string;
  session_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  category?: string;
  symptoms?: string | null;
  error_codes?: string[] | null;
  steps_tried?: string[] | null;
  likely_causes?: string[] | null;
  safety_flag?: string | null;
  summary?: string | null;
  outcome?: SupportCaseOutcome;
};

export type MaintenanceItem = {
  id: string;
  title: string;
  frequency: string;
  interval_days: number | null;
  details: string | null;
  source: 'manual' | 'custom';
  pages?: number[];
};

const CASE_CATEGORIES = ['troubleshooting', 'warranty', 'repair', 'setup', 'other'];
const SAFETY_FLAGS = ['gas', 'electrical', 'water_electrical', 'fire_heat', 'refrigerant', 'other'];

/** Best-effort conversion of "every 3 months" / "weekly" into days, for sorting. */
export function frequencyToDays(frequency: string): number | null {
  const f = frequency.toLowerCase();
  if (/daily|every day|after each use|after every use/.test(f)) return 1;
  if (/weekly|every week/.test(f)) return 7;
  if (/monthly|every month/.test(f)) return 30;
  if (/quarter/.test(f)) return 90;
  if (/annual|yearly|every year/.test(f)) return 365;
  const m = f.match(/(\d+)\s*(day|week|month|year)/);
  if (!m) return null;
  const n = Number(m[1]);
  return n * ({ day: 1, week: 7, month: 30, year: 365 } as Record<string, number>)[m[2]];
}

@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);

  constructor(
    @InjectRepository(SupportCaseEntity) private caseRepo: Repository<SupportCaseEntity>,
    @InjectRepository(KnowledgeGapEntity) private gapRepo: Repository<KnowledgeGapEntity>,
    @InjectRepository(MaintenanceTaskEntity) private taskRepo: Repository<MaintenanceTaskEntity>,
    @InjectRepository(ApplianceEntity) private applianceRepo: Repository<ApplianceEntity>,
    @InjectRepository(DocumentKnowledgeEntity) private knowledgeRepo: Repository<DocumentKnowledgeEntity>,
  ) {}

  // ── Support cases ─────────────────────────────────────────────────────────

  /**
   * How much of what a support agent needs is in the case (0–100).
   * Mirrors the roadmap's "case completeness" metric.
   */
  computeCompleteness(c: Partial<SupportCaseEntity>): number {
    const checks = [
      Boolean(c.symptoms && c.symptoms.trim().length >= 15), // a real description
      Boolean(c.customer_email || c.customer_phone),           // a way to reach them
      Boolean(c.customer_name),
      Boolean(c.steps_tried && c.steps_tried.length > 0),       // what was already tried
      Boolean(c.error_codes && c.error_codes.length > 0) || /no error|no code/i.test(c.symptoms ?? ''),
      Boolean(c.summary && c.summary.trim().length > 0),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  private clean(input: CaseInput): Partial<SupportCaseEntity> {
    const list = (v?: string[] | null) =>
      Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean).slice(0, 20) : null;
    return {
      session_id: input.session_id ?? null,
      customer_name: input.customer_name?.trim() || null,
      customer_email: input.customer_email?.trim() || null,
      customer_phone: input.customer_phone?.trim() || null,
      category: CASE_CATEGORIES.includes(input.category ?? '') ? input.category! : 'troubleshooting',
      symptoms: input.symptoms?.trim() || null,
      error_codes: list(input.error_codes),
      steps_tried: list(input.steps_tried),
      likely_causes: list(input.likely_causes),
      safety_flag: SAFETY_FLAGS.includes(input.safety_flag ?? '') ? input.safety_flag! : null,
      summary: input.summary?.trim() || null,
    };
  }

  /**
   * Create a case, or update the open one already attached to this chat
   * session so a single conversation never produces duplicate tickets.
   */
  async upsertCase(input: CaseInput): Promise<SupportCaseEntity> {
    const appliance = await this.applianceRepo.findOne({ where: { id: input.appliance_id } });
    if (!appliance) throw new NotFoundException('Appliance not found');

    const fields = this.clean(input);
    const existing = input.session_id
      ? await this.caseRepo.findOne({
          where: { session_id: input.session_id, appliance_id: input.appliance_id },
          order: { created_at: 'DESC' },
        })
      : null;

    const merged: Partial<SupportCaseEntity> = existing
      ? {
          ...existing,
          ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null && v !== undefined)),
        }
      : { id: uuidv4(), appliance_id: input.appliance_id, business_id: appliance.business_id, ...fields };

    if (input.outcome) merged.outcome = input.outcome;
    else if (merged.safety_flag) merged.outcome = SupportCaseOutcome.ESCALATED;
    merged.completeness = this.computeCompleteness(merged);

    return this.caseRepo.save(this.caseRepo.create(merged));
  }

  /** Customer answered "Did this fix it?" at the end of an AI answer. */
  async recordOutcome(
    applianceId: string,
    sessionId: string,
    resolved: boolean,
    lastQuestion?: string,
  ): Promise<SupportCaseEntity> {
    const existing = await this.caseRepo.findOne({
      where: { session_id: sessionId, appliance_id: applianceId },
      order: { created_at: 'DESC' },
    });
    if (resolved) {
      // A confirmed fix closes any open case from this conversation.
      return this.upsertCase({
        appliance_id: applianceId,
        session_id: sessionId,
        symptoms: existing?.symptoms ?? lastQuestion ?? null,
        outcome: SupportCaseOutcome.RESOLVED_BY_AI,
      });
    }
    return this.upsertCase({
      appliance_id: applianceId,
      session_id: sessionId,
      symptoms: existing?.symptoms ?? lastQuestion ?? null,
      outcome: existing?.outcome === SupportCaseOutcome.ESCALATED ? SupportCaseOutcome.ESCALATED : SupportCaseOutcome.OPEN,
    });
  }

  async listCases(businessId: string, filters: { outcome?: string; appliance_id?: string; limit?: number } = {}) {
    const where: Record<string, unknown> = { business_id: businessId };
    if (filters.outcome && Object.values(SupportCaseOutcome).includes(filters.outcome as SupportCaseOutcome)) {
      where.outcome = filters.outcome;
    }
    if (filters.appliance_id) where.appliance_id = filters.appliance_id;
    const rows = await this.caseRepo.find({
      where,
      order: { created_at: 'DESC' },
      take: Math.min(Number(filters.limit) || 200, 500),
    });
    const names = await this.applianceNames(rows.map((r) => r.appliance_id));
    return rows.map((r) => ({ ...r, appliance_name: names.get(r.appliance_id) ?? null }));
  }

  async updateCase(id: string, patch: { outcome?: string; resolution_note?: string }) {
    const row = await this.caseRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Case not found');
    if (patch.outcome && Object.values(SupportCaseOutcome).includes(patch.outcome as SupportCaseOutcome)) {
      row.outcome = patch.outcome as SupportCaseOutcome;
    }
    if (patch.resolution_note !== undefined) row.resolution_note = patch.resolution_note || null;
    return this.caseRepo.save(row);
  }

  // ── Outcome metrics (roadmap §6) ──────────────────────────────────────────

  async metrics(businessId: string, days = 30) {
    const since = new Date(Date.now() - days * 86_400_000);
    const cases = await this.caseRepo.find({
      where: { business_id: businessId, created_at: MoreThanOrEqual(since) },
    });
    const count = (o: SupportCaseOutcome) => cases.filter((c) => c.outcome === o).length;
    const resolvedByAi = count(SupportCaseOutcome.RESOLVED_BY_AI);
    const escalated = count(SupportCaseOutcome.ESCALATED);
    const open = count(SupportCaseOutcome.OPEN);
    const closed = count(SupportCaseOutcome.CLOSED);
    const needingPeople = cases.filter((c) => c.outcome !== SupportCaseOutcome.RESOLVED_BY_AI);

    const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : null);

    // Daily series for the chart
    const daily: { date: string; resolved: number; escalated: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      daily.push({ date: d, resolved: 0, escalated: 0 });
    }
    const byDate = new Map(daily.map((d) => [d.date, d]));
    for (const c of cases) {
      const bucket = byDate.get(new Date(c.created_at).toISOString().slice(0, 10));
      if (!bucket) continue;
      if (c.outcome === SupportCaseOutcome.RESOLVED_BY_AI) bucket.resolved++;
      else bucket.escalated++;
    }

    const safety = cases.filter((c) => c.safety_flag).length;
    return {
      period_days: days,
      total_journeys: cases.length,
      resolved_by_ai: resolvedByAi,
      escalated,
      open,
      closed,
      safety_stops: safety,
      /** Share of journeys the customer confirmed were fixed without a person */
      verified_resolution_rate: pct(resolvedByAi, cases.length),
      escalation_rate: pct(escalated + open + closed, cases.length),
      avg_case_completeness: needingPeople.length
        ? Math.round(needingPeople.reduce((n, c) => n + c.completeness, 0) / needingPeople.length)
        : null,
      daily,
    };
  }

  // ── Knowledge gaps (roadmap module I) ─────────────────────────────────────

  private normalize(q: string) {
    return q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 255);
  }

  /** Called by the chatbot when nothing in the manuals matched the question. */
  async logGap(applianceId: string, businessId: string | null, question: string) {
    const normalized = this.normalize(question);
    if (normalized.length < 8) return; // "hi", "thanks", etc.
    try {
      const existing = await this.gapRepo.findOne({ where: { appliance_id: applianceId, normalized } });
      if (existing) {
        existing.times_asked += 1;
        await this.gapRepo.save(existing);
        return;
      }
      await this.gapRepo.save(
        this.gapRepo.create({
          id: uuidv4(),
          appliance_id: applianceId,
          business_id: businessId,
          question: question.trim().slice(0, 2000),
          normalized,
        }),
      );
    } catch (err) {
      this.logger.warn(`Could not log knowledge gap: ${err}`);
    }
  }

  async listGaps(businessId: string, applianceId?: string) {
    const where: Record<string, unknown> = { business_id: businessId, dismissed: false };
    if (applianceId) where.appliance_id = applianceId;
    const rows = await this.gapRepo.find({ where, order: { times_asked: 'DESC', updated_at: 'DESC' }, take: 100 });
    const names = await this.applianceNames(rows.map((r) => r.appliance_id));
    return rows.map((r) => ({ ...r, appliance_name: names.get(r.appliance_id) ?? null }));
  }

  async dismissGap(id: string) {
    const row = await this.gapRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Gap not found');
    row.dismissed = true;
    return this.gapRepo.save(row);
  }

  // ── Maintenance (roadmap module F) ────────────────────────────────────────

  /** Manual-verified maintenance items first, then tasks the business added. */
  async getMaintenance(applianceId: string): Promise<MaintenanceItem[]> {
    const knowledge = await this.knowledgeRepo.find({ where: { appliance_id: applianceId, status: 'ready' } });
    const fromManual: MaintenanceItem[] = knowledge.flatMap((k) =>
      (k.items ?? [])
        .filter((i: any) => i.type === 'maintenance' && i.verification?.status !== 'unverified' && i.data?.task)
        .map((i: any, idx: number) => ({
          id: `manual-${k.document_id}-${idx}`,
          title: String(i.data.task),
          frequency: String(i.data.frequency ?? 'As needed'),
          interval_days: frequencyToDays(String(i.data.frequency ?? '')),
          details: null,
          source: 'manual' as const,
          pages: i.pages ?? [],
        })),
    );
    const custom = await this.taskRepo.find({ where: { appliance_id: applianceId }, order: { created_at: 'ASC' } });
    const all = [
      ...fromManual,
      ...custom.map((t) => ({ ...t, source: 'custom' as const })),
    ];
    return all.sort((a, b) => (a.interval_days ?? 9999) - (b.interval_days ?? 9999));
  }

  async addMaintenanceTask(applianceId: string, body: { title: string; frequency: string; details?: string }) {
    const appliance = await this.applianceRepo.findOne({ where: { id: applianceId } });
    if (!appliance) throw new NotFoundException('Appliance not found');
    return this.taskRepo.save(
      this.taskRepo.create({
        id: uuidv4(),
        appliance_id: applianceId,
        title: body.title.trim().slice(0, 255),
        frequency: body.frequency.trim().slice(0, 100),
        interval_days: frequencyToDays(body.frequency),
        details: body.details?.trim() || null,
      }),
    );
  }

  async deleteMaintenanceTask(id: string) {
    await this.taskRepo.delete({ id });
    return { deleted: true };
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  private async applianceNames(ids: string[]) {
    const unique = [...new Set(ids)];
    if (!unique.length) return new Map<string, string>();
    const rows = await this.applianceRepo.find({ where: { id: In(unique) }, select: ['id', 'name'] });
    return new Map(rows.map((r) => [r.id, r.name]));
  }
}
