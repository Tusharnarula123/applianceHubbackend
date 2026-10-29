import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RepairAgentEntity } from '../../entities/repair-agent.entity.js';
import { RepairRequestEntity } from '../../entities/repair-request.entity.js';
import { PartsOrderEntity } from '../../entities/parts-order.entity.js';
import { ChannelsService } from '../engagement/channels.service.js';

@Injectable()
export class RepairNotificationService {
  private readonly logger = new Logger(RepairNotificationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly channels: ChannelsService,
  ) {}

  /* ── Agent assignment notification ── */
  async notifyAgentAssigned(
    agent: RepairAgentEntity,
    request: RepairRequestEntity,
  ): Promise<void> {
    const msg = this.buildAssignmentMessage(agent, request);
    await Promise.allSettled([
      agent.email ? this.sendEmail(agent.email, `New Repair Job Assigned — ${request.customer_name}`, msg.html) : Promise.resolve(),
      agent.whatsapp ? this.sendWhatsApp(agent.whatsapp, msg.text, [agent.name, request.customer_name, msg.text]) : Promise.resolve(),
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

  /** Email through the shared channel (MailerSend or SendGrid); logged only when neither is configured. */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.channels.mailProvider()) {
      this.logger.warn(`[EMAIL-DEV] To: ${to} | Subject: ${subject}`);
      return;
    }
    const res = await this.channels.email(to, subject, html);
    if (res.ok) this.logger.log(`Email sent to ${to}: ${subject}`);
    else this.logger.error(`Email to ${to} failed: ${res.error}`);
  }

  /**
   * WhatsApp job alert: Meta Cloud API template (repair_assigned) when configured,
   * otherwise Twilio plain text; logged only when neither is configured.
   */
  private async sendWhatsApp(to: string, message: string, vars: [string, string, string]): Promise<void> {
    const twilio = Boolean(this.config.get('TWILIO_ACCOUNT_SID') && this.config.get('TWILIO_AUTH_TOKEN'));
    if (!this.channels.metaWhatsappReady() && !twilio) {
      this.logger.warn(`[WHATSAPP-DEV] To: ${to} | ${message.slice(0, 80)}`);
      return;
    }
    const res = this.channels.metaWhatsappReady()
      ? await this.channels.whatsapp(to, 'repair_assigned', vars)
      : await this.channels.whatsappTwilio(to, message);
    if (res.ok) this.logger.log(`WhatsApp sent to ${to}`);
    else this.logger.error(`WhatsApp to ${to} failed: ${res.error}`);
  }
}
