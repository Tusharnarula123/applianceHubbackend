import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * One event in a support case's life — created, sent to the help desk, a
 * status change, an appointment, a parts update, a comment, evidence added,
 * or the customer's confirmation that it was fixed. Every event records its
 * source, so the customer only ever sees confirmed facts.
 */
@Entity('case_events')
@Index(['case_id', 'occurred_at'])
@Index(['business_id'])
export class CaseEventEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  case_id: string;

  @Column('varchar', { length: 36, nullable: true })
  business_id: string | null;

  /** created | sent | status_changed | appointment | part_update | comment | evidence_added | details_updated | outcome */
  @Column('varchar', { length: 30 })
  type: string;

  /** Canonical status after this event, when it changed */
  @Column('varchar', { length: 30, nullable: true })
  status: string | null;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text', { nullable: true })
  detail: string | null;

  /** Structured extras: appointment window, part name/eta, provider status… */
  @Column('json', { nullable: true })
  data: Record<string, any> | null;

  /** scana | ai_chat | customer | helpdesk | technician */
  @Column('varchar', { length: 20 })
  source: string;

  /** Provider event id / ticket id, when the event came from outside */
  @Column('varchar', { length: 255, nullable: true })
  source_ref: string | null;

  @Column('boolean', { default: true })
  visible_to_customer: boolean;

  /** When it happened in the source system (may differ from when we received it) */
  @Column('timestamp')
  occurred_at: Date;

  @CreateDateColumn()
  created_at: Date;
}

/** One attempt to identify a product (QR, barcode, label photo or typed model) — for model-match accuracy. */
@Entity('product_resolutions')
@Index(['business_id'])
export class ProductResolutionEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36, nullable: true })
  business_id: string | null;

  /** qr | barcode | label_photo | typed */
  @Column('varchar', { length: 20 })
  method: string;

  @Column('varchar', { length: 255 })
  input: string;

  /** exact | needs_confirmation | not_found */
  @Column('varchar', { length: 20 })
  outcome: string;

  @Column('json', { nullable: true })
  candidate_ids: string[] | null;

  /** Set when the customer confirms a product */
  @Column('varchar', { length: 36, nullable: true })
  chosen_appliance_id: string | null;

  /** True when the customer picked something other than the top suggestion or edited the model text */
  @Column('boolean', { nullable: true })
  corrected: boolean | null;

  @CreateDateColumn()
  created_at: Date;
}
