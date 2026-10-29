import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

/**
 * Database copy of an uploaded file, used when R2 object storage is not
 * configured. Hosts like Render wipe the local disk on every deploy, restart
 * and free-tier sleep; without this copy the PDF — and every AI feature that
 * reads it — is lost. Stored base64 so the same entity works on MySQL
 * (LONGTEXT via migration) and Postgres (TEXT via sync).
 */
@Entity('document_blobs')
export class DocumentBlobEntity {
  @PrimaryColumn('varchar', { length: 36 })
  document_id: string;

  @Column('text')
  data_base64: string;

  @Column('varchar', { length: 100 })
  mime_type: string;

  @Column('int')
  size_bytes: number;

  @CreateDateColumn()
  created_at: Date;
}
