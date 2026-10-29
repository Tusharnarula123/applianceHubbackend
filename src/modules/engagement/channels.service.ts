import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';

export type SendResult = { ok: boolean; error?: string; permanent?: boolean };

/** Template names per message kind; override with env vars once Meta approves them. */
const WHATSAPP_TEMPLATE_DEFAULTS: Record<string, string> = {
  maintenance_due: 'scana_maintenance_due',
  warranty_expiring: 'scana_warranty_expiring',
  recall: 'scana_recall_notice',
  campaign: 'scana_offer',
  repair_assigned: 'scana_repair_assigned',
  test: 'scana_maintenance_due',
};

/**
 * Outbound channels for reminders and campaigns:
 * - Email via MailerSend (MAILERSEND_API_TOKEN) or SendGrid (SENDGRID_API_KEY); sender FROM_EMAIL / FROM_NAME
 * - Browser push via VAPID (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)
 * - WhatsApp via Meta Cloud API (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, approved templates)
 * A channel without credentials reports itself as not configured instead of failing silently.
 */
@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);
  private pushReady = false;

  constructor(private config: ConfigService) {
    const pub = this.config.get<string>('VAPID_PUBLIC_KEY');
    const priv = this.config.get<string>('VAPID_PRIVATE_KEY');
    if (pub && priv) {
      try {
        webpush.setVapidDetails(this.config.get<string>('VAPID_SUBJECT') || 'mailto:support@scana.in', pub, priv);
        this.pushReady = true;
      } catch (err) {
        this.logger.warn(`VAPID keys are invalid — browser push disabled: ${err}`);
      }
    }
  }

  status() {
    return {
      email: Boolean(this.mailProvider()),
      email_provider: this.mailProvider(),
      push: this.pushReady,
      whatsapp: this.metaWhatsappReady(),
      whatsapp_twilio: Boolean(this.config.get('TWILIO_ACCOUNT_SID') && this.config.get('TWILIO_AUTH_TOKEN')),
      whatsapp_templates: Object.fromEntries(
        Object.keys(WHATSAPP_TEMPLATE_DEFAULTS).filter((k) => k !== 'test').map((k) => [k, this.templateFor(k)]),
      ),
    };
  }

  pushPublicKey(): string | null {
    return this.pushReady ? this.config.get<string>('VAPID_PUBLIC_KEY') ?? null : null;
  }

  private templateFor(kind: string) {
    const envKey = `WHATSAPP_TEMPLATE_${kind.toUpperCase()}`;
    return this.config.get<string>(envKey) || WHATSAPP_TEMPLATE_DEFAULTS[kind] || WHATSAPP_TEMPLATE_DEFAULTS.campaign;
  }

  // ── Email ─────────────────────────────────────────────────────────────────

  /** MailerSend wins when both keys are set. */
  mailProvider(): 'mailersend' | 'sendgrid' | null {
    if (this.config.get<string>('MAILERSEND_API_TOKEN')?.trim()) return 'mailersend';
    if (this.config.get<string>('SENDGRID_API_KEY')?.trim()) return 'sendgrid';
    return null;
  }

  async email(to: string, subject: string, html: string, unsubscribeUrl?: string): Promise<SendResult> {
    const provider = this.mailProvider();
    if (!provider) return { ok: false, error: 'Email is not configured (MAILERSEND_API_TOKEN or SENDGRID_API_KEY)', permanent: true };
    const from = { email: this.config.get<string>('FROM_EMAIL') || 'noreply@scana.in', name: this.config.get<string>('FROM_NAME') || 'Scana' };
    try {
      const res = provider === 'mailersend'
        ? await fetch('https://api.mailersend.com/v1/email', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.get<string>('MAILERSEND_API_TOKEN')!.trim()}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            from,
            to: [{ email: to }],
            subject,
            html,
            text: htmlToText(html),
            // Header-level one-click unsubscribe is a paid MailerSend feature; the body link always works
            ...(unsubscribeUrl && this.config.get<string>('MAILERSEND_LIST_UNSUBSCRIBE') === 'true'
              ? { list_unsubscribe: `<${unsubscribeUrl}>` }
              : {}),
          }),
          signal: AbortSignal.timeout(15_000),
        })
        : await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.config.get<string>('SENDGRID_API_KEY')!.trim()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from,
            subject,
            content: [{ type: 'text/html', value: html }],
            // One-click unsubscribe header (Gmail / Yahoo bulk-sender requirement)
            ...(unsubscribeUrl
              ? { headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }
              : {}),
          }),
          signal: AbortSignal.timeout(15_000),
        });
      if (res.ok) return { ok: true };
      const text = (await res.text()).slice(0, 200);
      const name = provider === 'mailersend' ? 'MailerSend' : 'SendGrid';
      const hint = res.status === 401 ? ' (API token rejected — create a new one)' : '';
      return { ok: false, error: `${name} ${res.status}${hint}: ${text}`, permanent: res.status >= 400 && res.status < 500 && res.status !== 429 };
    } catch (err: any) {
      return { ok: false, error: String(err?.message ?? err).slice(0, 200) };
    }
  }

  // ── WhatsApp via Twilio (plain text) ──────────────────────────────────────

  /** Fallback for job alerts when the Meta Cloud API is not set up. */
  async whatsappTwilio(to: string, body: string): Promise<SendResult> {
    const sid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
    if (!sid || !token) return { ok: false, error: 'WhatsApp is not configured', permanent: true };
    const from = this.config.get<string>('TWILIO_WHATSAPP_FROM') ?? 'whatsapp:+14155238886';
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
          To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
          Body: body,
        }).toString(),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return { ok: true };
      return { ok: false, error: `Twilio ${res.status}: ${(await res.text()).slice(0, 200)}` };
    } catch (err: any) {
      return { ok: false, error: String(err?.message ?? err).slice(0, 200) };
    }
  }

  metaWhatsappReady(): boolean {
    return Boolean(this.config.get('WHATSAPP_TOKEN') && this.config.get('WHATSAPP_PHONE_NUMBER_ID'));
  }

  // ── Browser push ──────────────────────────────────────────────────────────

  async push(subscription: Record<string, any>, message: { title: string; body: string; url: string; tag?: string }): Promise<SendResult> {
    if (!this.pushReady) return { ok: false, error: 'Browser push is not configured (VAPID keys)', permanent: true };
    try {
      await webpush.sendNotification(subscription as any, JSON.stringify(message), { TTL: 60 * 60 * 24 * 3 });
      return { ok: true };
    } catch (err: any) {
      const code = err?.statusCode as number | undefined;
      // 404/410: the browser dropped this subscription — stop using it
      return { ok: false, error: `Push failed${code ? ` (${code})` : ''}: ${String(err?.body ?? err?.message ?? err).slice(0, 160)}`, permanent: code === 404 || code === 410 };
    }
  }

  // ── WhatsApp (Meta Cloud API) ─────────────────────────────────────────────

  /**
   * Sends an approved template. Every Scana template uses the same three body
   * variables: {{1}} customer name, {{2}} product name, {{3}} message text
   * (including the link).
   */
  async whatsapp(phoneE164: string, kind: string, vars: [string, string, string]): Promise<SendResult> {
    const token = this.config.get<string>('WHATSAPP_TOKEN');
    const phoneId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    if (!token || !phoneId) return { ok: false, error: 'WhatsApp is not configured (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID)', permanent: true };
    const version = this.config.get<string>('WHATSAPP_API_VERSION') || 'v21.0';
    try {
      const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneE164.replace(/^\+/, ''),
          type: 'template',
          template: {
            name: this.templateFor(kind),
            language: { code: this.config.get<string>('WHATSAPP_TEMPLATE_LANG') || 'en' },
            components: [{
              type: 'body',
              // WhatsApp rejects newlines/tabs and >4 consecutive spaces in variables
              parameters: vars.map((v) => ({ type: 'text', text: (v || '-').replace(/[\n\t]+/g, ' ').replace(/ {4,}/g, '   ').slice(0, 1000) })),
            }],
          },
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return { ok: true };
      const body: any = await res.json().catch(() => ({}));
      const msg = body?.error?.message ?? `HTTP ${res.status}`;
      return { ok: false, error: `WhatsApp: ${String(msg).slice(0, 200)}`, permanent: res.status >= 400 && res.status < 500 && res.status !== 429 };
    } catch (err: any) {
      return { ok: false, error: String(err?.message ?? err).slice(0, 200) };
    }
  }
}

/** Plain-text alternative for email clients that do not render HTML. */
function htmlToText(html: string): string {
  return html
    .replace(/<(br|\/p|\/h\d|\/tr|\/li)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();
}
