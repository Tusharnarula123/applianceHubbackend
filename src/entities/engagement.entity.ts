import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Brand engagement: promotional campaigns, customer subscriptions with
 * consent, and the notification outbox. Kept together because they are only
 * used by the engagement module.
 */

/** Offer moments — when in the customer's journey a campaign may appear. */
export const CAMPAIGN_MOMENTS = ['warranty_registered', 'after_fix', 'maintenance', 'upgrade', 'browsing'] as const;
/** Delivery channels. "chat" = the QR/chat page; the rest are outbound. */
export const CAMPAIGN_CHANNELS = ['chat', 'email', 'push', 'whatsapp'] as const;

@Entity('campaigns')
@Index(['business_id'])
@Index(['status'])
export class CampaignEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  business_id: string;

  @Column('varchar', { length: 120 })
  name: string;

  /** draft | active | paused | ended */
  @Column('varchar', { length: 20, default: 'draft' })
  status: string;

  /** accessory | consumable | extended_warranty | upgrade | new_launch | service_plan | other */
  @Column('varchar', { length: 30, default: 'accessory' })
  offer_type: string;

  @Column('varchar', { length: 120 })
  headline: string;

  @Column('text', { nullable: true })
  body: string | null;

  @Column('varchar', { length: 500, nullable: true })
  image_url: string | null;

  @Column('varchar', { length: 40, default: 'View offer' })
  cta_label: string;

  /** Brand store / landing page. Clicks go through Scana's tracker first. */
  @Column('varchar', { length: 500 })
  cta_url: string;

  @Column('varchar', { length: 60, nullable: true })
  coupon_code: string | null;

  /** null = every product of the brand */
  @Column('json', { nullable: true })
  target_appliance_ids: string[] | null;

  @Column('json', { nullable: true })
  target_categories: string[] | null;

  @Column('json', { nullable: true })
  moments: string[] | null;

  @Column('json', { nullable: true })
  channels: string[] | null;

  @Column('timestamp', { nullable: true })
  starts_at: Date | null;

  @Column('timestamp', { nullable: true })
  ends_at: Date | null;

  /** Higher wins when several campaigns match the same moment */
  @Column('int', { default: 0 })
  priority: number;

  @Column('int', { default: 0 })
  impressions: number;

  @Column('int', { default: 0 })
  clicks: number;

  @Column('int', { default: 0 })
  sends: number;

  @Column('varchar', { length: 36, nullable: true })
  created_by: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

/** One impression, click or outbound send — for daily campaign analytics. */
@Entity('campaign_events')
@Index(['campaign_id', 'created_at'])
@Index(['business_id'])
export class CampaignEventEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  campaign_id: string;

  @Column('varchar', { length: 36 })
  business_id: string;

  /** impression | click | send */
  @Column('varchar', { length: 20 })
  type: string;

  @Column('varchar', { length: 20 })
  channel: string;

  @Column('varchar', { length: 36, nullable: true })
  appliance_id: string | null;

  @Column('varchar', { length: 36, nullable: true })
  session_id: string | null;

  @Column('varchar', { length: 36, nullable: true })
  subscriber_id: string | null;

  @CreateDateColumn()
  created_at: Date;
}

/**
 * A customer who asked to hear from Scana about one product. Service
 * messages (maintenance, warranty, recalls) and marketing are consented to
 * separately, per channel.
 */
@Entity('subscribers')
@Index(['business_id'])
@Index(['appliance_id'])
@Index(['unsubscribe_token'], { unique: true })
export class SubscriberEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  business_id: string;

  @Column('varchar', { length: 36 })
  appliance_id: string;

  @Column('varchar', { length: 255, nullable: true })
  name: string | null;

  @Column('varchar', { length: 255, nullable: true })
  email: string | null;

  /** E.164, e.g. +919876543210 */
  @Column('varchar', { length: 20, nullable: true })
  phone: string | null;

  /** Browser PushSubscription JSON (endpoint + keys) */
  @Column('json', { nullable: true })
  push_subscription: Record<string, any> | null;

  @Column('boolean', { default: true })
  email_enabled: boolean;

  @Column('boolean', { default: false })
  push_enabled: boolean;

  @Column('boolean', { default: false })
  whatsapp_enabled: boolean;

  /** Maintenance, warranty and recall reminders */
  @Column('boolean', { default: true })
  consent_service: boolean;

  /** Offers and launches from the brand — separate, explicit opt-in */
  @Column('boolean', { default: false })
  consent_marketing: boolean;

  /** Exact wording shown, where, and when — evidence of consent */
  @Column('json', { nullable: true })
  consent_record: Record<string, any> | null;

  @Column('varchar', { length: 64 })
  unsubscribe_token: string;

  @Column('timestamp', { nullable: true })
  unsubscribed_at: Date | null;

  @Column('timestamp', { nullable: true })
  last_marketing_at: Date | null;

  @Column('varchar', { length: 36, nullable: true })
  session_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

/** Outbox: every reminder or campaign message, sent by a background worker. */
@Entity('notification_jobs')
@Index(['status', 'send_after'])
@Index(['business_id'])
@Index(['dedupe_key'], { unique: true })
export class NotificationJobEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  business_id: string;

  @Column('varchar', { length: 36 })
  subscriber_id: string;

  @Column('varchar', { length: 36, nullable: true })
  campaign_id: string | null;

  /** maintenance_due | warranty_expiring | recall | campaign | test */
  @Column('varchar', { length: 30 })
  kind: string;

  /** email | push | whatsapp */
  @Column('varchar', { length: 20 })
  channel: string;

  /** queued | sending | sent | failed | skipped */
  @Column('varchar', { length: 20, default: 'queued' })
  status: string;

  /** Prevents the same reminder going out twice */
  @Column('varchar', { length: 191 })
  dedupe_key: string;

  @Column('json')
  payload: Record<string, any>;

  @Column('int', { default: 0 })
  attempts: number;

  @Column('timestamp', { nullable: true })
  send_after: Date | null;

  @Column('text', { nullable: true })
  error: string | null;

  @Column('timestamp', { nullable: true })
  sent_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
