import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { CaseEventEntity } from '../../entities/case-event.entity.js';
import { SupportCaseEntity } from '../../entities/support-case.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { CASE_STATUS_LABEL, type CaseStatus } from '../../common/case-status.js';
import { ChannelsService } from '../engagement/channels.service.js';

export type CaseEventInput = {
  type: string;
  title: string;
  detail?: string | null;
  status?: CaseStatus | null;
  data?: Record<string, any> | null;
  source: 'scana' | 'ai_chat' | 'customer' | 'helpdesk' | 'technician';
  source_ref?: string | null;
  visible_to_customer?: boolean;
  occurred_at?: Date;
  /** Email the customer about this event (status, appointment, parts — confirmed facts only) */
  notify?: boolean;
};

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Writes case timeline events and keeps the case's canonical status in step. */
@Injectable()
export class CaseEventsService {
  private readonly logger = new Logger(CaseEventsService.name);

  constructor(
    @InjectRepository(CaseEventEntity) private eventRepo: Repository<CaseEventEntity>,
    @InjectRepository(SupportCaseEntity) private caseRepo: Repository<SupportCaseEntity>,
    @InjectRepository(ApplianceEntity) private applianceRepo: Repository<ApplianceEntity>,
    private channels: ChannelsService,
    private config: ConfigService,
  ) {}

  async record(c: SupportCaseEntity, e: CaseEventInput): Promise<CaseEventEntity> {
    const occurred = e.occurred_at && !Number.isNaN(e.occurred_at.getTime()) ? e.occurred_at : new Date();
    const event = await this.eventRepo.save(this.eventRepo.create({
      id: uuidv4(),
      case_id: c.id,
      business_id: c.business_id,
      type: e.type,
      status: e.status ?? null,
      title: e.title.slice(0, 255),
      detail: e.detail?.slice(0, 4000) ?? null,
      data: e.data ?? null,
      source: e.source,
      source_ref: e.source_ref?.slice(0, 255) ?? null,
      visible_to_customer: e.visible_to_customer !== false,
      occurred_at: occurred,
    }));

    const patch: Partial<SupportCaseEntity> = { last_event_at: new Date() };
    // Don't let an older out-of-order event overwrite a newer status
    if (e.status && (!c.last_event_at || occurred >= new Date(c.last_event_at) || e.source !== 'helpdesk')) {
      patch.canonical_status = e.status;
    }
    await this.caseRepo.update(c.id, patch);
    Object.assign(c, patch);

    if (e.notify && event.visible_to_customer && c.customer_email && c.public_token) {
      void this.emailCustomer(c, event);
    }
    return event;
  }

  listForCase(caseId: string, customerView = false) {
    return this.eventRepo.find({
      where: customerView ? { case_id: caseId, visible_to_customer: true } : { case_id: caseId },
      order: { occurred_at: 'ASC', created_at: 'ASC' },
    });
  }

  private async emailCustomer(c: SupportCaseEntity, event: CaseEventEntity) {
    try {
      const appliance = await this.applianceRepo.findOne({ where: { id: c.appliance_id } });
      const appBase = (this.config.get<string>('app.baseUrl') || 'http://localhost:3000').replace(/\/$/, '');
      const url = `${appBase}/case/${c.public_token}`;
      const ref = c.id.slice(0, 8).toUpperCase();
      const status = c.canonical_status as CaseStatus;
      const html = `<!doctype html><html><body style="margin:0;background:#F7F5FF;font-family:Arial,sans-serif;color:#1E1B4B">
  <div style="max-width:560px;margin:0 auto;padding:24px"><div style="background:#fff;border-radius:16px;padding:28px;border:1px solid #EDE9FE">
    <p style="font-size:12px;color:#6366F1;font-weight:bold;margin:0 0 8px">${esc(appliance?.name ?? 'Your appliance')} · Case ${ref}</p>
    <h1 style="font-size:20px;margin:0 0 8px">${esc(event.title)}</h1>
    ${event.detail ? `<p style="font-size:14px;line-height:1.6;margin:0 0 12px">${esc(event.detail)}</p>` : ''}
    <p style="font-size:13px;color:#5B5B7E;margin:0 0 20px">Current status: <b>${esc(CASE_STATUS_LABEL[status] ?? status)}</b></p>
    <a href="${esc(url)}" style="display:inline-block;background:linear-gradient(135deg,#6366F1,#EC4899);color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold;font-size:14px">See your case</a>
  </div><p style="font-size:11px;color:#8A909E;text-align:center;margin:16px 0 0">You get this because you opened a support case. Updates come from the brand's service team.</p></div></body></html>`;
      const res = await this.channels.email(c.customer_email!, `Case ${ref}: ${event.title}`, html);
      if (!res.ok && !res.permanent) this.logger.warn(`Case update email failed: ${res.error}`);
    } catch (err) {
      this.logger.warn(`Case update email failed: ${err}`);
    }
  }
}
