import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RepairAgentEntity } from '../../entities/repair-agent.entity.js';
import { RepairRequestEntity } from '../../entities/repair-request.entity.js';
import { PartsOrderEntity } from '../../entities/parts-order.entity.js';

@Injectable()
export class RepairNotificationService {
  private readonly logger = new Logger(RepairNotificationService.name);

  constructor(private readonly config: ConfigService) {}

  /* ── Agent assignment notification ── */
  async notifyAgentAssigned(
    agent: RepairAgentEntity,
    request: RepairRequestEntity,
  ): Promise<void> {
    const msg = this.buildAssignmentMessage(agent, request);
    await Promise.allSettled([
      this.sendEmail(agent.email, `New Repair Job Assigned — ${request.customer_name}`, msg.html),
      agent.whatsapp ? this.sendWhatsApp(agent.whatsapp, msg.text) : Promise.resolve(),
    ]);
  }

  /* ── Customer repair confirmation ── */
  async notifyCustomerRepairBooked(request: RepairRequestEntity): Promise<void> {
    if (!request.customer_email) return;
    const html = `
      <h2>Your Repair Request Has Been Received</h2>
      <p>Hi ${request.customer_name},</p>
      <p>We've received your repair request and are assigning the best available technician in your area.</p>
      <table>
        <tr><td><strong>Request ID</strong></td><td>${request.id.slice(0,8).toUpperCase()}</td></tr>
        <tr><td><strong>Issue</strong></td><td>${request.issue_description}</td></tr>
        <tr><td><strong>Status</strong></td><td>Pending Assignment</td></tr>
      </table>
      <p>You'll receive another notification once a technician is assigned.</p>
    `;
    await this.sendEmail(request.customer_email, 'Repair Request Confirmed', html);
  }

  /* ── Customer — repair completed ── */
  async notifyCustomerRepairCompleted(request: RepairRequestEntity): Promise<void> {
    if (!request.customer_email) return;
    const html = `
      <h2>Your Repair is Complete! ✓</h2>
      <p>Hi ${request.customer_name},</p>
      <p>Your repair has been completed successfully.</p>
      ${request.repair_cost ? `<p><strong>Repair Cost:</strong> $${Number(request.repair_cost).toFixed(2)}</p>` : ''}
      <p>Please take a moment to rate your experience — it helps us maintain quality service.</p>
    `;
    await this.sendEmail(request.customer_email, 'Repair Complete — Please Leave a Review', html);
  }

  /* ── Parts order confirmation ── */
  async notifyPartsOrderConfirmed(order: PartsOrderEntity): Promise<void> {
    if (!order.customer_email) return;
    const itemList = order.items
      .map(i => `<li>${i.name} x${i.quantity} — $${(i.unit_price * i.quantity).toFixed(2)}</li>`)
      .join('');
    const html = `
      <h2>Parts Order Confirmed</h2>
      <p>Hi ${order.customer_name},</p>
      <p>Your parts order has been confirmed. Here's what you ordered:</p>
      <ul>${itemList}</ul>
      <p><strong>Total: $${Number(order.total_amount).toFixed(2)}</strong></p>
      <p>We'll notify you when your parts ship.</p>
      <p><em>Order ID: ${order.id.slice(0,8).toUpperCase()}</em></p>
    `;
    await this.sendEmail(order.customer_email, 'Parts Order Confirmed', html);
  }

  /* ── Internal helpers ── */

  private buildAssignmentMessage(
    agent: RepairAgentEntity,
    req: RepairRequestEntity,
  ): { html: string; text: string } {
    const scheduledStr = req.scheduled_date
      ? new Date(req.scheduled_date).toLocaleString()
      : 'To be confirmed';

    const text =
      `🔧 New Repair Job Assigned!\n\n` +
      `Customer: ${req.customer_name}\n` +
      `Phone: ${req.customer_phone ?? 'N/A'}\n` +
      `Address: ${req.customer_address ?? ''}, ${req.customer_city ?? ''} ${req.customer_zipcode ?? ''}\n` +
      `Issue: ${req.issue_description}\n` +
      `Scheduled: ${scheduledStr}\n` +
      `Job ID: ${req.id.slice(0,8).toUpperCase()}\n\n` +
      `Please log in to your dashboard to confirm and update the job status.`;

    const html = `
      <h2>🔧 New Repair Job Assigned</h2>
      <p>Hello ${agent.name},</p>
      <p>A new repair job has been assigned to you:</p>
      <table border="0" cellpadding="6">
        <tr><td><strong>Customer</strong></td><td>${req.customer_name}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${req.customer_phone ?? 'N/A'}</td></tr>
        <tr><td><strong>Address</strong></td><td>${req.customer_address ?? ''}, ${req.customer_city ?? ''} ${req.customer_zipcode ?? ''}</td></tr>
        <tr><td><strong>Issue</strong></td><td>${req.issue_description}</td></tr>
        <tr><td><strong>Scheduled</strong></td><td>${scheduledStr}</td></tr>
        <tr><td><strong>Job ID</strong></td><td>${req.id.slice(0,8).toUpperCase()}</td></tr>
      </table>
      <p>Log in to your dashboard to confirm and update job status.</p>
    `;
    return { html, text };
  }

  /**
   * Send email using the configured SMTP / SendGrid / SES credentials.
   * Falls back to console.log if not configured (dev mode).
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const apiKey = this.config.get<string>('SENDGRID_API_KEY');
      const fromEmail = this.config.get<string>('FROM_EMAIL') ?? 'noreply@scana.ai';

      if (!apiKey) {
        this.logger.warn(`[EMAIL-DEV] To: ${to} | Subject: ${subject}`);
        this.logger.debug(html.replace(/<[^>]+>/g, '').trim().slice(0, 200));
        return;
      }

      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: fromEmail, name: 'Scana.ai' },
          subject,
          content: [{ type: 'text/html', value: html }],
        }),
      });

      if (!res.ok) {
        this.logger.error(`SendGrid error ${res.status}: ${await res.text()}`);
      } else {
        this.logger.log(`Email sent to ${to}: ${subject}`);
      }
    } catch (err: any) {
      this.logger.error(`Email failed: ${err?.message ?? err}`);
    }
  }

  /**
   * Send WhatsApp message via Twilio API.
   * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM in env.
   */
  private async sendWhatsApp(to: string, message: string): Promise<void> {
    try {
      const sid   = this.config.get<string>('TWILIO_ACCOUNT_SID');
      const token = this.config.get<string>('TWILIO_AUTH_TOKEN');
      const from  = this.config.get<string>('TWILIO_WHATSAPP_FROM') ?? 'whatsapp:+14155238886';

      if (!sid || !token) {
        this.logger.warn(`[WHATSAPP-DEV] To: ${to} | ${message.slice(0, 80)}`);
        return;
      }

      const formData = new URLSearchParams({
        From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
        To: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
        Body: message,
      });

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        },
      );

      if (!res.ok) {
        this.logger.error(`Twilio error ${res.status}: ${await res.text()}`);
      } else {
        this.logger.log(`WhatsApp sent to ${to}`);
      }
    } catch (err: any) {
      this.logger.error(`WhatsApp failed: ${err?.message ?? err}`);
    }
  }
}
