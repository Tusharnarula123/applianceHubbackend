import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * A recall or safety notice entered by the brand (roadmap module K).
 *
 * Scana does not pull from any official recall feed — the brand publishes
 * the notice here and links the official source. Matching is conservative:
 * by appliance, or by exact model number, optionally narrowed to a serial range.
 */
@Entity('recall_notices')
@Index(['business_id'])
@Index(['appliance_id'])
export class RecallNoticeEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  business_id: string;

  /** When set, applies to this appliance; otherwise matched by affected_models */
  @Column('varchar', { length: 36, nullable: true })
  appliance_id: string | null;

  @Column('varchar', { length: 255 })
  title: string;

  /** What is wrong and what the risk is, in plain language */
  @Column('text')
  description: string;

  /** What the customer should do (stop using, free repair, replacement…) */
  @Column('text')
  remedy: string;

  @Column('json', { nullable: true })
  affected_models: string[] | null;

  /** Inclusive serial range; compared as strings of equal length */
  @Column('varchar', { length: 100, nullable: true })
  serial_from: string | null;

  @Column('varchar', { length: 100, nullable: true })
  serial_to: string | null;

  /** safety | quality */
  @Column('varchar', { length: 20, default: 'safety' })
  severity: string;

  /** Link to the official notice */
  @Column('varchar', { length: 500, nullable: true })
  official_url: string | null;

  @Column('boolean', { default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
