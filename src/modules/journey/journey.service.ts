import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import * as path from 'path';
import PDFDocument from 'pdfkit';

import { SupportCaseEntity, SupportCaseOutcome } from '../../entities/support-case.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { ProductResolutionEntity } from '../../entities/case-event.entity.js';
import { ExternalRecordMappingEntity, CaseDeliveryEntity } from '../../entities/connect-records.entity.js';
import { RepairRequestEntity } from '../../entities/repair-request.entity.js';
import { PartsOrderEntity } from '../../entities/parts-order.entity.js';
import { CaseEventsService } from '../cases/case-events.service.js';
import { CasesService } from '../cases/cases.service.js';
import { StorageService } from '../../common/storage.service.js';
import { CASE_NEXT_STEP, CASE_STATUS_LABEL, OPEN_STATUSES, type CaseStatus } from '../../common/case-status.js';

export type Actor = { id?: string | null; email?: string | null; business_id?: string | null };
type UploadedFile = { buffer: Buffer; originalname: string; mimetype: string; size: number };

const EVIDENCE_MIME = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf|video\/(mp4|quicktime|webm))$/;
const MAX_EVIDENCE = 12;
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Customer-facing repair journey: case timeline, evidence, details, outcome
 * confirmation, warranty claim packet and service-operations metrics.
 */
@Injectable()
export class JourneyService {
  constructor(
    @InjectRepository(SupportCaseEntity) private caseRepo: Repository<SupportCaseEntity>,
    @InjectRepository(ApplianceEntity) private applianceRepo: Repository<ApplianceEntity>,
    @InjectRepository(ProductResolutionEntity) private resolutionRepo: Repository<ProductResolutionEntity>,
    @InjectRepository(ExternalRecordMappingEntity) private mappingRepo: Repository<ExternalRecordMappingEntity>,
    @InjectRepository(CaseDeliveryEntity) private deliveryRepo: Repository<CaseDeliveryEntity>,
    @InjectRepository(RepairRequestEntity) private repairRepo: Repository<RepairRequestEntity>,
    @InjectRepository(PartsOrderEntity) private partsOrderRepo: Repository<PartsOrderEntity>,
    private events: CaseEventsService,
    private cases: CasesService,
    private storage: StorageService,
    private config: ConfigService,
  ) {}

  private get staleDays() {
    return Math.max(1, Number(this.config.get('CASE_STALE_DAYS') ?? 3));
  }

  private async byToken(token: string) {
    const c = token && token.length >= 32 ? await this.caseRepo.findOne({ where: { public_token: token } }) : null;
    if (!c) throw new NotFoundException('This case link is not valid');
    return c;
  }

  private async ownCase(actor: Actor, id: string) {
    const c = await this.caseRepo.findOne({ where: { id } });
    if (!c || !actor.business_id || c.business_id !== actor.business_id) throw new NotFoundException('Case not found');
    return c;
  }

  private evidenceView(c: SupportCaseEntity) {
    return (c.evidence ?? []).map((e) => ({ id: e.id, name: e.name, kind: e.kind, mime: e.mime, size: e.size, uploaded_at: e.uploaded_at }));
  }

  private async external(c: SupportCaseEntity) {
    const m = await this.mappingRepo.findOne({ where: { object_type: 'support_case', internal_id: c.id }, order: { updated_at: 'DESC' } });
    return m ? { id: m.external_id, url: m.external_url, status: m.external_status } : null;
  }

  // ── Customer: case page ───────────────────────────────────────────────────

