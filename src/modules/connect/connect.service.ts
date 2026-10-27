import {
  BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException,
  OnModuleDestroy, OnModuleInit, UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { In, IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

import { IntegrationConnectionEntity } from '../../entities/integration-connection.entity.js';
import {
  SyncRunEntity, CaseDeliveryEntity, ExternalRecordMappingEntity,
  WebhookEventEntity, AuditEventEntity, ProductIdentifierEntity,
} from '../../entities/connect-records.entity.js';
import { SupportCaseEntity, SupportCaseOutcome } from '../../entities/support-case.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { parseCsv, CATALOG_FIELDS, guessMapping, normalizeCode, type CatalogField } from './catalog.js';
import { CaseEventsService } from '../cases/case-events.service.js';
import { mapProviderStatus, CASE_STATUS_LABEL } from '../../common/case-status.js';

export type Actor = { id?: string | null; email?: string | null; business_id?: string | null };

const PAYLOAD_VERSION = '2026-10-27';
const RETRY_DELAYS_MIN = [1, 5, 15, 60, 360]; // then give up → failed
const MAX_ATTEMPTS = RETRY_DELAYS_MIN.length + 1;
const SIGNATURE_TOLERANCE_SEC = 300;

/**
 * Scana Connect: signed webhook connections, case delivery with retries and
 * idempotency, inbound status webhooks, catalogue import and an audit trail.
 */
@Injectable()
export class ConnectService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectService.name);
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;
  private readonly key: Buffer;

  constructor(
    @InjectRepository(IntegrationConnectionEntity) private connRepo: Repository<IntegrationConnectionEntity>,
    @InjectRepository(SyncRunEntity) private runRepo: Repository<SyncRunEntity>,
    @InjectRepository(CaseDeliveryEntity) private deliveryRepo: Repository<CaseDeliveryEntity>,
    @InjectRepository(ExternalRecordMappingEntity) private mappingRepo: Repository<ExternalRecordMappingEntity>,
    @InjectRepository(WebhookEventEntity) private eventRepo: Repository<WebhookEventEntity>,
    @InjectRepository(AuditEventEntity) private auditRepo: Repository<AuditEventEntity>,
    @InjectRepository(ProductIdentifierEntity) private identifierRepo: Repository<ProductIdentifierEntity>,
    @InjectRepository(SupportCaseEntity) private caseRepo: Repository<SupportCaseEntity>,
    @InjectRepository(ApplianceEntity) private applianceRepo: Repository<ApplianceEntity>,
    private config: ConfigService,
    private caseEvents: CaseEventsService,
  ) {
    const material =
      this.config.get<string>('CONNECT_ENCRYPTION_KEY') || process.env.JWT_SECRET || 'secret-key';
    this.key = crypto.createHash('sha256').update(material).digest();
  }

  // ── Lifecycle: background delivery worker ─────────────────────────────────

  onModuleInit() {
    if (process.env.CONNECT_WORKER === 'false') return;
    this.timer = setInterval(() => void this.tick(), 15_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      await this.enqueueNewCases();
      await this.requeueStuck();
      await this.processDue();
    } catch (err) {
      this.logger.warn(`Connect worker tick failed: ${err}`);
    } finally {
      this.ticking = false;
    }
  }

  // ── Secrets ───────────────────────────────────────────────────────────────

  private encrypt(plain: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
  }

  private decrypt(stored: string): string {
    const [iv, tag, enc] = stored.split('.').map((s) => Buffer.from(s, 'base64'));
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }

  private newSecret() {
    return `whsec_${crypto.randomBytes(24).toString('hex')}`;
  }

  /** Stripe-style signature: t=<unix>,v1=<hex HMAC-SHA256 of "<t>.<body>"> */
  sign(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)) {
    const v1 = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
    return `t=${timestamp},v1=${v1}`;
  }

  private verify(secret: string, body: string, header: string | undefined): boolean {
    if (!header) return false;
    const parts = Object.fromEntries(header.split(',').map((p) => p.trim().split('=') as [string, string]));
    const t = Number(parts.t);
    if (!t || !parts.v1 || Math.abs(Date.now() / 1000 - t) > SIGNATURE_TOLERANCE_SEC) return false;
    const expected = crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(parts.v1, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  // ── Audit ─────────────────────────────────────────────────────────────────

  async audit(
    businessId: string, actor: Actor | string, action: string,
    target?: { type: string; id: string } | null, metadata?: Record<string, any>,
  ) {
    try {
      await this.auditRepo.save(this.auditRepo.create({
        id: uuidv4(),
        business_id: businessId,
        actor_id: typeof actor === 'string' ? null : actor.id ?? null,
        actor: typeof actor === 'string' ? actor : actor.email ?? 'unknown',
        action,
        target_type: target?.type ?? null,
        target_id: target?.id ?? null,
        metadata: metadata ?? null,
      }));
    } catch (err) {
      this.logger.warn(`Audit write failed: ${err}`);
    }
  }

  listAudit(businessId: string, limit = 100) {
    return this.auditRepo.find({ where: { business_id: businessId }, order: { created_at: 'DESC' }, take: Math.min(limit, 500) });
  }

  // ── Connections ───────────────────────────────────────────────────────────

  private businessOf(actor: Actor): string {
    if (!actor.business_id) throw new ForbiddenException('Your account is not linked to a business');
    return actor.business_id;
  }

  /** Block webhooks to private/internal addresses in production (SSRF protection). */
  private async assertSafeUrl(raw: string) {
    let url: URL;
    try { url = new URL(raw); } catch { throw new BadRequestException('Enter a full URL, e.g. https://hooks.example.com/scana'); }
    const prod = process.env.NODE_ENV === 'production';
    if (prod && url.protocol !== 'https:') throw new BadRequestException('Webhook URLs must use https');
    if (!['http:', 'https:'].includes(url.protocol)) throw new BadRequestException('Webhook URLs must use http or https');
    if (!prod) return;
    const host = url.hostname;
    const addrs = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((a: any) => a.address);
    if (!addrs.length) throw new BadRequestException('That host name could not be resolved');
    const privateIp = (ip: string) =>
      /^(10\.|127\.|169\.254\.|192\.168\.|0\.|::1$|fc|fd|fe80)/i.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
    if (addrs.some(privateIp)) throw new BadRequestException('Webhook URLs cannot point to private or internal addresses');
  }

  private view(c: IntegrationConnectionEntity) {
    const { secret_encrypted, ...rest } = c;
    return { ...rest, has_secret: Boolean(secret_encrypted) };
  }

  async listConnections(actor: Actor) {
    const businessId = this.businessOf(actor);
    const rows = await this.connRepo.find({ where: { business_id: businessId }, order: { created_at: 'DESC' } });
    const stats = rows.length
      ? await this.deliveryRepo
          .createQueryBuilder('d')
          .select('d.connection_id', 'connection_id')
          .addSelect('d.status', 'status')
          .addSelect('COUNT(*)', 'n')
          .where('d.connection_id IN (:...ids)', { ids: rows.map((r) => r.id) })
          .groupBy('d.connection_id')
          .addGroupBy('d.status')
          .getRawMany()
      : [];
    return rows.map((r) => ({
      ...this.view(r),
      deliveries: Object.fromEntries(stats.filter((s) => s.connection_id === r.id).map((s) => [s.status, Number(s.n)])),
    }));
  }

  private async ownConnection(actor: Actor, id: string) {
    const c = await this.connRepo.findOne({ where: { id } });
    if (!c || c.business_id !== this.businessOf(actor)) throw new NotFoundException('Connection not found');
    return c;
  }

  async createConnection(actor: Actor, body: { name?: string; url?: string; mode?: string; require_approval?: boolean }) {
    const businessId = this.businessOf(actor);
    if (!body.url) throw new BadRequestException('url is required');
    await this.assertSafeUrl(body.url);
    const secret = this.newSecret();
    const conn = await this.connRepo.save(this.connRepo.create({
      id: uuidv4(),
      business_id: businessId,
      provider: 'webhook',
      name: (body.name?.trim() || 'Support webhook').slice(0, 120),
      status: 'pending',
      config: {
        url: body.url.trim(),
        mode: body.mode === 'live' ? 'live' : 'test',
        require_approval: body.require_approval !== false, // safe default: a person approves each case
        events: ['support_case.created'],
      },
      secret_encrypted: this.encrypt(secret),
      secret_hint: secret.slice(-4),
      created_by: actor.id ?? null,
    }));
    await this.audit(businessId, actor, 'connection.created', { type: 'connection', id: conn.id }, { provider: 'webhook', mode: conn.config?.mode });
    // The secret is returned exactly once
    return { connection: this.view(conn), secret };
  }

  async updateConnection(actor: Actor, id: string, body: { name?: string; url?: string; mode?: string; require_approval?: boolean; status?: string }) {
    const c = await this.ownConnection(actor, id);
    const cfg = { ...(c.config ?? {}) };
    const changes: Record<string, any> = {};
    if (body.url !== undefined && body.url !== cfg.url) { await this.assertSafeUrl(body.url); cfg.url = body.url.trim(); changes.url = 'changed'; }
    if (body.mode !== undefined) { cfg.mode = body.mode === 'live' ? 'live' : 'test'; changes.mode = cfg.mode; }
    if (body.require_approval !== undefined) { cfg.require_approval = Boolean(body.require_approval); changes.require_approval = cfg.require_approval; }
    if (body.name !== undefined) { c.name = body.name.trim().slice(0, 120) || c.name; changes.name = c.name; }
    if (body.status === 'paused' || body.status === 'active') {
      if (body.status === 'active' && !c.last_test_ok) throw new BadRequestException('Send a successful test before activating this connection');
      c.status = body.status;
      changes.status = body.status;
      if (body.status === 'active' && !cfg.activated_at) cfg.activated_at = new Date().toISOString();
    }
    c.config = cfg;
    await this.connRepo.save(c);
    await this.audit(c.business_id, actor, 'connection.updated', { type: 'connection', id: c.id }, changes);
    return this.view(c);
  }

  async rotateSecret(actor: Actor, id: string) {
    const c = await this.ownConnection(actor, id);
    const secret = this.newSecret();
    c.secret_encrypted = this.encrypt(secret);
    c.secret_hint = secret.slice(-4);
    await this.connRepo.save(c);
    await this.audit(c.business_id, actor, 'connection.secret_rotated', { type: 'connection', id: c.id });
    return { connection: this.view(c), secret };
  }

  async deleteConnection(actor: Actor, id: string) {
    const c = await this.ownConnection(actor, id);
    await this.deliveryRepo.update(
      { connection_id: id, status: In(['pending_approval', 'queued', 'delivering']) },
      { status: 'rejected', last_error: 'Connection removed' },
    );
    await this.connRepo.delete({ id });
    await this.audit(c.business_id, actor, 'connection.deleted', { type: 'connection', id }, { name: c.name });
    return { deleted: true };
  }

  /** Send a signed test event; a 2xx response marks the connection ready to activate. */
  async testConnection(actor: Actor, id: string) {
    const c = await this.ownConnection(actor, id);
    const run = await this.startRun(c.business_id, 'connection_test', c.id, actor, c.name);
    const body = JSON.stringify({
      event: 'connection.test',
      version: PAYLOAD_VERSION,
      connection_id: c.id,
      sent_at: new Date().toISOString(),
      message: 'Test event from Scana Connect. Reply with any 2xx status to confirm.',
    });
    const res = await this.post(c, body, { event: 'connection.test', deliveryId: `test-${run.id}` });
    c.last_tested_at = new Date();
    c.last_test_ok = res.ok;
    c.last_error = res.ok ? null : res.error;
    if (res.ok && c.status === 'pending') c.status = 'paused'; // tested; the admin activates explicitly
    await this.connRepo.save(c);
    await this.finishRun(run, res.ok ? 'succeeded' : 'failed', { sent: 1, ok: res.ok ? 1 : 0 }, res.ok ? [] : [res.error ?? 'Request failed']);
    await this.audit(c.business_id, actor, 'connection.tested', { type: 'connection', id: c.id }, { ok: res.ok, status: res.status });
    return { ok: res.ok, status: res.status, error: res.error, connection: this.view(c) };
  }

  // ── HTTP delivery ─────────────────────────────────────────────────────────

  private async post(c: IntegrationConnectionEntity, body: string, opts: { event: string; deliveryId: string }) {
    const url = c.config?.url;
    if (!url || !c.secret_encrypted) return { ok: false, status: 0, error: 'Connection has no URL or secret', json: null as any };
    let secret: string;
    try { secret = this.decrypt(c.secret_encrypted); } catch { return { ok: false, status: 0, error: 'Signing secret could not be read — rotate it', json: null }; }
    try {
      await this.assertSafeUrl(url);
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Scana-Connect/1.0',
          'X-Scana-Event': opts.event,
          'X-Scana-Delivery': opts.deliveryId,
          'Idempotency-Key': opts.deliveryId,
          'X-Scana-Mode': c.config?.mode ?? 'test',
          'X-Scana-Signature': this.sign(secret, body),
        },
        body,
        signal: AbortSignal.timeout(10_000),
        redirect: 'error',
      });
      const text = await res.text().catch(() => '');
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      return {
        ok: res.ok,
        status: res.status,
        error: res.ok ? null : `Receiver answered HTTP ${res.status}`,
        json,
      };
    } catch (err: any) {
      const msg = err?.name === 'TimeoutError' ? 'Receiver did not answer within 10 seconds' : (err?.message ?? 'Network error').slice(0, 200);
      return { ok: false, status: 0, error: msg, json: null };
    }
  }

  /** Canonical case payload — vendor-neutral (blueprint Appendix A). */
  private async buildCasePayload(c: SupportCaseEntity, deliveryId: string, mode: string) {
    const appliance = await this.applianceRepo.findOne({ where: { id: c.appliance_id } });
    const appBase = (this.config.get<string>('app.baseUrl') || 'http://localhost:3000').replace(/\/$/, '');
    return {
      event: 'support_case.created',
      version: PAYLOAD_VERSION,
      mode,
      delivery_id: deliveryId,
      sent_at: new Date().toISOString(),
      case: {
        id: c.id,
        reference: c.id.slice(0, 8).toUpperCase(),
        category: c.category,
        outcome: c.outcome,
        requested_action: c.safety_flag ? 'technician_visit' : 'human_support_review',
        safety_flag: c.safety_flag,
        customer_description: c.symptoms,
        summary: c.summary,
        error_codes: c.error_codes ?? [],
        steps_completed: c.steps_tried ?? [],
        likely_causes_unconfirmed: c.likely_causes ?? [],
        completeness: c.completeness,
        created_at: c.created_at,
      },
      product: appliance
        ? { id: appliance.id, name: appliance.name, model: appliance.model, sku: appliance.sku, category: appliance.category }
        : { id: c.appliance_id },
      customer: { name: c.customer_name, email: c.customer_email, phone: c.customer_phone },
      links: { scana_case: `${appBase}/dashboard/cases` },
    };
  }

  /**
   * Create deliveries for open/escalated cases on active connections. Only
   * cases created after the connection was activated are sent, so turning a
   * connection on never floods a help desk with history.
   */
  private async enqueueNewCases() {
    const conns = await this.connRepo.find({ where: { status: 'active' } });
    for (const c of conns) {
      const since = c.config?.activated_at ? new Date(c.config.activated_at) : c.created_at;
      const cases = await this.caseRepo.find({
        where: {
          business_id: c.business_id,
          outcome: In([SupportCaseOutcome.OPEN, SupportCaseOutcome.ESCALATED]),
          created_at: MoreThanOrEqual(since),
        },
        take: 100,
      });
      if (!cases.length) continue;
      const existing = await this.deliveryRepo.find({
        where: { connection_id: c.id, case_id: In(cases.map((x) => x.id)) },
        select: ['case_id'],
      });
      const done = new Set(existing.map((e) => e.case_id));
      for (const sc of cases) {
        if (done.has(sc.id)) continue;
        // Wait until the AI has written a summary, so the ticket isn't half-empty
        if (!sc.summary && Date.now() - new Date(sc.created_at).getTime() < 5 * 60_000) continue;
        try {
          await this.deliveryRepo.insert({
            id: uuidv4(),
            business_id: c.business_id,
            case_id: sc.id,
            connection_id: c.id,
            status: c.config?.require_approval ? 'pending_approval' : 'queued',
            next_attempt_at: new Date(),
          });
        } catch {
          // unique (case_id, connection_id) — another worker already queued it
        }
      }
    }
  }

  /** Deliveries stuck in "delivering" (e.g. the server restarted mid-request) go back to the queue. */
  private async requeueStuck() {
    await this.deliveryRepo.update(
      { status: 'delivering', updated_at: LessThanOrEqual(new Date(Date.now() - 5 * 60_000)) },
      { status: 'queued', next_attempt_at: new Date() },
    );
  }

  private async processDue() {
    const due = await this.deliveryRepo.find({
      where: [
        { status: 'queued', next_attempt_at: LessThanOrEqual(new Date()) },
        { status: 'queued', next_attempt_at: IsNull() },
      ],
      order: { created_at: 'ASC' },
      take: 20,
    });
    for (const d of due) {
      // Atomic claim so two server instances never send the same delivery
      const claim = await this.deliveryRepo.update({ id: d.id, status: 'queued' }, { status: 'delivering' });
      if (!claim.affected) continue;
      await this.deliver(d.id);
    }
  }

  private async deliver(deliveryId: string) {
    const d = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
    if (!d) return;
    const conn = await this.connRepo.findOne({ where: { id: d.connection_id } });
    const sc = await this.caseRepo.findOne({ where: { id: d.case_id } });
    if (!conn || !sc) {
      await this.deliveryRepo.update(d.id, { status: 'rejected', last_error: !conn ? 'Connection removed' : 'Case no longer exists' });
      return;
    }
    if (conn.status !== 'active') {
      await this.deliveryRepo.update(d.id, { status: 'queued', next_attempt_at: new Date(Date.now() + 60_000) });
      return;
    }

    const payload = await this.buildCasePayload(sc, d.id, conn.config?.mode ?? 'test');
    const res = await this.post(conn, JSON.stringify(payload), { event: payload.event, deliveryId: d.id });
    const attempts = d.attempts + 1;

    if (res.ok) {
      await this.deliveryRepo.update(d.id, {
        status: 'delivered', attempts, response_code: res.status, last_error: null, delivered_at: new Date(), payload: payload as any,
      });
      conn.last_delivery_at = new Date();
      conn.last_error = null;
      await this.connRepo.save(conn);
      await this.caseEvents.record(sc, {
        type: 'sent', status: 'sent_to_service', title: 'Sent to the service team',
        detail: 'Your case and the full chat history are with the brand\'s support team.',
        source: 'scana', source_ref: d.id, notify: true,
      });
      // Receivers may answer with the ticket they created
      const extId = res.json?.external_id ?? res.json?.ticket_id ?? res.json?.id;
      if (extId) await this.linkExternal(conn, sc.id, String(extId), res.json?.external_url ?? res.json?.url ?? null, res.json?.status ?? null);
      return;
    }

    // 4xx other than timeout / rate-limit won't fix themselves — stop retrying
    const permanent = res.status >= 400 && res.status < 500 && ![408, 425, 429].includes(res.status);
    const giveUp = permanent || attempts >= MAX_ATTEMPTS;
    await this.deliveryRepo.update(d.id, {
      status: giveUp ? 'failed' : 'queued',
      attempts,
      response_code: res.status || null,
      last_error: res.error,
      payload: payload as any,
      next_attempt_at: giveUp ? null : new Date(Date.now() + RETRY_DELAYS_MIN[attempts - 1] * 60_000),
    });
    conn.last_error = res.error;
    if (giveUp) {
      const recentFailures = await this.deliveryRepo.count({
        where: { connection_id: conn.id, status: 'failed', updated_at: MoreThanOrEqual(new Date(Date.now() - 86_400_000)) },
      });
      if (recentFailures >= 5) conn.status = 'error';
    }
    await this.connRepo.save(conn);
  }

  private async linkExternal(conn: IntegrationConnectionEntity, caseId: string, externalId: string, url: string | null, status: string | null) {
    const existing = await this.mappingRepo.findOne({ where: { business_id: conn.business_id, object_type: 'support_case', internal_id: caseId, connection_id: conn.id } });
    if (existing) {
      existing.external_id = externalId.slice(0, 255);
      if (url) existing.external_url = url.slice(0, 500);
      if (status) existing.external_status = String(status).slice(0, 60);
      await this.mappingRepo.save(existing);
      return existing;
    }
    return this.mappingRepo.save(this.mappingRepo.create({
      id: uuidv4(),
      business_id: conn.business_id,
      connection_id: conn.id,
      provider: conn.provider,
      object_type: 'support_case',
      internal_id: caseId,
      external_id: externalId.slice(0, 255),
      external_url: url?.slice(0, 500) ?? null,
      external_status: status ? String(status).slice(0, 60) : null,
    }));
  }

  // ── Delivery queue (dashboard) ────────────────────────────────────────────

  async listDeliveries(actor: Actor, status?: string) {
    const businessId = this.businessOf(actor);
    const where: Record<string, any> = { business_id: businessId };
    if (status) where.status = status;
    const rows = await this.deliveryRepo.find({ where, order: { created_at: 'DESC' }, take: 200 });
    const cases = rows.length ? await this.caseRepo.find({ where: { id: In([...new Set(rows.map((r) => r.case_id))]) } }) : [];
    const caseById = new Map(cases.map((c) => [c.id, c]));
    const maps = rows.length
      ? await this.mappingRepo.find({ where: { business_id: businessId, object_type: 'support_case', internal_id: In(rows.map((r) => r.case_id)) } })
      : [];
    return rows.map((r) => {
      const c = caseById.get(r.case_id);
      const m = maps.find((x) => x.internal_id === r.case_id && x.connection_id === r.connection_id);
      return {
        ...r,
        payload: undefined,
        case: c ? { reference: c.id.slice(0, 8).toUpperCase(), summary: c.summary ?? c.symptoms, safety_flag: c.safety_flag, customer_name: c.customer_name, completeness: c.completeness } : null,
        external: m ? { id: m.external_id, url: m.external_url, status: m.external_status } : null,
      };
    });
  }

  private async ownDelivery(actor: Actor, id: string) {
    const d = await this.deliveryRepo.findOne({ where: { id } });
    if (!d || d.business_id !== this.businessOf(actor)) throw new NotFoundException('Delivery not found');
    return d;
  }

  async approveDelivery(actor: Actor, id: string) {
    const d = await this.ownDelivery(actor, id);
    if (d.status !== 'pending_approval') throw new BadRequestException('Only deliveries waiting for approval can be approved');
    await this.deliveryRepo.update(d.id, { status: 'queued', approved_by: actor.id ?? null, next_attempt_at: new Date() });
    await this.audit(d.business_id, actor, 'delivery.approved', { type: 'delivery', id: d.id }, { case_id: d.case_id });
    return { status: 'queued' };
  }

  async rejectDelivery(actor: Actor, id: string) {
    const d = await this.ownDelivery(actor, id);
    if (!['pending_approval', 'failed', 'queued'].includes(d.status)) throw new BadRequestException('This delivery can no longer be cancelled');
    await this.deliveryRepo.update(d.id, { status: 'rejected' });
    await this.audit(d.business_id, actor, 'delivery.rejected', { type: 'delivery', id: d.id }, { case_id: d.case_id });
    return { status: 'rejected' };
  }

  async retryDelivery(actor: Actor, id: string) {
    const d = await this.ownDelivery(actor, id);
    if (d.status !== 'failed') throw new BadRequestException('Only failed deliveries can be retried');
    await this.deliveryRepo.update(d.id, { status: 'queued', next_attempt_at: new Date(), attempts: 0 });
    await this.audit(d.business_id, actor, 'delivery.retried', { type: 'delivery', id: d.id });
    return { status: 'queued' };
  }

  // ── Inbound webhook (ticket id / status back from the help desk) ──────────

  async handleInbound(connectionId: string, rawBody: string, signature: string | undefined) {
    const conn = await this.connRepo.findOne({ where: { id: connectionId } });
    if (!conn || !conn.secret_encrypted) throw new NotFoundException('Unknown connection');
    if (!this.verify(this.decrypt(conn.secret_encrypted), rawBody, signature)) {
      throw new UnauthorizedException('Invalid or expired signature');
    }

    let body: any;
    try { body = JSON.parse(rawBody); } catch { throw new BadRequestException('Body must be JSON'); }
    const eventId = String(body.event_id ?? '').slice(0, 255);
    if (!eventId) throw new BadRequestException('event_id is required');

    // Replays and duplicate events are acknowledged without reprocessing
    if (await this.eventRepo.findOne({ where: { connection_id: conn.id, external_event_id: eventId } })) {
      return { received: true, duplicate: true };
    }

    let status = 'processed';
    let error: string | null = null;
    try {
      const caseId = String(body.case_id ?? '');
      const sc = caseId ? await this.caseRepo.findOne({ where: { id: caseId } }) : null;
      if (!sc || sc.business_id !== conn.business_id) {
        status = 'ignored';
        error = 'case_id not found for this connection';
      } else {
        if (body.external_id) {
          await this.linkExternal(conn, sc.id, String(body.external_id), body.external_url ?? null, body.status ?? null);
        }
        const occurred = body.occurred_at ? new Date(body.occurred_at) : new Date();
        const base = { source: 'helpdesk' as const, source_ref: eventId, occurred_at: occurred };
        const type = String(body.type ?? 'case.updated');

        if (type === 'appointment.scheduled' || type === 'appointment.updated') {
          const a = body.appointment ?? {};
          const window = [a.start, a.end].filter(Boolean).map((t: string) => new Date(t).toLocaleString()).join(' – ');
          await this.caseEvents.record(sc, {
            ...base, type: 'appointment', status: 'appointment_scheduled',
            title: type === 'appointment.updated' ? 'Visit rescheduled' : 'Technician visit booked',
            detail: [window, a.technician ? `Technician: ${a.technician}` : null].filter(Boolean).join(' · ') || null,
            data: { start: a.start ?? null, end: a.end ?? null, technician: a.technician ?? null },
            notify: true,
          });
        } else if (type === 'part.updated') {
          const p = body.part ?? {};
          // Compatibility, stock and delivery estimate are kept as separate facts
          await this.caseEvents.record(sc, {
            ...base, type: 'part_update', status: mapProviderStatus(body.status, conn.config?.status_map) ?? 'parts_ordered',
            title: `Part update${p.name ? `: ${p.name}` : ''}`,
            detail: [p.status ? `Status: ${p.status}` : null, p.eta ? `Estimated delivery (from supplier): ${new Date(p.eta).toDateString()}` : null].filter(Boolean).join(' · ') || null,
            data: { name: p.name ?? null, part_number: p.part_number ?? null, status: p.status ?? null, eta: p.eta ?? null },
            notify: true,
          });
        } else if (type === 'comment.added') {
          const isPublic = body.public === true;
          await this.caseEvents.record(sc, {
            ...base, type: 'comment', title: isPublic ? 'Message from the service team' : 'Internal note from the help desk',
            detail: String(body.comment ?? '').slice(0, 2000) || null, visible_to_customer: isPublic, notify: isPublic,
          });
        } else {
          const mapped = type === 'case.closed' ? 'closed' : mapProviderStatus(body.status, conn.config?.status_map);
          if (mapped && mapped !== sc.canonical_status) {
            await this.caseEvents.record(sc, {
              ...base, type: 'status_changed', status: mapped,
              title: CASE_STATUS_LABEL[mapped], detail: body.message ? String(body.message).slice(0, 1000) : null,
              data: { provider_status: body.status ?? null }, notify: true,
            });
          }
          if ((mapped === 'resolved' || mapped === 'closed') && sc.outcome !== SupportCaseOutcome.RESOLVED_BY_AI) {
            sc.outcome = SupportCaseOutcome.CLOSED;
            if (body.resolution_note) sc.resolution_note = String(body.resolution_note).slice(0, 4000);
            await this.caseRepo.save(sc);
          }
        }
      }
    } catch (err: any) {
      status = 'failed';
      error = String(err?.message ?? err).slice(0, 500);
    }

    await this.eventRepo.save(this.eventRepo.create({
      id: uuidv4(), connection_id: conn.id, external_event_id: eventId,
      type: String(body.type ?? 'case.updated').slice(0, 60), status, error,
    }));
    if (status === 'processed') {
      await this.audit(conn.business_id, 'webhook', 'webhook.received', { type: 'connection', id: conn.id }, { type: body.type, case_id: body.case_id });
    }
    return { received: true, status };
  }

  // ── Sync runs ─────────────────────────────────────────────────────────────

  private startRun(businessId: string, type: string, connectionId: string | null, actor: Actor, source?: string) {
    return this.runRepo.save(this.runRepo.create({
      id: uuidv4(), business_id: businessId, connection_id: connectionId, type, status: 'running',
      source_name: source?.slice(0, 255) ?? null, started_by: actor.id ?? null,
    }));
  }

  private async finishRun(run: SyncRunEntity, status: string, counts: Record<string, number>, errors: string[]) {
    run.status = status;
    run.counts = counts;
    run.errors = errors.slice(0, 50);
    run.finished_at = new Date();
    await this.runRepo.save(run);
  }

  listRuns(actor: Actor) {
    return this.runRepo.find({ where: { business_id: this.businessOf(actor) }, order: { started_at: 'DESC' }, take: 100 });
  }

  // ── Catalogue import (file connector) ─────────────────────────────────────

  private async matchIndex(businessId: string) {
    const appliances = await this.applianceRepo.find({ where: { business_id: businessId } });
    const ids = await this.identifierRepo.find({ where: { business_id: businessId } });
    const index = new Map<string, Set<string>>();
    const add = (code: string | null | undefined, applianceId: string) => {
      const n = normalizeCode(code ?? '');
      if (!n) return;
      if (!index.has(n)) index.set(n, new Set());
      index.get(n)!.add(applianceId);
    };
    for (const a of appliances) { add(a.model, a.id); add(a.sku, a.id); }
    for (const i of ids) add(i.normalized, i.appliance_id);
    return { appliances, index };
  }

  /**
   * Parse a CSV, suggest a column mapping and classify each row as new,
   * update, ambiguous or invalid. Nothing is written.
   */
  async previewCatalog(actor: Actor, body: { csv?: string; mapping?: Partial<Record<CatalogField, string>> }) {
    const businessId = this.businessOf(actor);
    if (!body.csv?.trim()) throw new BadRequestException('Upload a CSV file');
    if (body.csv.length > 5_000_000) throw new BadRequestException('CSV is larger than 5 MB — split it into smaller files');
    const { headers, rows } = parseCsv(body.csv);
    if (!headers.length) throw new BadRequestException('The CSV has no header row');
    if (rows.length > 5000) throw new BadRequestException('Import at most 5,000 products at a time');

    const mapping = { ...guessMapping(headers), ...(body.mapping ?? {}) };
    const { appliances, index } = await this.matchIndex(businessId);
    const nameOf = new Map(appliances.map((a) => [a.id, a.name]));
    const col = (row: Record<string, string>, f: CatalogField) => (mapping[f] ? (row[mapping[f]!] ?? '').trim() : '');

    const seen = new Map<string, number>();
    const preview = rows.map((row, i) => {
      const record = Object.fromEntries(CATALOG_FIELDS.map((f) => [f.key, col(row, f.key)])) as Record<CatalogField, string>;
      const problems: string[] = [];
      if (!record.name) problems.push('Missing product name');
      if (!record.model) problems.push('Missing model number');
      const key = normalizeCode(record.model);
      if (key) seen.set(key, (seen.get(key) ?? 0) + 1);
      const matches = key ? [...(index.get(key) ?? [])] : [];
      return { line: i + 2, record, problems, key, matches };
    });

    const result = preview.map((p) => {
      let status: 'new' | 'update' | 'ambiguous' | 'invalid';
      let reason = '';
      if (p.problems.length) { status = 'invalid'; reason = p.problems.join('; '); }
      else if ((seen.get(p.key) ?? 0) > 1) { status = 'ambiguous'; reason = 'This model appears more than once in the file'; }
      else if (p.matches.length > 1) { status = 'ambiguous'; reason = `Matches ${p.matches.length} existing products`; }
      else if (p.matches.length === 1) { status = 'update'; reason = `Updates "${nameOf.get(p.matches[0])}"`; }
      else { status = 'new'; reason = 'New product'; }
      return {
        line: p.line,
        status,
        reason,
        record: p.record,
        match_ids: p.matches,
        match_names: p.matches.map((m) => nameOf.get(m) ?? m),
      };
    });

    const count = (s: string) => result.filter((r) => r.status === s).length;
    return {
      headers,
      mapping,
      fields: CATALOG_FIELDS,
      rows: result,
      summary: { total: result.length, new: count('new'), update: count('update'), ambiguous: count('ambiguous'), invalid: count('invalid') },
    };
  }

  /**
   * Import rows the admin confirmed. Ambiguous rows are skipped unless the
   * admin chose which existing product they belong to (resolve[line] = id).
   */
  async importCatalog(actor: Actor, body: {
    csv?: string; mapping?: Partial<Record<CatalogField, string>>; file_name?: string;
    resolve?: Record<string, string>; skip_lines?: number[];
  }) {
    const businessId = this.businessOf(actor);
    const preview = await this.previewCatalog(actor, { csv: body.csv, mapping: body.mapping });
    const run = await this.startRun(businessId, 'catalog_import', null, actor, body.file_name ?? 'catalogue.csv');
    const skip = new Set(body.skip_lines ?? []);
    const counts = { created: 0, updated: 0, skipped: 0, failed: 0 };
    const errors: string[] = [];
    const ownIds = new Set((await this.applianceRepo.find({ where: { business_id: businessId }, select: ['id'] })).map((a) => a.id));

    for (const row of preview.rows) {
      if (skip.has(row.line) || row.status === 'invalid') { counts.skipped++; continue; }
      let targetId: string | null = row.status === 'update' ? row.match_ids[0] : null;
      if (row.status === 'ambiguous') {
        const chosen = body.resolve?.[String(row.line)];
        if (!chosen || !ownIds.has(chosen)) { counts.skipped++; errors.push(`Line ${row.line}: ambiguous — skipped (${row.reason})`); continue; }
        targetId = chosen;
      }
      const r = row.record;
      try {
        let applianceId: string;
        if (targetId) {
          const a = await this.applianceRepo.findOne({ where: { id: targetId } });
          if (!a) throw new Error('product disappeared');
          // Fill in, never blank out existing values
          if (r.name) a.name = r.name.slice(0, 255);
          if (r.category) a.category = r.category.slice(0, 100);
          if (r.description) (a as any).description = r.description;
          if (r.image_url) a.image_url = r.image_url.slice(0, 500);
          if (r.sku && !a.sku) a.sku = r.sku.slice(0, 100);
          await this.applianceRepo.save(a);
          applianceId = a.id;
          counts.updated++;
        } else {
          applianceId = uuidv4();
          await this.applianceRepo.save(this.applianceRepo.create({
            id: applianceId,
            business_id: businessId,
            name: r.name.slice(0, 255),
            model: r.model.slice(0, 255),
            sku: (r.sku || r.model).slice(0, 100),
            category: (r.category || 'Other').slice(0, 100),
            status: 'draft',
            description: r.description || null,
            image_url: r.image_url || null,
          } as any));
          counts.created++;
        }
        await this.addIdentifiers(businessId, applianceId, r);
      } catch (err: any) {
        counts.failed++;
        errors.push(`Line ${row.line}: ${String(err?.message ?? err).slice(0, 160)}`);
      }
    }

    const status = counts.failed && !counts.created && !counts.updated ? 'failed' : counts.failed || errors.length ? 'partial' : 'succeeded';
    await this.finishRun(run, status, counts, errors);
    await this.audit(businessId, actor, 'catalog.imported', { type: 'sync_run', id: run.id }, { file: body.file_name, ...counts });
    return { run_id: run.id, status, counts, errors };
  }

  private async addIdentifiers(businessId: string, applianceId: string, r: Record<CatalogField, string>) {
    const wanted: Array<{ type: string; value: string; region?: string }> = [];
    if (r.model) wanted.push({ type: 'model', value: r.model, region: r.region || undefined });
    if (r.ean) wanted.push({ type: 'ean', value: r.ean });
    for (const alias of (r.aliases ?? '').split(/[;|]/).map((s) => s.trim()).filter(Boolean)) wanted.push({ type: 'alias', value: alias });

    const existing = await this.identifierRepo.find({ where: { appliance_id: applianceId } });
    const have = new Set(existing.map((e) => `${e.identifier_type}:${e.normalized}`));
    for (const w of wanted) {
      const normalized = normalizeCode(w.value);
      if (!normalized || have.has(`${w.type}:${normalized}`)) continue;
      await this.identifierRepo.save(this.identifierRepo.create({
        id: uuidv4(), business_id: businessId, appliance_id: applianceId,
        identifier_type: w.type, value: w.value.slice(0, 120), normalized: normalized.slice(0, 120),
        region: w.region?.slice(0, 20) ?? null, source: 'catalog_import',
      }));
    }
  }

  // ── Overview ──────────────────────────────────────────────────────────────

  async overview(actor: Actor) {
    const businessId = this.businessOf(actor);
    const [connections, products, identifiers, lastImport, pending, failed, delivered] = await Promise.all([
      this.connRepo.find({ where: { business_id: businessId } }),
      this.applianceRepo.count({ where: { business_id: businessId } }),
      this.identifierRepo.count({ where: { business_id: businessId } }),
      this.runRepo.findOne({ where: { business_id: businessId, type: 'catalog_import' }, order: { started_at: 'DESC' } }),
      this.deliveryRepo.count({ where: { business_id: businessId, status: 'pending_approval' } }),
      this.deliveryRepo.count({ where: { business_id: businessId, status: 'failed' } }),
      this.deliveryRepo.count({ where: { business_id: businessId, status: 'delivered', delivered_at: MoreThanOrEqual(new Date(Date.now() - 30 * 86_400_000)) } }),
    ]);
    return {
      connections: { total: connections.length, active: connections.filter((c) => c.status === 'active').length, error: connections.filter((c) => c.status === 'error').length },
      products,
      identifiers,
      last_import: lastImport,
      deliveries: { pending_approval: pending, failed, delivered_30d: delivered },
      stale_cases: await this.staleCaseCount(businessId),
    };
  }

  /** Cases linked to a help-desk ticket that are still open but have had no update for CASE_STALE_DAYS. */
  private async staleCaseCount(businessId: string) {
    const days = Math.max(1, Number(this.config.get('CASE_STALE_DAYS') ?? 3));
    const linked = await this.mappingRepo.find({ where: { business_id: businessId, object_type: 'support_case' }, select: ['internal_id'] });
    if (!linked.length) return 0;
    const open = ['received', 'sent_to_service', 'awaiting_customer', 'appointment_scheduled', 'parts_ordered', 'in_repair'];
    const cases = await this.caseRepo.find({ where: { id: In(linked.map((l) => l.internal_id)), canonical_status: In(open) } });
    return cases.filter((c) => Date.now() - new Date(c.last_event_at ?? c.updated_at).getTime() > days * 86_400_000).length;
  }
}
