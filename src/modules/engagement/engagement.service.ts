import {
  BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException,
  OnModuleDestroy, OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { In, IsNull, LessThanOrEqual, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

import {
  CampaignEntity, CampaignEventEntity, SubscriberEntity, NotificationJobEntity,
  CAMPAIGN_MOMENTS, CAMPAIGN_CHANNELS,
} from '../../entities/engagement.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { SupportCaseEntity } from '../../entities/support-case.entity.js';
import { WarrantyRegistrationEntity } from '../../entities/warranty-registration.entity.js';
import { CasesService } from '../cases/cases.service.js';
import { RecallsService } from '../cases/recalls.service.js';
import { ChannelsService, type SendResult } from './channels.service.js';

type Notices = Awaited<ReturnType<RecallsService['activeFor']>>;

export type Actor = { id?: string | null; email?: string | null; business_id?: string | null };

const OFFER_TYPES = ['accessory', 'consumable', 'extended_warranty', 'upgrade', 'new_launch', 'service_plan', 'other'];
const RETRY_MIN = [5, 30, 120];
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/**
 * Brand engagement on the web: campaigns shown at the right moment in the
 * chat, and consented reminders/offers by email, browser push and WhatsApp.
 */
@Injectable()
export class EngagementService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EngagementService.name);
  private timers: NodeJS.Timeout[] = [];
  private sending = false;
  private scheduling = false;

  constructor(
    @InjectRepository(CampaignEntity) private campaignRepo: Repository<CampaignEntity>,
    @InjectRepository(CampaignEventEntity) private eventRepo: Repository<CampaignEventEntity>,
    @InjectRepository(SubscriberEntity) private subRepo: Repository<SubscriberEntity>,
    @InjectRepository(NotificationJobEntity) private jobRepo: Repository<NotificationJobEntity>,
    @InjectRepository(ApplianceEntity) private applianceRepo: Repository<ApplianceEntity>,
    @InjectRepository(SupportCaseEntity) private caseRepo: Repository<SupportCaseEntity>,
    @InjectRepository(WarrantyRegistrationEntity) private warrantyRepo: Repository<WarrantyRegistrationEntity>,
    private cases: CasesService,
    private recalls: RecallsService,
    private channels: ChannelsService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    if (process.env.ENGAGEMENT_WORKER === 'false') return;
    this.timers.push(setInterval(() => void this.processOutbox(), 30_000));
    this.timers.push(setInterval(() => void this.scheduleReminders(), 60 * 60_000));
    setTimeout(() => void this.scheduleReminders(), 60_000);
  }

  onModuleDestroy() {
    this.timers.forEach(clearInterval);
  }

  private get appBase() {
    return (this.config.get<string>('app.baseUrl') || 'http://localhost:3000').replace(/\/$/, '');
  }

  private get apiBase() {
    return (this.config.get<string>('app.apiPublicUrl') || 'http://localhost:3001').replace(/\/$/, '');
  }

  private businessOf(actor: Actor) {
    if (!actor.business_id) throw new ForbiddenException('Your account is not linked to a business');
    return actor.business_id;
  }

  /** Minimum days between two marketing messages to the same person. */
  private get marketingGapDays() {
    return Math.max(1, Number(this.config.get('MARKETING_MIN_DAYS_BETWEEN') ?? 7));
  }

  // ── Campaigns (dashboard) ─────────────────────────────────────────────────

  private cleanCampaign(body: Record<string, any>): Partial<CampaignEntity> {
    const out: Partial<CampaignEntity> = {};
    const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
    const list = (v: unknown, allowed?: readonly string[]) =>
      Array.isArray(v) ? v.map(String).filter((x) => !allowed || allowed.includes(x)) : null;
    if (body.name !== undefined) out.name = str(body.name, 120);
    if (body.headline !== undefined) out.headline = str(body.headline, 120);
    if (body.body !== undefined) out.body = str(body.body, 2000) || null;
    if (body.image_url !== undefined) out.image_url = str(body.image_url, 500) || null;
    if (body.cta_label !== undefined) out.cta_label = str(body.cta_label, 40) || 'View offer';
    if (body.cta_url !== undefined) {
      const url = str(body.cta_url, 500);
      if (!/^https?:\/\//i.test(url)) throw new BadRequestException('The offer link must start with https://');
      out.cta_url = url;
    }
    if (body.coupon_code !== undefined) out.coupon_code = str(body.coupon_code, 60) || null;
    if (body.offer_type !== undefined) out.offer_type = OFFER_TYPES.includes(body.offer_type) ? body.offer_type : 'other';
    if (body.target_appliance_ids !== undefined) out.target_appliance_ids = list(body.target_appliance_ids)?.length ? list(body.target_appliance_ids) : null;
    if (body.target_categories !== undefined) out.target_categories = list(body.target_categories)?.length ? list(body.target_categories) : null;
    if (body.moments !== undefined) out.moments = list(body.moments, CAMPAIGN_MOMENTS);
    if (body.channels !== undefined) out.channels = list(body.channels, CAMPAIGN_CHANNELS);
    if (body.starts_at !== undefined) out.starts_at = body.starts_at ? new Date(body.starts_at) : null;
    if (body.ends_at !== undefined) out.ends_at = body.ends_at ? new Date(body.ends_at) : null;
    if (body.priority !== undefined) out.priority = Math.max(0, Math.min(100, Number(body.priority) || 0));
    return out;
  }

  listCampaigns(actor: Actor) {
    return this.campaignRepo.find({ where: { business_id: this.businessOf(actor) }, order: { created_at: 'DESC' } });
  }

  async createCampaign(actor: Actor, body: Record<string, any>) {
    const businessId = this.businessOf(actor);
    const fields = this.cleanCampaign(body);
    if (!fields.headline || !fields.cta_url) throw new BadRequestException('A headline and an offer link are required');
    return this.campaignRepo.save(this.campaignRepo.create({
      id: uuidv4(), business_id: businessId, status: 'draft', created_by: actor.id ?? null,
      name: fields.name || fields.headline, moments: ['after_fix'], channels: ['chat'], ...fields,
    }));
  }

  private async ownCampaign(actor: Actor, id: string) {
    const c = await this.campaignRepo.findOne({ where: { id } });
    if (!c || c.business_id !== this.businessOf(actor)) throw new NotFoundException('Campaign not found');
    return c;
  }

  async updateCampaign(actor: Actor, id: string, body: Record<string, any>) {
    const c = await this.ownCampaign(actor, id);
    Object.assign(c, this.cleanCampaign(body));
    if (['draft', 'active', 'paused', 'ended'].includes(body.status)) c.status = body.status;
    return this.campaignRepo.save(c);
  }

  async deleteCampaign(actor: Actor, id: string) {
    await this.ownCampaign(actor, id);
    await this.jobRepo.update({ campaign_id: id, status: 'queued' }, { status: 'skipped', error: 'Campaign deleted' });
    await this.campaignRepo.delete({ id });
    return { deleted: true };
  }

  async campaignStats(actor: Actor, id: string, days = 30) {
    const c = await this.ownCampaign(actor, id);
    const since = new Date(Date.now() - days * 86_400_000);
    const rows = await this.eventRepo
      .createQueryBuilder('e')
      .select('DATE(e.created_at)', 'day')
      .addSelect('e.type', 'type')
      .addSelect('e.channel', 'channel')
      .addSelect('COUNT(*)', 'n')
      .where('e.campaign_id = :id AND e.created_at >= :since', { id: c.id, since })
      .groupBy('day').addGroupBy('e.type').addGroupBy('e.channel')
      .getRawMany();
    const byChannel: Record<string, Record<string, number>> = {};
    const daily = new Map<string, { date: string; impressions: number; clicks: number; sends: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      daily.set(d, { date: d, impressions: 0, clicks: 0, sends: 0 });
    }
    for (const r of rows) {
      const n = Number(r.n);
      const day = new Date(r.day).toISOString().slice(0, 10);
      const key = r.type === 'impression' ? 'impressions' : r.type === 'click' ? 'clicks' : 'sends';
      const bucket = daily.get(day);
      if (bucket) bucket[key] += n;
      byChannel[r.channel] ??= { impression: 0, click: 0, send: 0 };
      byChannel[r.channel][r.type] = (byChannel[r.channel][r.type] ?? 0) + n;
    }
    const views = c.impressions + c.sends;
    return {
      campaign: c,
      totals: { impressions: c.impressions, sends: c.sends, clicks: c.clicks, ctr: views ? Math.round((c.clicks / views) * 1000) / 10 : null },
      by_channel: byChannel,
      daily: [...daily.values()],
    };
  }

  // ── Audience & sending (outbound campaigns) ───────────────────────────────

  private async targetApplianceIds(c: CampaignEntity): Promise<string[]> {
    const appliances = await this.applianceRepo.find({ where: { business_id: c.business_id }, select: ['id', 'category'] });
    return appliances
      .filter((a) =>
        (!c.target_appliance_ids?.length || c.target_appliance_ids.includes(a.id)) &&
        (!c.target_categories?.length || c.target_categories.includes(a.category)))
      .map((a) => a.id);
  }

  /** Who would receive this campaign right now, per channel — respecting consent and frequency caps. */
  private async audience(c: CampaignEntity) {
    const ids = await this.targetApplianceIds(c);
    if (!ids.length) return { subscribers: [] as SubscriberEntity[], channelOf: new Map<string, string>() };
    const capBefore = new Date(Date.now() - this.marketingGapDays * 86_400_000);
    const subs = await this.subRepo.find({
      where: { appliance_id: In(ids), consent_marketing: true, unsubscribed_at: IsNull() },
    });
    const outbound = (c.channels ?? []).filter((ch) => ch !== 'chat');
    const ready = this.channels.status();
    const channelOf = new Map<string, string>();
    for (const s of subs) {
      if (s.last_marketing_at && s.last_marketing_at > capBefore) continue;
      const ch = this.pickChannel(s, outbound, ready);
      if (ch) channelOf.set(s.id, ch);
    }
    return { subscribers: subs.filter((s) => channelOf.has(s.id)), channelOf };
  }

  /** One message per person: WhatsApp, then push, then email — whichever they enabled and we can send. */
  private pickChannel(s: SubscriberEntity, allowed: string[], ready: ReturnType<ChannelsService['status']>): string | null {
    if (allowed.includes('whatsapp') && s.whatsapp_enabled && s.phone && ready.whatsapp) return 'whatsapp';
    if (allowed.includes('push') && s.push_enabled && s.push_subscription && ready.push) return 'push';
    if (allowed.includes('email') && s.email_enabled && s.email && ready.email) return 'email';
    return null;
  }

  async audiencePreview(actor: Actor, id: string) {
    const c = await this.ownCampaign(actor, id);
    const { channelOf } = await this.audience(c);
    const byChannel: Record<string, number> = {};
    for (const ch of channelOf.values()) byChannel[ch] = (byChannel[ch] ?? 0) + 1;
    return { total: channelOf.size, by_channel: byChannel, frequency_cap_days: this.marketingGapDays };
  }

  async sendCampaign(actor: Actor, id: string) {
    const c = await this.ownCampaign(actor, id);
    if (c.status !== 'active') throw new BadRequestException('Activate the campaign before sending it');
    const { subscribers, channelOf } = await this.audience(c);
    let queued = 0;
    for (const s of subscribers) {
      const ok = await this.enqueue({
        business_id: c.business_id, subscriber_id: s.id, campaign_id: c.id, kind: 'campaign',
        channel: channelOf.get(s.id)!, dedupe_key: `campaign:${c.id}:${s.id}`,
        payload: { campaign_id: c.id },
      });
      if (ok) {
        queued++;
        await this.subRepo.update(s.id, { last_marketing_at: new Date() });
      }
    }
    return { queued };
  }

  // ── Chat placement (public) ───────────────────────────────────────────────

  /**
   * The best campaign for this product and moment, or null. Never during a
   * safety stop or while a safety recall is active.
   */
  async placement(applianceId: string, moment: string, sessionId?: string) {
    if (!CAMPAIGN_MOMENTS.includes(moment as any)) return null;
    const appliance = await this.applianceRepo.findOne({ where: { id: applianceId } });
    if (!appliance) return null;

    if (sessionId) {
      const safety = await this.caseRepo.findOne({ where: { session_id: sessionId, safety_flag: Not(IsNull()) } });
      if (safety) return null;
    }
    const notices = await this.recalls.activeFor(applianceId).catch(() => [] as Notices);
    if (notices.some((n) => n.severity === 'safety')) return null;

    const now = new Date();
    const active = await this.campaignRepo.find({ where: { business_id: appliance.business_id, status: 'active' } });
    const fits = active.filter((c) =>
      (c.channels ?? []).includes('chat') &&
      (!c.moments?.length || c.moments.includes(moment)) &&
      (!c.starts_at || c.starts_at <= now) && (!c.ends_at || c.ends_at >= now) &&
      (!c.target_appliance_ids?.length || c.target_appliance_ids.includes(applianceId)) &&
      (!c.target_categories?.length || c.target_categories.includes(appliance.category)));
    if (!fits.length) return null;

    const top = Math.max(...fits.map((c) => c.priority));
    const pool = fits.filter((c) => c.priority === top);
    const c = pool[Math.floor(Math.random() * pool.length)];

    await this.track(c, 'impression', 'chat', { appliance_id: applianceId, session_id: sessionId ?? null });
    return {
      id: c.id,
      offer_type: c.offer_type,
      headline: c.headline,
      body: c.body,
      image_url: c.image_url,
      cta_label: c.cta_label,
      coupon_code: c.coupon_code,
      click_url: this.clickUrl(c.id, 'chat', { session: sessionId }),
      sponsor: 'Offer from the manufacturer',
    };
  }

  private clickUrl(campaignId: string, channel: string, ids: { session?: string | null; subscriber?: string | null } = {}) {
    const q = new URLSearchParams({ ch: channel });
    if (ids.session) q.set('sid', ids.session);
    if (ids.subscriber) q.set('s', ids.subscriber);
    return `${this.apiBase}/api/c/${campaignId}?${q.toString()}`;
  }

  private async track(c: CampaignEntity, type: 'impression' | 'click' | 'send', channel: string, ids: { appliance_id?: string | null; session_id?: string | null; subscriber_id?: string | null }) {
    try {
      await this.eventRepo.insert({
        id: uuidv4(), campaign_id: c.id, business_id: c.business_id, type, channel,
        appliance_id: ids.appliance_id ?? null, session_id: ids.session_id ?? null, subscriber_id: ids.subscriber_id ?? null,
      });
      const column = type === 'impression' ? 'impressions' : type === 'click' ? 'clicks' : 'sends';
      await this.campaignRepo.increment({ id: c.id }, column, 1);
    } catch (err) {
      this.logger.warn(`Campaign tracking failed: ${err}`);
    }
  }

  /** Records a click and returns the brand's URL with UTM tags, for a 302 redirect. */
  async click(campaignId: string, channel: string, sessionId?: string, subscriberId?: string): Promise<string> {
    const c = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!c) return this.appBase;
    await this.track(c, 'click', CAMPAIGN_CHANNELS.includes(channel as any) ? channel : 'chat', {
      session_id: sessionId?.slice(0, 36) ?? null, subscriber_id: subscriberId?.slice(0, 36) ?? null,
    });
    const url = new URL(c.cta_url);
    url.searchParams.set('utm_source', 'scana');
    url.searchParams.set('utm_medium', channel || 'chat');
    url.searchParams.set('utm_campaign', c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60));
    return url.toString();
  }

  // ── Subscriptions & consent (public) ──────────────────────────────────────

  async subscribe(body: {
    appliance_id?: string; session_id?: string; name?: string; email?: string; phone?: string;
    push_subscription?: Record<string, any>; email_enabled?: boolean; push_enabled?: boolean; whatsapp_enabled?: boolean;
    consent_service?: boolean; consent_marketing?: boolean; consent_text?: string;
  }) {
    const appliance = body.appliance_id ? await this.applianceRepo.findOne({ where: { id: body.appliance_id } }) : null;
    if (!appliance) throw new NotFoundException('Product not found');

    const email = body.email?.trim().toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Enter a valid email address');
    let phone = body.phone?.replace(/[^\d+]/g, '') || null;
    if (phone && !phone.startsWith('+')) phone = phone.length === 10 ? `+91${phone}` : `+${phone}`; // 10 digits → India
    if (phone && !/^\+\d{8,15}$/.test(phone)) throw new BadRequestException('Enter a valid phone number with country code');
    const push = body.push_subscription?.endpoint ? body.push_subscription : null;
    if (!email && !phone && !push) throw new BadRequestException('Add an email, a WhatsApp number or allow notifications');

    // Same person + product → update their preferences instead of duplicating
    const candidates = await this.subRepo.find({ where: { appliance_id: appliance.id } });
    const existing = candidates.find((s) =>
      (email && s.email === email) || (phone && s.phone === phone) ||
      (push && s.push_subscription?.endpoint === push.endpoint));

    const s = existing ?? this.subRepo.create({
      id: uuidv4(), business_id: appliance.business_id, appliance_id: appliance.id,
      unsubscribe_token: crypto.randomBytes(24).toString('hex'),
    });
    s.name = body.name?.trim().slice(0, 255) || s.name || null;
    s.email = email ?? s.email ?? null;
    s.phone = phone ?? s.phone ?? null;
    if (push) s.push_subscription = push;
    s.email_enabled = Boolean(s.email) && body.email_enabled !== false;
    s.push_enabled = Boolean(s.push_subscription) && (body.push_enabled ?? Boolean(push));
    s.whatsapp_enabled = Boolean(s.phone) && body.whatsapp_enabled !== false;
    s.consent_service = body.consent_service !== false;
    s.consent_marketing = body.consent_marketing === true;
    s.unsubscribed_at = null;
    s.session_id = body.session_id?.slice(0, 36) ?? s.session_id ?? null;
    s.consent_record = {
      at: new Date().toISOString(),
      source: 'chat_page',
      text: (body.consent_text ?? '').slice(0, 500),
      service: s.consent_service,
      marketing: s.consent_marketing,
    };
    await this.subRepo.save(s);
    return {
      id: s.id,
      preferences_url: `${this.appBase}/preferences/${s.unsubscribe_token}`,
      channels: { email: s.email_enabled, push: s.push_enabled, whatsapp: s.whatsapp_enabled },
    };
  }

  private async byToken(token: string) {
    const s = token ? await this.subRepo.findOne({ where: { unsubscribe_token: token } }) : null;
    if (!s) throw new NotFoundException('This link is no longer valid');
    return s;
  }

  async getPreferences(token: string) {
    const s = await this.byToken(token);
    const a = await this.applianceRepo.findOne({ where: { id: s.appliance_id } });
    return {
      product: a?.name ?? 'your product',
      email: s.email ? s.email.replace(/^(.).*(@.*)$/, '$1•••$2') : null,
      phone: s.phone ? `•••${s.phone.slice(-4)}` : null,
      email_enabled: s.email_enabled, push_enabled: s.push_enabled, whatsapp_enabled: s.whatsapp_enabled,
      consent_service: s.consent_service, consent_marketing: s.consent_marketing,
      unsubscribed: Boolean(s.unsubscribed_at),
    };
  }

  async updatePreferences(token: string, body: Record<string, any>) {
    const s = await this.byToken(token);
    if (body.unsubscribe_all) {
      s.consent_service = false;
      s.consent_marketing = false;
      s.unsubscribed_at = new Date();
    } else {
      for (const k of ['email_enabled', 'push_enabled', 'whatsapp_enabled', 'consent_service', 'consent_marketing'] as const) {
        if (typeof body[k] === 'boolean') (s as any)[k] = body[k];
      }
      if (s.consent_service || s.consent_marketing) s.unsubscribed_at = null;
    }
    await this.subRepo.save(s);
    if (!s.consent_marketing) {
      await this.jobRepo.update({ subscriber_id: s.id, kind: 'campaign', status: 'queued' }, { status: 'skipped', error: 'Unsubscribed' });
    }
    return this.getPreferences(token);
  }

  /** WhatsApp "STOP" / "UNSUBSCRIBE" replies turn off WhatsApp marketing for that number. */
  async whatsappOptOut(phoneDigits: string) {
    const phone = `+${phoneDigits.replace(/\D/g, '')}`;
    const subs = await this.subRepo.find({ where: { phone } });
    for (const s of subs) {
      s.whatsapp_enabled = false;
      s.consent_marketing = false;
      await this.subRepo.save(s);
    }
    return subs.length;
  }

  // ── Subscribers (dashboard) ───────────────────────────────────────────────

  async subscriberSummary(actor: Actor) {
    const businessId = this.businessOf(actor);
    const subs = await this.subRepo.find({ where: { business_id: businessId } });
    const active = subs.filter((s) => !s.unsubscribed_at);
    const names = new Map((await this.applianceRepo.find({ where: { business_id: businessId }, select: ['id', 'name'] })).map((a) => [a.id, a.name]));
    return {
      total: active.length,
      marketing: active.filter((s) => s.consent_marketing).length,
      service: active.filter((s) => s.consent_service).length,
      unsubscribed: subs.length - active.length,
      channels: {
        email: active.filter((s) => s.email_enabled && s.email).length,
        push: active.filter((s) => s.push_enabled && s.push_subscription).length,
        whatsapp: active.filter((s) => s.whatsapp_enabled && s.phone).length,
      },
      recent: subs
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .slice(0, 50)
        .map((s) => ({
          id: s.id, name: s.name, appliance_name: names.get(s.appliance_id) ?? null,
          email: s.email, phone: s.phone ? `•••${s.phone.slice(-4)}` : null,
          push: Boolean(s.push_enabled && s.push_subscription),
          consent_marketing: s.consent_marketing, consent_service: s.consent_service,
          unsubscribed: Boolean(s.unsubscribed_at), created_at: s.created_at,
        })),
    };
  }

  async listJobs(actor: Actor) {
    const rows = await this.jobRepo.find({ where: { business_id: this.businessOf(actor) }, order: { created_at: 'DESC' }, take: 200 });
    return rows.map(({ payload, ...r }) => ({ ...r, title: payload?.title ?? null }));
  }

  pushPublicKey() {
    return this.channels.pushPublicKey();
  }

  channelStatus() {
    return { ...this.channels.status(), marketing_gap_days: this.marketingGapDays };
  }

  /** Send a test message to the admin through one channel, bypassing the outbox. */
  async sendTest(actor: Actor, body: { channel?: string; to?: string; push_subscription?: Record<string, any> }) {
    this.businessOf(actor);
    const message = {
      title: 'Scana test notification',
      body: 'If you can read this, this channel is set up correctly.',
      url: `${this.appBase}/dashboard/campaigns`,
    };
    let res: SendResult;
    if (body.channel === 'email') {
      if (!body.to) throw new BadRequestException('Enter an email address');
      res = await this.channels.email(body.to, message.title, `<p>${esc(message.body)}</p>`);
    } else if (body.channel === 'push') {
      if (!body.push_subscription?.endpoint) throw new BadRequestException('Allow notifications in this browser first');
      res = await this.channels.push(body.push_subscription, message);
    } else if (body.channel === 'whatsapp') {
      if (!body.to) throw new BadRequestException('Enter a WhatsApp number with country code');
      res = await this.channels.whatsapp(body.to, 'test', ['there', 'Scana', message.body]);
    } else {
      throw new BadRequestException('channel must be email, push or whatsapp');
    }
    return res;
  }

  // ── Reminder scheduling (service messages) ────────────────────────────────

  private async enqueue(job: Omit<NotificationJobEntity, 'id' | 'status' | 'attempts' | 'error' | 'sent_at' | 'created_at' | 'updated_at' | 'send_after'> & { send_after?: Date }) {
    try {
      await this.jobRepo.insert({ id: uuidv4(), status: 'queued', attempts: 0, send_after: job.send_after ?? new Date(), ...job } as any);
      return true;
    } catch {
      return false; // dedupe_key already exists — already sent or queued
    }
  }

  /**
   * Hourly: maintenance due, warranty ending in 30 days, and recalls — only
   * for subscribers who accepted service messages.
   */
  async scheduleReminders() {
    if (this.scheduling) return;
    this.scheduling = true;
    try {
      const ready = this.channels.status();
      const subs = await this.subRepo.find({ where: { consent_service: true, unsubscribed_at: IsNull() } });
      const byAppliance = new Map<string, SubscriberEntity[]>();
      for (const s of subs) byAppliance.set(s.appliance_id, [...(byAppliance.get(s.appliance_id) ?? []), s]);

      for (const [applianceId, list] of byAppliance) {
        const appliance = await this.applianceRepo.findOne({ where: { id: applianceId } });
        if (!appliance) continue;
        const [tasks, notices] = await Promise.all([
          this.cases.getMaintenance(applianceId).catch(() => []),
          this.recalls.activeFor(applianceId).catch(() => [] as Notices),
        ]);

        for (const s of list) {
          const channel = this.pickChannel(s, ['whatsapp', 'push', 'email'], ready);
          if (!channel) continue;
          const base = { business_id: s.business_id, subscriber_id: s.id, campaign_id: null, channel };

          // Maintenance: one reminder per interval since they subscribed
          for (const t of tasks) {
            if (!t.interval_days || t.interval_days < 7) continue;
            const periods = Math.floor((Date.now() - new Date(s.created_at).getTime()) / (t.interval_days * 86_400_000));
            if (periods < 1) continue;
            await this.enqueue({
              ...base, kind: 'maintenance_due', dedupe_key: `maint:${s.id}:${t.id}:${periods}`.slice(0, 191),
              payload: { title: `Time to ${t.title.charAt(0).toLowerCase()}${t.title.slice(1)}`, detail: `${t.title} (${t.frequency}).`, appliance_id: applianceId, product: appliance.name },
            });
          }

          // Warranty ending within 30 days
          if (s.email) {
            const regs = await this.warrantyRepo.find({ where: { appliance_id: applianceId, customer_email: s.email } });
            for (const r of regs) {
              if (!r.expiry_date) continue;
              const days = (new Date(r.expiry_date).getTime() - Date.now()) / 86_400_000;
              if (days <= 0 || days > 30) continue;
              await this.enqueue({
                ...base, kind: 'warranty_expiring', dedupe_key: `warranty:${r.id}:30`,
                payload: { title: 'Your warranty ends soon', detail: `Your ${appliance.name} warranty ends on ${new Date(r.expiry_date).toDateString()}.`, appliance_id: applianceId, product: appliance.name },
              });
            }
          }

          // Recalls — safety notices go on every channel the person enabled
          for (const n of notices) {
            const all = ['whatsapp', 'push', 'email'].filter((ch) => this.pickChannel(s, [ch], ready));
            for (const ch of n.severity === 'safety' ? all : [channel]) {
              await this.enqueue({
                ...base, channel: ch, kind: 'recall', dedupe_key: `recall:${n.id}:${s.id}:${ch}`,
                payload: { title: n.severity === 'safety' ? `Safety recall: ${n.title}` : `Product notice: ${n.title}`, detail: n.remedy, official_url: n.official_url, appliance_id: applianceId, product: appliance.name },
              });
            }
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Reminder scheduling failed: ${err}`);
    } finally {
      this.scheduling = false;
    }
  }

  // ── Outbox worker ─────────────────────────────────────────────────────────

  async processOutbox() {
    if (this.sending) return;
    this.sending = true;
    try {
      // Requeue jobs stuck mid-send (e.g. restart)
      await this.jobRepo.update(
        { status: 'sending', updated_at: LessThanOrEqual(new Date(Date.now() - 10 * 60_000)) },
        { status: 'queued' },
      );
      const due = await this.jobRepo.find({
        where: { status: 'queued', send_after: LessThanOrEqual(new Date()) },
        order: { created_at: 'ASC' },
        take: 50,
      });
      for (const job of due) {
        const claim = await this.jobRepo.update({ id: job.id, status: 'queued' }, { status: 'sending' });
        if (!claim.affected) continue;
        await this.send(job);
      }
    } catch (err) {
      this.logger.warn(`Outbox run failed: ${err}`);
    } finally {
      this.sending = false;
    }
  }

  private async send(job: NotificationJobEntity) {
    const s = await this.subRepo.findOne({ where: { id: job.subscriber_id } });
    const skip = (reason: string) => this.jobRepo.update(job.id, { status: 'skipped', error: reason });
    if (!s || s.unsubscribed_at) return skip('Unsubscribed');
    if (job.kind === 'campaign' && !s.consent_marketing) return skip('No marketing consent');
    if (job.kind !== 'campaign' && !s.consent_service) return skip('No consent for reminders');

    let campaign: CampaignEntity | null = null;
    if (job.campaign_id) {
      campaign = await this.campaignRepo.findOne({ where: { id: job.campaign_id } });
      if (!campaign || campaign.status !== 'active') return skip('Campaign no longer active');
    }

    const appliance = await this.applianceRepo.findOne({ where: { id: s.appliance_id } });
    const product = appliance?.name ?? 'your product';
    const chatUrl = `${this.appBase}/chat/${s.appliance_id}`;
    const prefsUrl = `${this.appBase}/preferences/${s.unsubscribe_token}`;
    const name = s.name?.split(' ')[0] || 'there';

    const msg = campaign
      ? {
          title: campaign.headline,
          detail: [campaign.body, campaign.coupon_code ? `Use code ${campaign.coupon_code}.` : null].filter(Boolean).join(' '),
          url: this.clickUrl(campaign.id, job.channel, { subscriber: s.id }),
          cta: campaign.cta_label,
        }
      : {
          title: String(job.payload.title ?? 'Update about your product'),
          detail: String(job.payload.detail ?? ''),
          url: job.payload.official_url || chatUrl,
          cta: job.kind === 'recall' ? 'Read the notice' : 'Open your product assistant',
        };

    let res: SendResult;
    if (job.channel === 'email') {
      res = s.email ? await this.channels.email(s.email, msg.title, this.emailHtml(name, product, msg, prefsUrl, job.kind === 'campaign'), `${this.apiBase}/api/engagement/preferences/${s.unsubscribe_token}/unsubscribe`) : { ok: false, error: 'No email', permanent: true };
    } else if (job.channel === 'push') {
      res = s.push_subscription
        ? await this.channels.push(s.push_subscription, { title: msg.title, body: msg.detail || product, url: msg.url, tag: job.kind })
        : { ok: false, error: 'No push subscription', permanent: true };
      if (!res.ok && res.permanent) await this.subRepo.update(s.id, { push_enabled: false, push_subscription: null as any });
    } else {
      const footer = job.kind === 'campaign' ? ' Reply STOP to opt out.' : '';
      res = s.phone ? await this.channels.whatsapp(s.phone, job.kind, [name, product, `${msg.title}. ${msg.detail} ${msg.url}${footer}`]) : { ok: false, error: 'No phone', permanent: true };
    }

    const attempts = job.attempts + 1;
    if (res.ok) {
      await this.jobRepo.update(job.id, { status: 'sent', attempts, sent_at: new Date(), error: null });
      if (campaign) await this.track(campaign, 'send', job.channel, { subscriber_id: s.id, appliance_id: s.appliance_id });
      return;
    }
    const giveUp = res.permanent || attempts > RETRY_MIN.length;
    await this.jobRepo.update(job.id, {
      status: giveUp ? 'failed' : 'queued', attempts, error: res.error ?? 'Send failed',
      send_after: giveUp ? null : new Date(Date.now() + RETRY_MIN[attempts - 1] * 60_000),
    });
  }

  private emailHtml(name: string, product: string, msg: { title: string; detail: string; url: string; cta: string }, prefsUrl: string, marketing: boolean) {
    return `<!doctype html><html><body style="margin:0;background:#F7F5FF;font-family:Arial,sans-serif;color:#1E1B4B">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:16px;padding:28px;border:1px solid #EDE9FE">
      <p style="font-size:12px;color:#6366F1;font-weight:bold;margin:0 0 8px">${esc(product)}</p>
      <h1 style="font-size:20px;margin:0 0 12px">${esc(msg.title)}</h1>
      <p style="font-size:14px;line-height:1.6;margin:0 0 20px">Hi ${esc(name)},<br>${esc(msg.detail)}</p>
      <a href="${esc(msg.url)}" style="display:inline-block;background:linear-gradient(135deg,#6366F1,#EC4899);color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold;font-size:14px">${esc(msg.cta)}</a>
    </div>
    <p style="font-size:11px;color:#8A909E;text-align:center;margin:16px 0 0">
      You get this because you asked for ${marketing ? 'offers' : 'reminders'} about your ${esc(product)}.
      <a href="${esc(prefsUrl)}" style="color:#6366F1">Change preferences or unsubscribe</a>.
    </p>
  </div></body></html>`;
  }
}