  async publicCase(token: string) {
    const c = await this.byToken(token);
    const appliance = await this.applianceRepo.findOne({ where: { id: c.appliance_id } });
    const events = await this.events.listForCase(c.id, true);
    const status = (c.canonical_status ?? 'received') as CaseStatus;
    const ext = await this.external(c);
    const lastUpdate = c.last_event_at ?? c.updated_at;
    const open = OPEN_STATUSES.includes(status);
    const stale = open && ext !== null && Date.now() - new Date(lastUpdate).getTime() > this.staleDays * 86_400_000;
    return {
      reference: c.id.slice(0, 8).toUpperCase(),
      status,
      status_label: CASE_STATUS_LABEL[status] ?? status,
      next_step: CASE_NEXT_STEP[status] ?? '',
      last_updated: lastUpdate,
      /** No news from the service team for a while — said plainly, never filled with a guess */
      stale_notice: stale ? `No update from the service team since ${new Date(lastUpdate).toDateString()}. We'll show their next update here as soon as it arrives.` : null,
      helpdesk_ticket: ext ? { id: ext.id } : null,
      product: appliance ? { id: appliance.id, name: appliance.name, model: appliance.model, category: appliance.category, image_url: appliance.image_url, color: appliance.color } : null,
      summary: c.summary ?? c.symptoms,
      safety_flag: c.safety_flag,
      details: {
        purchase_date: c.purchase_date, serial_number: c.serial_number,
        prior_case_refs: c.prior_case_refs ?? [], error_codes: c.error_codes ?? [], steps_tried: c.steps_tried ?? [],
      },
      evidence: this.evidenceView(c),
      can_confirm_outcome: status === 'resolved' || status === 'closed' || c.outcome === SupportCaseOutcome.CLOSED,
      customer_confirmed_fixed: c.customer_confirmed_fixed,
      events: events.map((e) => ({
        id: e.id, type: e.type, status: e.status, title: e.title, detail: e.detail, data: e.data,
        source: e.source, occurred_at: e.occurred_at,
      })),
    };
  }

