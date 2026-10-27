import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import OpenAI from 'openai';

import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { ClaimEntity } from '../../entities/claim.entity.js';
import { RepairRequestEntity } from '../../entities/repair-request.entity.js';
import { SupportCaseEntity } from '../../entities/support-case.entity.js';
import { WarrantyRegistrationEntity } from '../../entities/warranty-registration.entity.js';
import { SparePartEntity } from '../../entities/spare-part.entity.js';
import { RagService } from '../chat/rag.service.js';
import { CasesService } from '../cases/cases.service.js';
import { RecallsService } from '../cases/recalls.service.js';
import { resolveAiConfig, type AiConfig } from '../../common/ai-config.js';

/**
 * Plain-language fault themes. Kept as a fixed list so results are explainable
 * ("matched the words 'leak' or 'dripping'") rather than an opaque model guess.
 */
const FAULT_THEMES: Array<{ key: string; label: string; words: RegExp }> = [
  { key: 'leak',        label: 'Leaking water',        words: /\b(leak|leaking|dripping|puddle|water on (the )?floor)\b/i },
  { key: 'no_drain',    label: 'Not draining',         words: /\b(not drain|won'?t drain|doesn'?t drain|standing water|drain)\b/i },
  { key: 'noise',       label: 'Noise or vibration',   words: /\b(noise|noisy|loud|rattl|grind|squeal|vibrat|shak|bang)\w*/i },
  { key: 'no_power',    label: "Won't turn on",        words: /\b(won'?t (turn|switch|start|power)|no power|dead|not turning on|doesn'?t start)\b/i },
  { key: 'no_cool',     label: 'Not cooling',          words: /\b(not cool|warm|no cooling|not cold|temperature)\w*/i },
  { key: 'no_heat',     label: 'Not heating',          words: /\b(not heat|no heat|cold water|lukewarm|won'?t heat)\w*/i },
  { key: 'ice',         label: 'Ice / frost problems', words: /\b(ice maker|ice|frost|freez)\w*/i },
  { key: 'door',        label: 'Door, seal or lid',    words: /\b(door|seal|gasket|lid|latch|hinge)\b/i },
  { key: 'smell',       label: 'Smell',                words: /\b(smell|odou?r|stink)\w*/i },
  { key: 'controls',    label: 'Controls or display',  words: /\b(display|panel|button|touch|screen|control)\w*/i },
  { key: 'spin',        label: 'Drum or spin',         words: /\b(spin|drum|agitat)\w*/i },
  { key: 'burning',     label: 'Burning / electrical', words: /\b(burn|smoke|spark|tripp|shock|scorch)\w*/i },
];

type FaultSignal = { appliance_id: string; text: string; codes: string[]; at: Date; source: 'claim' | 'repair' | 'case' };

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);
  private readonly ai: AiConfig;
  private readonly openai: OpenAI;

  constructor(
    @InjectRepository(ApplianceEntity) private applianceRepo: Repository<ApplianceEntity>,
    @InjectRepository(ClaimEntity) private claimRepo: Repository<ClaimEntity>,
    @InjectRepository(RepairRequestEntity) private repairRepo: Repository<RepairRequestEntity>,
    @InjectRepository(SupportCaseEntity) private caseRepo: Repository<SupportCaseEntity>,
    @InjectRepository(WarrantyRegistrationEntity) private warrantyRepo: Repository<WarrantyRegistrationEntity>,
    @InjectRepository(SparePartEntity) private partRepo: Repository<SparePartEntity>,
    private ragService: RagService,
    private casesService: CasesService,
    private recallsService: RecallsService,
    configService: ConfigService,
  ) {
    this.ai = resolveAiConfig(configService);
    this.openai = new OpenAI({ apiKey: this.ai.apiKey || 'not-configured', baseURL: this.ai.baseURL });
  }

  // ── Q. Recurring fault intelligence ───────────────────────────────────────

  private async signals(businessId: string, since: Date): Promise<{ appliances: ApplianceEntity[]; signals: FaultSignal[] }> {
    const appliances = await this.applianceRepo.find({ where: { business_id: businessId } });
    const ids = appliances.map((a) => a.id);
    if (!ids.length) return { appliances, signals: [] };

    const [claims, repairs, cases] = await Promise.all([
      this.claimRepo.find({ where: { appliance_id: In(ids), filed_at: MoreThanOrEqual(since) } }),
      this.repairRepo.find({ where: { appliance_id: In(ids), created_at: MoreThanOrEqual(since) } }),
      this.caseRepo.find({ where: { appliance_id: In(ids), created_at: MoreThanOrEqual(since) } }),
    ]);

    const codeIn = (t: string) => (t.match(/\b([A-Z]{1,3}[- ]?\d{1,3}[A-Z]?|\d[A-Z]{1,2})\b/g) ?? []).map((c) => c.replace(/[- ]/g, ''));
    return {
      appliances,
      signals: [
        ...claims.map((c) => ({ appliance_id: c.appliance_id, text: c.issue ?? '', codes: codeIn(c.issue ?? ''), at: c.filed_at, source: 'claim' as const })),
        ...repairs.map((r) => ({ appliance_id: r.appliance_id, text: r.issue_description ?? '', codes: codeIn(r.issue_description ?? ''), at: r.created_at, source: 'repair' as const })),
        ...cases.map((c) => ({
          appliance_id: c.appliance_id,
          text: `${c.symptoms ?? ''} ${c.summary ?? ''}`,
          codes: (c.error_codes ?? []).map((e) => e.toUpperCase().replace(/[- ]/g, '')),
          at: c.created_at,
          source: 'case' as const,
        })),
      ],
    };
  }

  /**
   * Recurring problems by product: fault themes and error codes, with the
   * change versus the previous period of the same length.
   */
  async recurringFaults(businessId: string, days = 90) {
    const now = Date.now();
    const since = new Date(now - days * 86_400_000);
    const prevSince = new Date(now - 2 * days * 86_400_000);
    const { appliances, signals } = await this.signals(businessId, prevSince);
    const nameOf = new Map(appliances.map((a) => [a.id, a.name]));

    type Bucket = { appliance_id: string; appliance_name: string; kind: 'theme' | 'error_code'; key: string; label: string;
      count: number; previous: number; sources: Record<string, number>; examples: string[] };
    const buckets = new Map<string, Bucket>();
    const bump = (s: FaultSignal, kind: Bucket['kind'], key: string, label: string) => {
      const id = `${s.appliance_id}|${kind}|${key}`;
      const b = buckets.get(id) ?? {
        appliance_id: s.appliance_id, appliance_name: nameOf.get(s.appliance_id) ?? 'Product',
        kind, key, label, count: 0, previous: 0, sources: {}, examples: [],
      };
      if (s.at >= since) {
        b.count++;
        b.sources[s.source] = (b.sources[s.source] ?? 0) + 1;
        if (b.examples.length < 3 && s.text.trim()) b.examples.push(s.text.trim().slice(0, 160));
      } else {
        b.previous++;
      }
      buckets.set(id, b);
    };

    for (const s of signals) {
      for (const t of FAULT_THEMES) if (t.words.test(s.text)) bump(s, 'theme', t.key, t.label);
      for (const c of new Set(s.codes)) bump(s, 'error_code', c, `Error ${c}`);
    }

    const faults = [...buckets.values()]
      .filter((b) => b.count >= 2) // one report is an anecdote, not a pattern
      .map((b) => ({ ...b, change: b.previous ? Math.round(((b.count - b.previous) / b.previous) * 100) : null }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    return {
      period_days: days,
      reports_analysed: signals.filter((s) => s.at >= since).length,
      faults,
      note: 'Grouped by keywords and error codes found in claims, repair jobs and support cases. Patterns are indicators, not confirmed root causes.',
    };
  }

  // ── G. Product record ─────────────────────────────────────────────────────

  /**
   * Everything known about one physical unit or one customer: registrations,
   * claims, repairs, support cases, active recalls and maintenance — as a
   * single timeline. Records are labelled with their source; missing history
   * is shown as missing, never as "clean".
   */
  async productRecord(businessId: string, query: { serial?: string; email?: string }) {
    const serial = query.serial?.trim();
    const email = query.email?.trim().toLowerCase();
    if (!serial && !email) return { units: [], message: 'Search by serial number or customer email.' };

    const appliances = await this.applianceRepo.find({ where: { business_id: businessId } });
    const ids = appliances.map((a) => a.id);
    if (!ids.length) return { units: [] };
    const byId = new Map(appliances.map((a) => [a.id, a]));

    const allRegs = await this.warrantyRepo.find({ where: { appliance_id: In(ids) }, order: { created_at: 'ASC' } });
    const regs = allRegs.filter((r) =>
      (serial && r.serial_number?.trim().toUpperCase() === serial.toUpperCase()) ||
      (email && r.customer_email?.toLowerCase() === email),
    );

    const emails = new Set([...(email ? [email] : []), ...regs.map((r) => r.customer_email?.toLowerCase()).filter(Boolean) as string[]]);
    const applianceIds = [...new Set(regs.map((r) => r.appliance_id))];
    const emailList = [...emails];

    const [claims, repairs, cases] = emailList.length
      ? await Promise.all([
          this.claimRepo.find({ where: { appliance_id: In(ids) } }),
          this.repairRepo.find({ where: { appliance_id: In(ids) } }),
          this.caseRepo.find({ where: { appliance_id: In(ids) } }),
        ])
      : [[], [], []];
    const mine = <T extends { customer_email?: string | null }>(rows: T[]) =>
      rows.filter((r) => r.customer_email && emails.has(r.customer_email.toLowerCase()));

    // Group by appliance (a unit = one product line this customer/serial owns)
    const unitIds = new Set<string>([
      ...applianceIds,
      ...mine(claims).map((c) => c.appliance_id),
      ...mine(repairs).map((r) => r.appliance_id),
      ...mine(cases).map((c) => c.appliance_id),
    ]);

    const units = await Promise.all([...unitIds].map(async (applianceId) => {
      const a = byId.get(applianceId);
      const reg = regs.find((r) => r.appliance_id === applianceId) ?? null;
      const events: Array<{ at: Date; type: string; title: string; detail?: string | null; status?: string | null; source: string }> = [];
      if (reg) {
        events.push({ at: new Date(reg.purchase_date ?? reg.created_at), type: 'purchase', title: 'Purchased', detail: reg.serial_number ? `Serial ${reg.serial_number}` : null, source: 'Warranty registration (customer-provided)' });
        events.push({ at: new Date(reg.created_at), type: 'warranty', title: 'Warranty registered', detail: reg.expiry_date ? `Covered until ${new Date(reg.expiry_date).toDateString()}` : null, status: reg.status, source: 'Scana' });
      }
      for (const c of mine(claims).filter((x) => x.appliance_id === applianceId)) {
        events.push({ at: new Date(c.filed_at), type: 'claim', title: 'Warranty claim', detail: c.issue, status: c.status, source: 'Scana' });
      }
      for (const r of mine(repairs).filter((x) => x.appliance_id === applianceId)) {
        events.push({ at: new Date(r.created_at), type: 'repair', title: 'Technician visit', detail: r.issue_description, status: r.status, source: 'Scana' });
        if (r.completed_date) events.push({ at: new Date(r.completed_date), type: 'repair_done', title: 'Repair completed', detail: r.agent_notes ?? null, source: 'Technician' });
      }
      for (const c of mine(cases).filter((x) => x.appliance_id === applianceId)) {
        events.push({ at: new Date(c.created_at), type: 'case', title: c.outcome === 'resolved_by_ai' ? 'Fixed with AI guidance' : 'Support case', detail: c.summary ?? c.symptoms, status: c.outcome, source: 'AI chat' });
      }
      events.sort((x, y) => x.at.getTime() - y.at.getTime());

      const [recalls, maintenance] = await Promise.all([
        this.recallsService.activeFor(applianceId, reg?.serial_number ?? null).catch(() => []),
        this.casesService.getMaintenance(applianceId).catch(() => []),
      ]);

      const warrantyActive = reg?.expiry_date ? new Date(reg.expiry_date) > new Date() : null;
      return {
        appliance_id: applianceId,
        appliance_name: a?.name ?? 'Product',
        model: a?.model ?? null,
        category: a?.category ?? null,
        image_url: a?.image_url ?? null,
        color: a?.color ?? null,
        serial_number: reg?.serial_number ?? null,
        owner: reg ? { name: reg.customer_name, email: reg.customer_email } : null,
        warranty: reg ? { status: reg.status, expires: reg.expiry_date, active: warrantyActive } : null,
        recalls,
        maintenance: maintenance.slice(0, 6),
        events,
        gaps: [
          !reg ? 'No warranty registration — purchase date and serial are unknown' : null,
          reg && !reg.serial_number ? 'Serial number not recorded' : null,
          !events.some((e) => e.type === 'repair' || e.type === 'claim') ? 'No service history recorded in Scana (repairs elsewhere are not visible)' : null,
        ].filter(Boolean),
      };
    }));

    return { units };
  }

  // ── J. Technician brief ───────────────────────────────────────────────────

  async technicianBrief(repairRequestId: string) {
    const req = await this.repairRepo.findOne({ where: { id: repairRequestId } });
    if (!req) throw new NotFoundException('Repair request not found');
    const appliance = await this.applianceRepo.findOne({ where: { id: req.appliance_id } });

    const supportCase = req.session_id
      ? await this.caseRepo.findOne({ where: { session_id: req.session_id }, order: { created_at: 'DESC' } })
      : null;

    const query = [req.issue_description, supportCase?.symptoms, ...(supportCase?.error_codes ?? [])].filter(Boolean).join(' ');
    const rag = await this.ragService.retrieveContextWithMeta(query, req.appliance_id).catch(() => null);

    const pastRepairs = await this.repairRepo.find({ where: { appliance_id: req.appliance_id, status: 'completed' as any }, order: { completed_date: 'DESC' }, take: 50 });
    const similar = pastRepairs
      .filter((r) => r.id !== req.id && (r.agent_notes || r.repair_cost))
      .filter((r) => FAULT_THEMES.some((t) => t.words.test(req.issue_description) && t.words.test(r.issue_description)))
      .slice(0, 3)
      .map((r) => ({ issue: r.issue_description, notes: r.agent_notes, cost: r.repair_cost, completed: r.completed_date }));

    const compat = appliance?.model
      ? await this.recallsService.compatibleParts(appliance.business_id, appliance.model)
      : { exact: [] as any[], unverified: [] as any[] };
    const recalls = await this.recallsService.activeFor(req.appliance_id).catch(() => []);

    return {
      request_id: req.id,
      appliance: appliance ? { name: appliance.name, model: appliance.model, category: appliance.category } : null,
      customer: { name: req.customer_name, phone: req.customer_phone, address: [req.customer_address, req.customer_city, req.customer_zipcode].filter(Boolean).join(', ') },
      reported_issue: req.issue_description,
      from_chat: supportCase
        ? {
            summary: supportCase.summary,
            error_codes: supportCase.error_codes ?? [],
            steps_tried: supportCase.steps_tried ?? [],
            likely_causes: supportCase.likely_causes ?? [],
            safety_flag: supportCase.safety_flag,
          }
        : null,
      manual_excerpts: (rag?.excerpts ?? []).slice(0, 4).map((e: any) => ({ text: e.text, page: (e.page_index ?? 0) + 1, document: e.document_name ?? e.name ?? null })),
      compatible_parts: compat.exact.slice(0, 8),
      similar_past_repairs: similar,
      active_recalls: recalls,
    };
  }

  // ── I. Documentation test run ─────────────────────────────────────────────

  /**
   * Generate realistic customer questions for a product, then check whether
   * the uploaded manuals contain a matching passage for each. Flags questions
   * the chatbot would have to answer without a source.
   */
  async simulateDocs(applianceId: string, count = 12) {
    const appliance = await this.applianceRepo.findOne({ where: { id: applianceId } });
    if (!appliance) throw new NotFoundException('Appliance not found');
    if (!this.ai.apiKey) {
      throw new ServiceUnavailableException('No AI key is configured on the server (GROQ_API_KEY or OPENAI_API_KEY).');
    }

    const res = await this.openai.chat.completions.create({
      model: this.ai.chatModel,
      temperature: 0.7,
      max_tokens: this.ai.chatModel.startsWith('openai/gpt-oss') ? 4096 : 1200,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You write realistic questions real owners ask about a home appliance — setup, everyday use, error codes, cleaning and maintenance, common faults, warranty. Mix easy and hard. Return JSON: {"questions":[{"question":string,"topic":"setup|usage|error_code|maintenance|troubleshooting|warranty|safety"}]}',
        },
        {
          role: 'user',
          content: `Product: ${appliance.name}${appliance.model ? ` (model ${appliance.model})` : ''}, category: ${appliance.category}. Write ${count} questions.`,
        },
      ],
    });

    let questions: Array<{ question: string; topic: string }> = [];
    try {
      questions = JSON.parse(res.choices[0]?.message?.content ?? '{}').questions ?? [];
    } catch {
      questions = [];
    }
    questions = questions.filter((q) => q?.question).slice(0, count);

    const results: Array<{ question: string; topic: string; covered: boolean; confidence: string; best_match: { text: string; page: number } | null }> = [];
    for (const q of questions) {
      const rag = await this.ragService.retrieveContextWithMeta(q.question, applianceId).catch(() => null);
      const top = rag?.excerpts?.[0] as any;
      const score = rag?.topScore ?? 0;
      results.push({
        question: q.question,
        topic: q.topic ?? 'usage',
        covered: (rag?.chunkCount ?? 0) > 0,
        confidence: score >= 0.55 ? 'strong' : score > 0 ? 'weak' : 'none',
        best_match: top ? { text: String(top.text ?? '').slice(0, 220), page: (top.page_index ?? 0) + 1 } : null,
      });
      if (!rag?.chunkCount) {
        void this.casesService.logGap(applianceId, appliance.business_id, q.question);
      }
    }

    const covered = results.filter((r) => r.covered).length;
    return {
      appliance_id: applianceId,
      tested: results.length,
      covered,
      coverage: results.length ? Math.round((covered / results.length) * 100) : null,
      results,
      note: 'Coverage means a matching passage exists in the uploaded documents. Review weak matches — a match is not proof the answer is complete or correct.',
    };
  }
}
