import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { DocumentEntity } from './document.entity.js';
import { ApplianceEntity } from './appliance.entity.js';

@Entity('document_chunks')
@Index(['appliance_id'])
@Index(['document_id'])
export class DocumentChunkEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  document_id: string;

  @Column('varchar', { length: 36 })
  appliance_id: string;

  @Column('text')
  content: string;

  /** OpenAI embedding stored as JSON array of floats */
  @Column('json', { nullable: true })
  embedding: number[] | null;

  @Column('int', { default: 0 })
  chunk_index: number;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne(() => DocumentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: DocumentEntity;

  @ManyToOne(() => ApplianceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appliance_id' })
  appliance: ApplianceEntity;
}
