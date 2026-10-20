import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { DocumentEntity } from './document.entity.js';

export const KNOWLEDGE_STATUSES = [
  'pending',
  'scanning',
  'ocr',
  'generating',
  'verifying',
  'ready',
  'failed',
] as const;
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number];

export type VerificationStatus = 'verified' | 'corrected' | 'unverified';

export interface KnowledgeItem {
  id: string;
  type: 'procedure' | 'troubleshooting' | 'error_code' | 'spec' | 'maintenance' | 'safety' | 'warranty' | 'faq';
  /** Shape depends on type — see KnowledgeService for the per-type fields */
  data: Record<string, any>;
  pages: number[];
  verification: {
    status: VerificationStatus;
    /** Short quote from the OCR text that supports the item */
    evidence: string | null;
    note: string | null;
    facts_total: number;
    facts_found: number;
  };
}

/**
 * AI knowledge built from one PDF:
 * AI scan (vision) → OCR (tesseract) → generated instructions → cross-verification against OCR.
 */
@Entity('document_knowledge')
@Index(['appliance_id'])
export class DocumentKnowledgeEntity {
  /** Same as the source document id — one knowledge record per document */
  @PrimaryColumn('varchar', { length: 36 })
  document_id: string;

  @Column('varchar', { length: 36 })
  appliance_id: string;

  @Column('varchar', { length: 20, default: 'pending' })
  status: KnowledgeStatus;

  /** Human-readable progress, e.g. "OCR page 3 of 12" */
  @Column('varchar', { length: 255, nullable: true })
  stage_detail: string | null;

  @Column('text', { nullable: true })
  error: string | null;

  @Column('int', { default: 0 })
  page_count: number;

  /** Per-page OCR output: [{ page, ocr, text_layer }] */
  @Column('json', { nullable: true })
  ocr_pages: Array<{ page: number; ocr: string; text_layer: string }> | null;

  /** Per-page AI vision transcription: [{ page, content }] */
  @Column('json', { nullable: true })
  ai_scan: Array<{ page: number; content: string }> | null;

  @Column('text', { nullable: true })
  summary: string | null;

  @Column('json', { nullable: true })
  items: KnowledgeItem[] | null;

  /** { total, verified, corrected, unverified } */
  @Column('json', { nullable: true })
  stats: Record<string, number> | null;

  @Column('varchar', { length: 50, nullable: true })
  model: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => DocumentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: DocumentEntity;
}
