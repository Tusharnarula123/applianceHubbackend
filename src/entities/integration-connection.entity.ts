import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * A brand's connection to an outside system (Scana Connect).
 * The MVP provider is a signed generic webhook; native help-desk adapters
 * plug in behind the same record later.
 */
@Entity('integration_connections')
@Index(['business_id'])
export class IntegrationConnectionEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  business_id: string;

  /** webhook (MVP). Native adapters later: zoho_desk, freshdesk, zendesk… */
  @Column('varchar', { length: 40, default: 'webhook' })
  provider: string;

  @Column('varchar', { length: 120 })
  name: string;

  /** pending → active ⇄ paused; error when deliveries keep failing */
  @Column('varchar', { length: 20, default: 'pending' })
  status: string;

  /** Provider config. For webhook: { url, mode: 'test'|'live', require_approval, events } */
  @Column('json', { nullable: true })
  config: Record<string, any> | null;

  /** AES-256-GCM encrypted signing secret (never returned by the API after creation) */
  @Column('text', { nullable: true })
  secret_encrypted: string | null;

  /** Last 4 characters, so admins can tell secrets apart */
  @Column('varchar', { length: 8, nullable: true })
  secret_hint: string | null;

  @Column('timestamp', { nullable: true })
  last_tested_at: Date | null;

  @Column('boolean', { nullable: true })
  last_test_ok: boolean | null;

  @Column('timestamp', { nullable: true })
  last_delivery_at: Date | null;

  @Column('text', { nullable: true })
  last_error: string | null;

  @Column('varchar', { length: 36, nullable: true })
  created_by: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
