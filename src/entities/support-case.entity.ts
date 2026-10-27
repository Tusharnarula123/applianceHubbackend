import {
  Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

/**
 * One customer support journey for an appliance.
 *
 * Created when the AI prepares a structured case for the support team
 * (escalation), or when the customer confirms the AI fixed their problem
 * (verified self-service resolution). Outcomes power the resolution metrics.
 */
export enum SupportCaseOutcome {
  OPEN          = 'open',           // prepared, waiting for the support team
  RESOLVED_BY_AI = 'resolved_by_ai', // customer confirmed the guidance worked
  ESCALATED     = 'escalated',      // handed to a person / technician
  CLOSED        = 'closed',         // support team finished it
}

@Entity('support_cases')
@Index(['business_id'])
@Index(['appliance_id'])
@Index(['session_id'])
@Index(['outcome'])
export class SupportCaseEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  appliance_id: string;

  @Column('varchar', { length: 36, nullable: true })
  business_id: string | null;

  @Column('varchar', { length: 36, nullable: true })
  session_id: string | null;

  @Column('varchar', { length: 255, nullable: true })
  customer_name: string | null;

  @Column('varchar', { length: 255, nullable: true })
  customer_email: string | null;

  @Column('varchar', { length: 30, nullable: true })
  customer_phone: string | null;

  /** troubleshooting | warranty | repair | setup | other */
  @Column('varchar', { length: 30, default: 'troubleshooting' })
  category: string;

  /** What the customer reports, in their words */
  @Column('text', { nullable: true })
  symptoms: string | null;

  @Column('json', { nullable: true })
  error_codes: string[] | null;

  /** Steps the customer already tried during the chat */
  @Column('json', { nullable: true })
  steps_tried: string[] | null;

  /** AI's most likely causes — hypotheses, not confirmed facts */
  @Column('json', { nullable: true })
  likely_causes: string[] | null;

  /** gas | electrical | water_electrical | fire_heat | refrigerant | other — set when the AI stopped for safety */
  @Column('varchar', { length: 30, nullable: true })
  safety_flag: string | null;

  /** Short brief written for the support team / technician */
  @Column('text', { nullable: true })
  summary: string | null;

  /** 0–100: how much of the information a support agent needs is present */
  @Column('int', { default: 0 })
  completeness: number;

  @Column('enum', { enum: SupportCaseOutcome, default: SupportCaseOutcome.OPEN })
  outcome: SupportCaseOutcome;

  @Column('text', { nullable: true })
  resolution_note: string | null;

  // ── Repair journey ────────────────────────────────────────────────────────

  /** Unguessable token for the customer's case-tracking page */
  @Column('varchar', { length: 64, nullable: true })
  public_token: string | null;

  /**
   * Canonical status shown to the customer, synced from the brand's help desk:
   * received | sent_to_service | awaiting_customer | appointment_scheduled |
   * parts_ordered | in_repair | resolved | closed | cancelled
   */
  @Column('varchar', { length: 30, default: 'received' })
  canonical_status: string;

  /** YYYY-MM-DD as supplied by the customer (evidence, not verified) */
  @Column('varchar', { length: 10, nullable: true })
  purchase_date: string | null;

  @Column('varchar', { length: 100, nullable: true })
  serial_number: string | null;

  /** Uploaded photos/receipts: [{ id, key, name, mime, size, kind, uploaded_at }] — served only via access-checked endpoints */
  @Column('json', { nullable: true })
  evidence: Array<Record<string, any>> | null;

  /** Earlier case or ticket references the customer gave */
  @Column('json', { nullable: true })
  prior_case_refs: string[] | null;

  /** Last event received from any source — used for stale-sync alerts */
  @Column('timestamp', { nullable: true })
  last_event_at: Date | null;

  /** The customer's own answer after the case was resolved: fixed or not */
  @Column('boolean', { nullable: true })
  customer_confirmed_fixed: boolean | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
