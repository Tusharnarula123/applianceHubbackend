import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn, Index, ForeignKey } from 'typeorm';
import { ApplianceEntity } from './appliance.entity.js';

export const DOCUMENT_FILE_TYPES = [
  'Manual',
  'Warranty',
  'Parts Catalog',
  'Error Codes',
  'Service Guide',
] as const;

export type DocumentFileType = (typeof DOCUMENT_FILE_TYPES)[number];

@Entity('documents')
@Index(['appliance_id'])
@Index(['file_type'])
export class DocumentEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  appliance_id: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 500 })
  file_url: string;

  @Column('bigint', { nullable: true, unsigned: true })
  file_size_bytes: number;

  @Column('enum', { enum: DOCUMENT_FILE_TYPES })
  file_type: DocumentFileType;

  @Column('varchar', { length: 100, nullable: true })
  mime_type: string;

  @Column('enum', {
    enum: ['pending', 'processing', 'indexed', 'failed'],
    default: 'pending',
  })
  embedding_status: 'pending' | 'processing' | 'indexed' | 'failed';

  @Column('timestamp', { nullable: true })
  indexed_at: Date;

  /** SHA-256 of the file — identical re-uploads are rejected */
  @Column('varchar', { length: 64, nullable: true })
  checksum: string | null;

  /** 1 for the first upload; +1 when a file with the same name replaces it */
  @Column('int', { default: 1 })
  revision: number;

  /** The earlier document this one supersedes (kept, never silently replaced) */
  @Column('varchar', { length: 36, nullable: true })
  supersedes_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne((appliance: any) => ApplianceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appliance_id' })
  appliance: any;
}
