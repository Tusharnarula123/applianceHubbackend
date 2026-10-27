import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * A customer question the uploaded manuals could not answer.
 * Repeated questions are merged by normalised text so the dashboard can show
 * which documentation is missing and how often it is needed.
 */
@Entity('knowledge_gaps')
@Index(['appliance_id'])
@Index(['business_id'])
export class KnowledgeGapEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  appliance_id: string;

  @Column('varchar', { length: 36, nullable: true })
  business_id: string | null;

  /** First wording we saw */
  @Column('text')
  question: string;

  /** Lower-cased, punctuation-stripped key used to merge repeats */
  @Column('varchar', { length: 255 })
  normalized: string;

  @Column('int', { default: 1 })
  times_asked: number;

  @Column('boolean', { default: false })
  dismissed: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
