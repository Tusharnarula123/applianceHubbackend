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
  @ForeignKey((appliance: any) => ApplianceEntity)
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

  @Column('timestamp', { nullable: true })
  indexed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne((appliance: any) => ApplianceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appliance_id' })
  appliance: any;
}