  async updateDetails(token: string, body: { purchase_date?: string; serial_number?: string; prior_case_refs?: string[] | string }) {
    const c = await this.byToken(token);
    const changes: string[] = [];
    if (body.purchase_date !== undefined) {
      const d = String(body.purchase_date).trim();
      if (d && (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d)) || new Date(d) > new Date())) {
        throw new BadRequestException('Enter the purchase date as a past date (YYYY-MM-DD)');
      }
      c.purchase_date = d || null;
      changes.push('purchase date');
    }
    if (body.serial_number !== undefined) {
      c.serial_number = String(body.serial_number).trim().slice(0, 100) || null;
      changes.push('serial number');
    }
    if (body.prior_case_refs !== undefined) {
      const list = Array.isArray(body.prior_case_refs) ? body.prior_case_refs : String(body.prior_case_refs).split(/[,;\n]/);
      c.prior_case_refs = list.map((s) => String(s).trim().slice(0, 60)).filter(Boolean).slice(0, 10);
      changes.push('earlier case numbers');
    }
    if (!changes.length) return this.publicCase(token);
    c.completeness = this.cases.computeCompleteness(c);
    await this.caseRepo.save(c);
    await this.events.record(c, { type: 'details_updated', title: `You added ${changes.join(', ')}`, source: 'customer' });
    return this.publicCase(token);
  }

  async addEvidence(token: string, files: UploadedFile[]) {
    const c = await this.byToken(token);
    if (!files?.length) throw new BadRequestException('Choose at least one photo, video or receipt');
    const existing = c.evidence ?? [];
    if (existing.length + files.length > MAX_EVIDENCE) throw new BadRequestException(`A case can hold up to ${MAX_EVIDENCE} files`);

    const added: Array<Record<string, any>> = [];
    for (const f of files) {
      if (!EVIDENCE_MIME.test(f.mimetype)) throw new BadRequestException(`${f.originalname}: only photos, short videos and PDF receipts are accepted`);
      if (f.size > MAX_BYTES) throw new BadRequestException(`${f.originalname} is larger than 15 MB`);
      const id = uuidv4();
      const ext = path.extname(f.originalname).slice(0, 8).toLowerCase() || '';
      const key = `evidence/${c.id}/${id}${ext}`;
      if (this.storage.isEnabled()) {
        await this.storage.upload(f.buffer, key, f.mimetype);
      } else {
        // Local dev: a private folder that is NOT served as static files
        const dir = path.resolve(process.cwd(), 'private-uploads', 'evidence', c.id);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(path.join(dir, `${id}${ext}`), f.buffer);
      }
      added.push({
        id, key, name: f.originalname.slice(0, 200), mime: f.mimetype, size: f.size,
        kind: f.mimetype === 'application/pdf' ? 'receipt' : f.mimetype.startsWith('video/') ? 'video' : 'photo',
        uploaded_at: new Date().toISOString(),
      });
    }
    c.evidence = [...existing, ...added];
    c.completeness = this.cases.computeCompleteness(c);
    await this.caseRepo.save(c);
    await this.events.record(c, {
      type: 'evidence_added', title: `You added ${added.length} file${added.length === 1 ? '' : 's'}`,
      detail: added.map((a) => a.name).join(', '), source: 'customer',
    });
    return { evidence: this.evidenceView(c) };
  }

  private async readEvidence(c: SupportCaseEntity, evidenceId: string) {
    const e = (c.evidence ?? []).find((x) => x.id === evidenceId);
    if (!e) throw new NotFoundException('File not found');
    const buffer = this.storage.isEnabled()
      ? await this.storage.download(e.key)
      : await fs.readFile(path.resolve(process.cwd(), 'private-uploads', e.key));
    return { buffer, mime: e.mime as string, name: e.name as string };
  }

  async evidenceForCustomer(token: string, evidenceId: string) {
    return this.readEvidence(await this.byToken(token), evidenceId);
  }

  async evidenceForTeam(actor: Actor, caseId: string, evidenceId: string) {
    return this.readEvidence(await this.ownCase(actor, caseId), evidenceId);
  }

  /** After the team resolves the case, the customer says whether it is actually fixed. */
  async confirmOutcome(token: string, body: { fixed?: boolean; note?: string }) {
    const c = await this.byToken(token);
    if (typeof body.fixed !== 'boolean') throw new BadRequestException('fixed must be true or false');
    c.customer_confirmed_fixed = body.fixed;
    await this.caseRepo.save(c);
    await this.events.record(c, {
      type: 'outcome',
      title: body.fixed ? 'You confirmed your appliance is working' : 'You told us the problem is not fixed',
      detail: body.note?.slice(0, 1000) ?? null,
      data: { fixed: body.fixed, repeat_failure: !body.fixed },
      source: 'customer',
    });
    return this.publicCase(token);
  }

  // ── Team: case detail & claim packet ──────────────────────────────────────

  async teamCase(actor: Actor, id: string) {
    const c = await this.ownCase(actor, id);
    const [events, ext, delivery] = await Promise.all([
      this.events.listForCase(c.id),
      this.external(c),
      this.deliveryRepo.findOne({ where: { case_id: c.id }, order: { created_at: 'DESC' } }),
    ]);
    const appBase = (this.config.get<string>('app.baseUrl') || 'http://localhost:3000').replace(/\/$/, '');
    return {
      id: c.id,
      canonical_status: c.canonical_status,
      status_label: CASE_STATUS_LABEL[c.canonical_status as CaseStatus] ?? c.canonical_status,
      tracking_url: c.public_token ? `${appBase}/case/${c.public_token}` : null,
      purchase_date: c.purchase_date, serial_number: c.serial_number, prior_case_refs: c.prior_case_refs ?? [],
      evidence: this.evidenceView(c),
      customer_confirmed_fixed: c.customer_confirmed_fixed,
      helpdesk: ext,
      delivery: delivery ? { status: delivery.status, attempts: delivery.attempts, last_error: delivery.last_error } : null,
      events,
    };
  }

  /**
   * Warranty claim packet (P1): everything the warranty owner needs, in one
   * PDF. It does not decide or promise coverage.
   */
  async claimPacket(actor: Actor, id: string): Promise<{ pdf: Buffer; filename: string }> {
    const c = await this.ownCase(actor, id);
    const appliance = await this.applianceRepo.findOne({ where: { id: c.appliance_id } });
    const events = await this.events.listForCase(c.id);
    const ext = await this.external(c);
    const ref = c.id.slice(0, 8).toUpperCase();

    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Warranty claim packet ${ref}`, Author: 'Scana' } });
    const chunks: Buffer[] = [];
    doc.on('data', (b: Buffer) => chunks.push(b));
    const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    const h = (t: string) => doc.moveDown(0.8).font('Helvetica-Bold').fontSize(12).fillColor('#1E1B4B').text(t).moveDown(0.3).font('Helvetica').fontSize(10).fillColor('#0D1117');
    const row = (k: string, v: unknown) => doc.font('Helvetica-Bold').text(`${k}: `, { continued: true }).font('Helvetica').text(v === null || v === undefined || v === '' ? 'Not provided' : String(v));
    const list = (items: string[] | null | undefined, empty = 'None recorded') => {
      if (!items?.length) return doc.text(empty);
      items.forEach((i) => doc.text(`•  ${i}`, { indent: 6 }));
    };

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#4F46E5').text('Warranty claim packet');
    doc.font('Helvetica').fontSize(10).fillColor('#5B5B7E').text(`Case ${ref} · prepared ${new Date().toDateString()} by Scana`);
    doc.moveDown(0.5).fillColor('#92400E').fontSize(9).text(
      'This packet collects evidence for the warranty provider. It does not decide or promise warranty coverage. Customer-supplied details are marked as such and have not been verified by Scana.',
    );

    h('Product');
    row('Product', appliance?.name);
    row('Model', appliance?.model);
    row('Category', appliance?.category);
    row('Serial number (customer-supplied)', c.serial_number);
    row('Purchase date (customer-supplied)', c.purchase_date);

    h('Customer');
    row('Name', c.customer_name);
    row('Email', c.customer_email);
    row('Phone', c.customer_phone);

    h('Reported problem');
    doc.text(c.symptoms ?? c.summary ?? 'Not provided');
    doc.moveDown(0.3);
    row('Error codes', (c.error_codes ?? []).join(', ') || 'None reported');
    if (c.safety_flag) row('Safety stop', c.safety_flag.replace(/_/g, ' '));

    h('Steps already tried');
    list(c.steps_tried);

    h('Evidence attached to the case');
    list((c.evidence ?? []).map((e) => `${e.kind}: ${e.name} (uploaded ${new Date(e.uploaded_at).toDateString()})`), 'No files uploaded');

    h('Earlier cases / tickets');
    list([...(c.prior_case_refs ?? []), ...(ext ? [`Help-desk ticket ${ext.id}`] : [])]);

    h('Case history');
    for (const e of events) {
      doc.text(`${new Date(e.occurred_at).toLocaleString()} — ${e.title}${e.detail ? `: ${e.detail.slice(0, 200)}` : ''} [${e.source}]`);
    }

    doc.end();
    return { pdf: await done, filename: `claim-packet-${ref}.pdf` };
  }

  // ── P2 service intelligence ───────────────────────────────────────────────

  async serviceOps(actor: Actor, days = 90) {
    if (!actor.business_id) throw new ForbiddenException('Your account is not linked to a business');
    const businessId = actor.business_id;
    const since = new Date(Date.now() - days * 86_400_000);
    const appliances = await this.applianceRepo.find({ where: { business_id: businessId }, select: ['id', 'name'] });
    const ids = appliances.map((a) => a.id);
    const nameOf = new Map(appliances.map((a) => [a.id, a.name]));
    if (!ids.length) return { period_days: days, empty: true };

    const [cases, repairs, orders, resolutions] = await Promise.all([
      this.caseRepo.find({ where: { business_id: businessId, created_at: MoreThanOrEqual(since) } }),
      this.repairRepo.find({ where: { appliance_id: In(ids), created_at: MoreThanOrEqual(since) } }),
      this.partsOrderRepo.find({ where: { appliance_id: In(ids), created_at: MoreThanOrEqual(since) } }),
      this.resolutionRepo.find({ where: { business_id: businessId, created_at: MoreThanOrEqual(since) } }),
    ]);

    // Repeat contacts: same customer + product with more than one case within 30 days
    const person = (x: { customer_email?: string | null; customer_phone?: string | null }) =>
      (x.customer_email?.toLowerCase() || x.customer_phone?.replace(/\D/g, '') || '');
    const groups = new Map<string, SupportCaseEntity[]>();
    for (const c of cases) {
      const p = person(c);
      if (!p) continue;
      const k = `${c.appliance_id}|${p}`;
      groups.set(k, [...(groups.get(k) ?? []), c]);
    }
    let repeatContacts = 0;
    for (const list of groups.values()) {
      const sorted = list.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
      for (let i = 1; i < sorted.length; i++) {
        if (+new Date(sorted[i].created_at) - +new Date(sorted[i - 1].created_at) <= 30 * 86_400_000) repeatContacts++;
      }
    }
    const casesWithPerson = cases.filter((c) => person(c)).length;

    // Repeat visits: a new repair request for the same customer + product within 30 days of a completed one
    const completed = repairs.filter((r) => r.status === 'completed' && r.completed_date);
    let repeatVisits = 0;
    for (const r of completed) {
      const again = repairs.some((x) => x.id !== r.id && x.appliance_id === r.appliance_id && person(x) && person(x) === person(r) &&
        +new Date(x.created_at) > +new Date(r.completed_date!) && +new Date(x.created_at) - +new Date(r.completed_date!) <= 30 * 86_400_000);
      if (again) repeatVisits++;
    }

    // Parts delays: orders not delivered after 7 days
    const delayed = orders.filter((o) => !['delivered', 'cancelled'].includes(String(o.status)) && Date.now() - +new Date(o.created_at) > 7 * 86_400_000);

    // Unresolved ageing
    const open = cases.filter((c) => OPEN_STATUSES.includes(c.canonical_status as CaseStatus) && c.outcome !== SupportCaseOutcome.RESOLVED_BY_AI);
    const age = (c: SupportCaseEntity) => (Date.now() - +new Date(c.created_at)) / 86_400_000;
    const ageing = {
      under_3_days: open.filter((c) => age(c) < 3).length,
      days_3_to_7: open.filter((c) => age(c) >= 3 && age(c) < 8).length,
      days_8_to_14: open.filter((c) => age(c) >= 8 && age(c) < 15).length,
      over_14_days: open.filter((c) => age(c) >= 15).length,
    };

    // Sync health
    const mapped = cases.length
      ? await this.mappingRepo.find({ where: { object_type: 'support_case', internal_id: In(cases.map((c) => c.id)) } })
      : [];
    const mappedIds = new Set(mapped.map((m) => m.internal_id));
    const stale = open.filter((c) => mappedIds.has(c.id) && Date.now() - +new Date(c.last_event_at ?? c.updated_at) > this.staleDays * 86_400_000);
    const failedDeliveries = await this.deliveryRepo.count({ where: { business_id: businessId, status: 'failed' } });

    // Model resolution accuracy
    const res = { total: resolutions.length, exact: 0, needs_confirmation: 0, not_found: 0, corrected: 0 };
    for (const r of resolutions) {
      if (r.outcome in res) (res as any)[r.outcome]++;
      if (r.corrected) res.corrected++;
    }

    // Guided resolution and customer-confirmed outcomes
    const resolvedByAi = cases.filter((c) => c.outcome === SupportCaseOutcome.RESOLVED_BY_AI).length;
    const confirmed = cases.filter((c) => c.customer_confirmed_fixed !== null);
    const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : null);

    // Resolution time for cases the team resolved
    const durations = cases
      .filter((c) => ['resolved', 'closed'].includes(c.canonical_status) && c.last_event_at)
      .map((c) => (+new Date(c.last_event_at!) - +new Date(c.created_at)) / 86_400_000);
    const median = durations.length ? durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)] : null;

    return {
      period_days: days,
      guided_resolution_rate: pct(resolvedByAi, cases.length),
      repeat_contact_rate: pct(repeatContacts, casesWithPerson),
      repeat_contacts: repeatContacts,
      repeat_visit_rate: pct(repeatVisits, completed.length),
      repeat_visits: repeatVisits,
      completed_repairs: completed.length,
      customer_confirmed_fixed_rate: pct(confirmed.filter((c) => c.customer_confirmed_fixed).length, confirmed.length),
      median_days_to_resolution: median === null ? null : Math.round(median * 10) / 10,
      parts_delays: delayed.slice(0, 20).map((o) => ({
        id: o.id, reference: o.id.slice(0, 8).toUpperCase(), product: nameOf.get(o.appliance_id) ?? null,
        status: o.status, days_open: Math.floor((Date.now() - +new Date(o.created_at)) / 86_400_000),
      })),
      parts_delay_count: delayed.length,
      open_cases: open.length,
      ageing,
      sync: {
        linked_cases: mappedIds.size,
        stale_cases: stale.length,
        stale_after_days: this.staleDays,
        failed_deliveries: failedDeliveries,
        stale: stale.slice(0, 20).map((c) => ({
          id: c.id, reference: c.id.slice(0, 8).toUpperCase(), product: nameOf.get(c.appliance_id) ?? null,
          status: c.canonical_status, last_update: c.last_event_at ?? c.updated_at,
        })),
      },
      model_resolution: { ...res, exact_rate: pct(res.exact, res.total), corrected_rate: pct(res.corrected, res.total) },
    };
  }
}
