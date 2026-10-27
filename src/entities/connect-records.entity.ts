import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Supporting records for Scana Connect. Kept in one file because they are
 * small and only used by the Connect module.
 */

/** One import, sync or delivery batch — what the dashboard shows as "sync history". */
@Entity('sync_runs')
@Index(['business_id'])
@Index(['connection_id'])
export class SyncRunEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  business_id: string;

  @Column('varchar', { length: 36, nullable: true })
  connection_id: string | null;

  /** catalog_import | connection_test | case_delivery */
  @Column('varchar', { length: 30 })
  type: string;

  /** running | succeeded | partial | failed */
  @Column('varchar', { length: 20, default: 'running' })
  status: string;

  /** e.g. { created: 4, updated: 2, skipped: 1, failed: 0 } */
  @Column('json', { nullable: true })
  counts: Record<string, number> | null;

  /** Safe, human-readable error lines (no tokens or payloads) */
  @Column('json', { nullable: true })
  errors: string[] | null;

  @Column('varchar', { length: 255, nullable: true })
  source_name: string | null;

  @Column('varchar', { length: 36, nullable: true })
  started_by: string | null;

  @CreateDateColumn()
  started_at: Date;

  @Column('timestamp', { nullable: true })
  finished_at: Date | null;
}

/**
 * A support case queued for delivery to one connection. The delivery id is
 * sent as the Idempotency-Key, so a retried request never makes a second ticket
 * on a receiver that honours it.
 */
@Entity('case_deliveries')
@Index(['business_id'])
@Index(['status'])
@Index(['case_id', 'connection_id'], { unique: true })
export class CaseDeliveryEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  business_id: string;

  @Column('varchar', { length: 36 })
  case_id: string;

  @Column('varchar', { length: 36 })
  connection_id: string;

  /** pending_approval | queued | delivering | delivered | failed | rejected */
  @Column('varchar', { length: 20, default: 'queued' })
  status: string;

  @Column('int', { default: 0 })
  attempts: number;

  @Column('timestamp', { nullable: true })
  next_attempt_at: Date | null;

  @Column('int', { nullable: true })
  response_code: number | null;

  @Column('text', { nullable: true })
  last_error: string | null;

  /** Snapshot sent, so what the receiver got is auditable */
  @Column('json', { nullable: true })
  payload: Record<string, any> | null;

  @Column('varchar', { length: 36, nullable: true })
  approved_by: string | null;

  @Column('timestamp', { nullable: true })
  delivered_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

/** Links a Scana record to the matching record in the brand's system. */
@Entity('external_record_mappings')
@Index(['business_id', 'object_type', 'internal_id'])
export class ExternalRecordMappingEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  business_id: string;

  @Column('varchar', { length: 36 })
  connection_id: string;

  @Column('varchar', { length: 40 })
  provider: string;

  /** support_case | product */
  @Column('varchar', { length: 30 })
  object_type: string;

  @Column('varchar', { length: 36 })
  internal_id: string;

  @Column('varchar', { length: 255 })
  external_id: string;

  @Column('varchar', { length: 500, nullable: true })
  external_url: string | null;

  @Column('varchar', { length: 60, nullable: true })
  external_status: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

/** Inbound webhook events, kept for de-duplication and troubleshooting. */
@Entity('webhook_events')
@Index(['connection_id', 'external_event_id'], { unique: true })
export class WebhookEventEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  connection_id: string;

  @Column('varchar', { length: 255 })
  external_event_id: string;

  @Column('varchar', { length: 60 })
  type: string;

  /** processed | ignored | failed */
  @Column('varchar', { length: 20 })
  status: string;

  @Column('text', { nullable: true })
  error: string | null;

  @CreateDateColumn()
  received_at: Date;
}

/** Who changed what — connections, mappings, imports, approvals, revocations. */
@Entity('audit_events')
@Index(['business_id'])
export class AuditEventEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  business_id: string;

  @Column('varchar', { length: 36, nullable: true })
  actor_id: string | null;

  /** Email or "system" / "webhook" */
  @Column('varchar', { length: 255 })
  actor: string;

  /** e.g. connection.created, catalog.imported, delivery.approved */
  @Column('varchar', { length: 60 })
  action: string;

  @Column('varchar', { length: 40, nullable: true })
  target_type: string | null;

  @Column('varchar', { length: 36, nullable: true })
  target_id: string | null;

  /** Safe metadata only — never secrets or full payloads */
  @Column('json', { nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  created_at: Date;
}

/**
 * Additional identifiers for a product: aliases, regional model numbers,
 * EAN/UPC barcodes. Lets one Scana product match several codes.
 */
@Entity('product_identifiers')
@Index(['business_id', 'normalized'])
@Index(['appliance_id'])
export class ProductIdentifierEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  business_id: string;

  @Column('varchar', { length: 36 })
  appliance_id: string;

  /** model | sku | ean | upc | alias */
  @Column('varchar', { length: 20 })
  identifier_type: string;

  @Column('varchar', { length: 120 })
  value: string;

  /** Upper-case, alphanumerics only — used for matching */
  @Column('varchar', { length: 120 })
  normalized: string;

  @Column('varchar', { length: 20, nullable: true })
  region: string | null;

  /** catalog_import | manual | api */
  @Column('varchar', { length: 30, default: 'manual' })
  source: string;

  @CreateDateColumn()
  created_at: Date;
}
