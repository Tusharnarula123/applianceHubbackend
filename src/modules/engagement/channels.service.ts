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
  test: 'scana_maintenance_due',
};

/**
 * Outbound channels for reminders and campaigns:
 * - Email via SendGrid (SENDGRID_API_KEY, FROM_EMAIL)
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
      email: Boolean(this.config.get('SENDGRID_API_KEY')),
      push: this.pushReady,
      whatsapp: Boolean(this.config.get('WHATSAPP_TOKEN') && this.config.get('WHATSAPP_PHONE_NUMBER_ID')),
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

  async email(to: string, subject: string, html: string, unsubscribeUrl?: string): Promise<SendResult> {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY');
    if (!apiKey) return { ok: false, error: 'Email is not configured (SENDGRID_API_KEY)', permanent: true };
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: this.config.get<string>('FROM_EMAIL') ?? 'noreply@scana.in', name: 'Scana' },
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
      return { ok: false, error: `SendGrid ${res.status}: ${text}`, permanent: res.status >= 400 && res.status < 500 && res.status !== 429 };
    } catch (err: any) {
      return { ok: false, error: String(err?.message ?? err).slice(0, 200) };
    }
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
