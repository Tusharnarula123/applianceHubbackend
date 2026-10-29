import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const require = createRequire(import.meta.url);
type PdfParseFn = (
  buffer: Buffer,
  options?: {
    pagerender?: (pageData: {
      getTextContent: (opts?: object) => Promise<{
        items: Array<{ str: string; transform: number[] }>;
      }>;
    }) => Promise<string>;
  },
) => Promise<{ text: string; numpages: number }>;

const pdfParse = require('pdf-parse') as PdfParseFn;
const execFileAsync = promisify(execFile);

import { DocumentEntity } from '../../entities/document.entity.js';
import { DocumentChunkEntity } from '../../entities/document-chunk.entity.js';
import {
  documentFileExists,
  resolveDocumentFilePath,
} from '../../common/uploads-path.js';
import { StorageService } from '../../common/storage.service.js';
import { DocumentFilesService } from '../../common/document-files.service.js';

// ── Constants ───────────────────────────────────────────────────────────────

/** Max characters per chunk within a single PDF page */
const PAGE_CHUNK_SIZE = 2000;
/** Overlap when a page is split into multiple chunks */
const PAGE_CHUNK_OVERLAP = 150;
/** Minimum text length to store a chunk */
const MIN_CHUNK_CHARS = 30;
/** Embedding model */
const EMBED_MODEL = 'text-embedding-3-small';
/** Number of top chunks to return for RAG context */
const TOP_K = 6;
/** Minimum cosine similarity — keep low so manual terms still match */
const MIN_SIMILARITY = 0.18;

const IMAGE_MIME_PREFIX = 'image/';

export type ChatKnowledgeMediaItem = {
  id: string;
  name: string;
  file_url: string;
  /** Full URL for <img src> or PDF link in chatbot */
  public_url: string;
  mime_type: string;
  kind: 'pdf' | 'image';
  embedding_status: string;
  /** PDF text is in document_chunks (RAG) */
  in_rag: boolean;
  chunk_count: number;
  /** Highest PDF page number indexed for this document */
  page_count: number;
};

export type RagContextResult = {
  context: string;
  chunkCount: number;
  topScore: number;
  /** PDFs/images tied to chunks used for this reply */
  sources: ChatKnowledgeMediaItem[];
  /** Short text previews shown in chat UI */
  excerpts: Array<{
    text: string;
    score: number;
    page_index: number;
    chunk_index: number;
    document_id: string;
    document_name?: string;
  }>;
};

// ── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class RagService implements OnModuleInit {
  private readonly logger = new Logger(RagService.name);
  private openai: OpenAI;
  /** False on Groq-only setups: Groq has no embeddings endpoint, so retrieval falls back to BM25 */
  private readonly hasEmbeddings: boolean;

  constructor(
    @InjectRepository(DocumentEntity)
    private documentRepo: Repository<DocumentEntity>,
    @InjectRepository(DocumentChunkEntity)
    private chunkRepo: Repository<DocumentChunkEntity>,
    private configService: ConfigService,
    private storageService: StorageService,
    private documentFiles: DocumentFilesService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openai = new OpenAI({ apiKey: apiKey || 'not-configured' });
    this.hasEmbeddings = Boolean(apiKey?.trim());
    if (!this.hasEmbeddings) {
      this.logger.warn(
        'OPENAI_API_KEY is not set — manuals are searched by keyword ranking (BM25) instead of embeddings. Set it for semantic search.',
      );
    }
  }

  /** On API startup, finish PDFs left pending/failed or falsely marked indexed without chunks. */
  onModuleInit(): void {
    void (async () => {
      const pdfs = await this.documentRepo.find({
        where: { mime_type: 'application/pdf' },
        take: 50,
      });
      const toFix: string[] = [];
      for (const doc of pdfs) {
        const fileExists = await this.fileExists(doc.file_url);
        if (!fileExists) {
          if (doc.embedding_status !== 'failed') {
            await this.documentRepo.update(doc.id, { embedding_status: 'failed' });
          }
          continue;
        }
        if (['pending', 'failed', 'processing'].includes(doc.embedding_status)) {
          toFix.push(doc.id);
          continue;
        }
        // Keyword-only setups never store vectors — re-embedding would loop on every restart
        if (doc.embedding_status === 'indexed' && this.hasEmbeddings) {
          const withEmb = await this.chunkRepo
            .createQueryBuilder('c')
            .where('c.document_id = :documentId', { documentId: doc.id })
            .andWhere('c.embedding IS NOT NULL')
            .getCount();
          if (withEmb === 0) toFix.push(doc.id);
        }
      }
      if (!toFix.length) return;
      this.logger.log(`Startup: auto-embedding ${toFix.length} PDF(s) for chatbot RAG`);
      for (const id of toFix) {
        try {
          await this.indexDocument(id);
        } catch (err) {
          this.logger.warn(`Startup embed skipped ${id}: ${err}`);
        }
      }
    })();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Index a document: extract text → chunk → embed → store.
   * Called asynchronously after upload so it never blocks the HTTP response.
   */
  async indexDocument(documentId: string): Promise<void> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey?.trim()) {
      await this.documentRepo.update(documentId, { embedding_status: 'failed' });
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const document = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!document) {
      this.logger.warn(`indexDocument: doc ${documentId} not found`);
      return;
    }

    if (!(await this.fileExists(document.file_url))) {
      await this.documentRepo.update(documentId, { embedding_status: 'failed' });
      this.logger.warn(
        `Doc ${documentId}: PDF file not found (${document.file_url}) — delete the row or re-upload`,
      );
      return;
    }

    // Only index PDFs
    if (document.mime_type !== 'application/pdf') {
      await this.documentRepo.update(documentId, {
        embedding_status: 'indexed',
        indexed_at: new Date(),
      });
      return;
    }

    try {
      // Mark as processing
      await this.documentRepo.update(documentId, { embedding_status: 'processing' });

      // 1. Extract text page-by-page (1-based page_index for retrieval)
      const pages = await this.extractPdfPages(document.file_url);
      if (!pages.length) {
        throw new Error(
          `PDF file missing or unreadable (${document.file_url}). Re-upload the document.`,
        );
      }

      // 2. Chunk per page — each chunk keeps its PDF page number
      const chunks = this.chunkPages(pages);
      const totalChars = pages.reduce((sum, p) => sum + p.text.length, 0);
      this.logger.log(
        `Doc ${documentId}: ${pages.length} page(s), ${totalChars} chars → ${chunks.length} chunk(s) (page-indexed)`,
      );

      if (!chunks.length) {
        throw new Error('PDF contains too little text to embed (scanned image PDFs need OCR)');
      }

      // 3. Delete old chunks for this document (re-index)
      await this.chunkRepo.delete({ document_id: documentId });

      // 4. Embed and store chunks in batches of 20
      const BATCH = 20;
      for (let i = 0; i < chunks.length; i += BATCH) {
        const batch = chunks.slice(i, i + BATCH);
        const embeddings = await this.embedBatch(batch.map((c) => c.content));

        const entities = batch.map((chunk, j) =>
          this.chunkRepo.create({
            id: uuidv4(),
            document_id: documentId,
            appliance_id: document.appliance_id,
            content: chunk.content,
            embedding: embeddings[j] ?? null,
            page_index: chunk.page_index,
            chunk_index: chunk.chunk_index,
          }),
        );

        await this.chunkRepo.save(entities);
      }

      const stored = await this.chunkRepo.count({ where: { document_id: documentId } });
      const withEmbedding = await this.chunkRepo
        .createQueryBuilder('c')
        .where('c.document_id = :documentId', { documentId })
        .andWhere('c.embedding IS NOT NULL')
        .getCount();

      if (stored === 0) {
        throw new Error('No text chunks were stored from this PDF');
      }
      if (withEmbedding === 0 && this.hasEmbeddings) {
        throw new Error('No embedding vectors were stored (check OPENAI_API_KEY and PDF text)');
      }

      // 5. Mark indexed — chunks are now available to the AI chatbot via retrieveContext()
      await this.documentRepo.update(documentId, {
        embedding_status: 'indexed',
        indexed_at: new Date(),
      });

      this.logger.log(
        withEmbedding
          ? `Doc ${documentId}: indexed ${withEmbedding}/${stored} chunks for chatbot RAG ✓`
          : `Doc ${documentId}: indexed ${stored} chunks for keyword search ✓ (no embeddings key)`,
      );
    } catch (err) {
      this.logger.error(`Doc ${documentId}: indexing failed — ${err}`);
      await this.documentRepo.update(documentId, { embedding_status: 'failed' });
    }
  }

  /**
   * Retrieve the top-K most relevant chunks for a given query + appliance.
   * Returns formatted text ready to inject into the system prompt.
   */
  async retrieveContext(query: string, applianceId: string): Promise<string> {
    const result = await this.retrieveContextWithMeta(query, applianceId);
    return result.context;
  }

  /** Same as retrieveContext but exposes whether PDF chunks were matched */
  /** All uploaded files for chatbot gallery (PDFs in RAG + images) */
  async getChatKnowledgeMedia(applianceId: string): Promise<{
    items: ChatKnowledgeMediaItem[];
    pdfs_in_rag: number;
    images: number;
  }> {
    const docs = await this.documentRepo.find({
      where: { appliance_id: applianceId },
      order: { created_at: 'DESC' },
    });

    const items: ChatKnowledgeMediaItem[] = [];
    let pdfsInRag = 0;
    let imageCount = 0;

    for (const doc of docs) {
      const kind: 'pdf' | 'image' = doc.mime_type?.startsWith(IMAGE_MIME_PREFIX)
        ? 'image'
        : 'pdf';
      if (kind === 'image') imageCount++;

      let chunkCount = 0;
      let pageCount = 0;
      if (kind === 'pdf') {
        chunkCount = await this.chunkRepo
          .createQueryBuilder('c')
          .where('c.document_id = :documentId', { documentId: doc.id })
          .andWhere('c.embedding IS NOT NULL')
          .getCount();
        if (chunkCount > 0) {
          pdfsInRag++;
          const maxPage = await this.chunkRepo
            .createQueryBuilder('c')
            .select('MAX(c.page_index)', 'max')
            .where('c.document_id = :documentId', { documentId: doc.id })
            .getRawOne<{ max: string | null }>();
          pageCount = Number(maxPage?.max ?? 0);
        }
      }

      items.push(this.toMediaItem(doc, kind, chunkCount, pageCount));
    }

    return { items, pdfs_in_rag: pdfsInRag, images: imageCount };
  }

  private toMediaItem(
    doc: DocumentEntity,
    kind: 'pdf' | 'image',
    chunkCount: number,
    pageCount = 0,
  ): ChatKnowledgeMediaItem {
    const base = this.configService.get<string>('app.apiPublicUrl') || 'http://localhost:3001';
    const apiBase = base.replace(/\/$/, '');
    const path = doc.file_url.startsWith('/') ? doc.file_url : `/${doc.file_url}`;
    return {
      id: doc.id,
      name: doc.name,
      file_url: doc.file_url,
      public_url: `${apiBase}${path}`,
      mime_type: doc.mime_type ?? (kind === 'image' ? 'image/jpeg' : 'application/pdf'),
      kind,
      embedding_status: doc.embedding_status,
      in_rag: kind === 'pdf' && chunkCount > 0,
      chunk_count: chunkCount,
      page_count: pageCount,
    };
  }

  async retrieveContextWithMeta(query: string, applianceId: string): Promise<RagContextResult> {
    try {
      const queryEmbedding = this.hasEmbeddings ? await this.embedText(query) : null;

      const chunks = await this.chunkRepo.find({
        where: { appliance_id: applianceId },
        select: ['id', 'document_id', 'content', 'embedding', 'chunk_index', 'page_index'],
      });

      if (!chunks.length) {
        this.logger.warn(`retrieveContext: no chunks for appliance ${applianceId}`);
        return { context: '', chunkCount: 0, topScore: 0, sources: [], excerpts: [] };
      }

      // Semantic search when embeddings exist; otherwise BM25 keyword ranking
      const canUseVectors = Boolean(queryEmbedding) && chunks.some((c) => this.normalizeEmbedding(c.embedding)?.length);
      const keyword = canUseVectors ? null : this.keywordScores(query, chunks.map((c) => c.content));
      const scored = chunks
        .map((c, i) => {
          let score: number;
          if (canUseVectors) {
            const embedding = this.normalizeEmbedding(c.embedding);
            if (!embedding?.length) return null;
            score = this.cosineSimilarity(queryEmbedding!, embedding);
          } else {
            score = keyword![i];
            if (score <= 0) return null;
          }
          return {
            document_id: c.document_id,
            content: c.content,
            page_index: c.page_index ?? 0,
            chunk_index: c.chunk_index ?? 0,
            score,
          };
        })
        .filter(
          (
            c,
          ): c is {
            document_id: string;
            content: string;
            page_index: number;
            chunk_index: number;
            score: number;
          } => c !== null,
        )
        .sort((a, b) => b.score - a.score);

      const topScore = scored[0]?.score ?? 0;
      const aboveMin = scored.filter((c) => c.score >= MIN_SIMILARITY);
      const picked =
        aboveMin.length > 0 ? aboveMin.slice(0, TOP_K) : scored.slice(0, Math.min(2, scored.length));

      if (!picked.length) {
        return { context: '', chunkCount: 0, topScore, sources: [], excerpts: [] };
      }

      const docIds = [...new Set(picked.map((c) => c.document_id))];
      const docs = await this.documentRepo.find({
        where: { id: In(docIds) },
      });
      const docNameById = new Map(docs.map((d) => [d.id, d.name]));

      const excerpts = picked.map((c) => ({
        text: c.content.trim().slice(0, 280),
        score: c.score,
        page_index: c.page_index,
        chunk_index: c.chunk_index,
        document_id: c.document_id,
        document_name: docNameById.get(c.document_id),
      }));
      const sources: ChatKnowledgeMediaItem[] = [];
      for (const doc of docs) {
        const chunkCount = await this.chunkRepo.count({ where: { document_id: doc.id } });
        sources.push(this.toMediaItem(doc, 'pdf', chunkCount));
      }

      const imageDocs = await this.documentRepo.find({
        where: { appliance_id: applianceId },
      });
      for (const doc of imageDocs) {
        if (doc.mime_type?.startsWith(IMAGE_MIME_PREFIX)) {
          sources.push(this.toMediaItem(doc, 'image', 0));
        }
      }

      const contextText = picked
        .map((c, i) => {
          const docName = docNameById.get(c.document_id) ?? 'Manual';
          const pageLabel =
            c.page_index > 0 ? `Page ${c.page_index}` : 'Page unknown';
          return `[${docName} — ${pageLabel} — excerpt ${i + 1}]\n${c.content.trim()}`;
        })
        .join('\n\n');

      const context = `\n\nOFFICIAL PRODUCT MANUAL (uploaded PDF, page-indexed) — YOU MUST USE THIS FIRST:
---
${contextText}
---
RULES FOR MANUAL EXCERPTS:
- Answer ONLY from these excerpts when they cover the user's question.
- Cite the manual page number when available (e.g. "See page 12 in your manual").
- Say clearly that the answer comes from the uploaded product manual.
- Do NOT say your answer is "general knowledge" or "not from a PDF" when excerpts are provided.
- If excerpts do not cover the question, say the manual does not mention it and offer to help another way.
- Never invent steps that are not supported by the excerpts.`;

      this.logger.log(
        `RAG ${applianceId}: ${picked.length} chunk(s), top score ${topScore.toFixed(3)}`,
      );

      return {
        context,
        chunkCount: picked.length,
        topScore,
        sources,
        excerpts,
      };
    } catch (err) {
      this.logger.warn(`retrieveContext failed: ${err}`);
      return { context: '', chunkCount: 0, topScore: 0, sources: [], excerpts: [] };
    }
  }

  /** MySQL/TypeORM may return JSON embeddings as string */
  private normalizeEmbedding(raw: number[] | string | null): number[] | null {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw) as number[];
        return Array.isArray(parsed) ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  }

  /** Return indexing status summary for an appliance */
  async getIndexingStatus(applianceId: string): Promise<{
    total: number;
    indexed: number;
    processing: number;
    failed: number;
    pending: number;
    /** Chunks with embeddings — what the AI chatbot actually uses */
    chunks_with_embeddings: number;
    ready_for_chat: boolean;
    lastIndexedAt: Date | null;
  }> {
    const docs = await this.documentRepo.find({ where: { appliance_id: applianceId } });
    const indexed = docs.filter((d) => d.embedding_status === 'indexed');
    const processing = docs.filter((d) => d.embedding_status === 'processing');
    const failed = docs.filter((d) => d.embedding_status === 'failed');
    const pending = docs.filter((d) => d.embedding_status === 'pending');

    const chunksWithEmbeddings = await this.chunkRepo
      .createQueryBuilder('c')
      .where('c.appliance_id = :applianceId', { applianceId })
      .andWhere('c.embedding IS NOT NULL')
      .getCount();

    const pdfDocs = docs.filter((d) => d.mime_type === 'application/pdf');
    const readyForChat =
      pdfDocs.length === 0 ||
      (chunksWithEmbeddings > 0 &&
        pdfDocs.every((d) => d.embedding_status === 'indexed' || d.embedding_status === 'failed'));

    const lastIndexedAt = indexed
      .map((d) => d.indexed_at)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

    return {
      total: docs.length,
      indexed: indexed.length,
      processing: processing.length,
      failed: failed.length,
      pending: pending.length,
      chunks_with_embeddings: chunksWithEmbeddings,
      ready_for_chat: readyForChat && chunksWithEmbeddings > 0,
      lastIndexedAt,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Check whether a file exists — in R2 or on local disk depending on config.
   */
  private async fileExists(fileUrl: string): Promise<boolean> {
    return this.documentFiles.existsByUrl(fileUrl);
  }

  /** Extract text per PDF page (page_index is 1-based). */
  private async extractPdfPages(
    fileUrl: string,
  ): Promise<Array<{ page_index: number; text: string }>> {
    try {
      let buffer: Buffer;

      try {
        // R2, local disk, or the database backup (restored if the host wiped the disk)
        buffer = await this.documentFiles.readByUrl(fileUrl);
      } catch (err) {
        this.logger.warn(`PDF unavailable (${fileUrl}): ${err}`);
        return [];
      }
      const pages: Array<{ page_index: number; text: string }> = [];
      let currentPage = 0;

      await pdfParse(buffer, {
        pagerender: (pageData: {
          getTextContent: (opts?: object) => Promise<{
            items: Array<{ str: string; transform: number[] }>;
          }>;
        }) => {
          currentPage += 1;
          const pageIndex = currentPage;

          return pageData.getTextContent({ normalizeWhitespace: true }).then((textContent) => {
            let lastY: number | undefined;
            let text = '';
            for (const item of textContent.items) {
              const y = item.transform[5];
              if (lastY !== undefined && y !== lastY) {
                text += '\n';
              }
              text += item.str;
              lastY = y;
            }

            const normalised = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
            if (normalised.length >= MIN_CHUNK_CHARS) {
              pages.push({ page_index: pageIndex, text: normalised });
            }
            return text;
          });
        },
      });

      return pages;
    } catch (err) {
      this.logger.warn(`PDF page extraction failed: ${err}`);
      return [];
    }
  }

  /**
   * Build embeddable chunks from page text. Each chunk carries page_index for retrieval.
   * Long pages are split into sub-chunks sharing the same page_index.
   */
  private chunkPages(
    pages: Array<{ page_index: number; text: string }>,
  ): Array<{ page_index: number; chunk_index: number; content: string }> {
    const chunks: Array<{ page_index: number; chunk_index: number; content: string }> = [];

    for (const page of pages) {
      const normalised = page.text.replace(/\n{3,}/g, '\n\n').trim();
      if (normalised.length <= PAGE_CHUNK_SIZE) {
        if (normalised.length >= MIN_CHUNK_CHARS) {
          chunks.push({
            page_index: page.page_index,
            chunk_index: 0,
            content: normalised,
          });
        }
        continue;
      }

      let start = 0;
      let subIndex = 0;
      while (start < normalised.length) {
        const end = Math.min(start + PAGE_CHUNK_SIZE, normalised.length);
        const slice = normalised.slice(start, end).trim();
        if (slice.length >= MIN_CHUNK_CHARS) {
          chunks.push({
            page_index: page.page_index,
            chunk_index: subIndex,
            content: slice,
          });
          subIndex += 1;
        }
        start += PAGE_CHUNK_SIZE - PAGE_CHUNK_OVERLAP;
        if (start >= normalised.length) break;
      }
    }

    return chunks;
  }

  /** Re-index PDFs for an appliance (pending/failed + "indexed" with no embeddings). */
  async reindexApplianceDocuments(
    applianceId: string,
    onlyDocumentId?: string,
  ): Promise<{ queued: number; documentIds: string[]; indexed: number; failed: number }> {
    const docs = await this.documentRepo.find({
      where: onlyDocumentId
        ? { id: onlyDocumentId, appliance_id: applianceId, mime_type: 'application/pdf' }
        : { appliance_id: applianceId, mime_type: 'application/pdf' },
    });

    const needsEmbedding = new Set<string>();
    for (const doc of docs) {
      if (!(await this.fileExists(doc.file_url))) {
        if (doc.embedding_status !== 'failed') {
          await this.documentRepo.update(doc.id, { embedding_status: 'failed' });
        }
        continue;
      }
      if (['pending', 'failed', 'processing'].includes(doc.embedding_status)) {
        needsEmbedding.add(doc.id);
        continue;
      }
      if (doc.embedding_status === 'indexed') {
        const chunkCount = await this.chunkRepo.count({
          where: { document_id: doc.id },
        });
        const withEmb = await this.chunkRepo
          .createQueryBuilder('c')
          .where('c.document_id = :documentId', { documentId: doc.id })
          .andWhere('c.embedding IS NOT NULL')
          .getCount();
        if (chunkCount === 0 || withEmb === 0) {
          needsEmbedding.add(doc.id);
        }
      }
    }

    let indexed = 0;
    let failed = 0;
    for (const id of needsEmbedding) {
      const before = await this.documentRepo.findOne({ where: { id } });
      await this.indexDocument(id);
      const after = await this.documentRepo.findOne({ where: { id } });
      if (after?.embedding_status === 'indexed') indexed++;
      else if (after?.embedding_status === 'failed') failed++;
      else if (before?.embedding_status !== after?.embedding_status) {
        /* still processing — counted as queued */
      }
    }

    return {
      queued: needsEmbedding.size,
      documentIds: [...needsEmbedding],
      indexed,
      failed,
    };
  }

  private async embedBatch(texts: string[]): Promise<(number[] | null)[]> {
    if (!this.hasEmbeddings) return texts.map(() => null);
    try {
      const response = await this.openai.embeddings.create({
        model: EMBED_MODEL,
        input: texts,
      });
      return response.data.map((d) => d.embedding);
    } catch (err) {
      this.logger.error(`Embedding batch failed: ${err}`);
      return texts.map(() => null);
    }
  }

  private async embedText(text: string): Promise<number[] | null> {
    const results = await this.embedBatch([text.slice(0, 2000)]);
    return results[0];
  }

  /**
   * BM25 keyword relevance of each document for the query, squashed to 0–1 so
   * it can share thresholds with cosine similarity. Error codes such as "E4"
   * or "5C" are kept as terms.
   */
  private keywordScores(query: string, docs: string[]): number[] {
    const STOP = new Set(('a an and are as at be but by can do does for from has have how i in is it its my me of on or so that the this to was what when where which why will with you your not no please help get got there they'
      + ' about after again also am any because been before being both could did doing each few further had having he her here hers him his into just more most must off once only other our out over own same she should some such than their them then these those through too under until very we were while who whom would yours').split(' '));
    const tokenize = (t: string) =>
      t.toLowerCase().normalize('NFKD').split(/[^a-z0-9\u0900-\u097f]+/).filter((w) => w && !STOP.has(w) && (w.length > 1 || /\d/.test(w)));
    const q = [...new Set(tokenize(query))];
    if (!q.length || !docs.length) return docs.map(() => 0);
    const toks = docs.map(tokenize);
    const avgLen = toks.reduce((n, t) => n + t.length, 0) / toks.length || 1;
    const df = new Map<string, number>();
    for (const t of toks) for (const w of new Set(t)) df.set(w, (df.get(w) ?? 0) + 1);
    const N = toks.length;
    const k1 = 1.4, b = 0.75;
    const raw = toks.map((t) => {
      const tf = new Map<string, number>();
      for (const w of t) tf.set(w, (tf.get(w) ?? 0) + 1);
      let s = 0;
      for (const w of q) {
        const f = tf.get(w);
        if (!f) continue;
        const idf = Math.log(1 + (N - (df.get(w) ?? 0) + 0.5) / ((df.get(w) ?? 0) + 0.5));
        s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * t.length) / avgLen)));
      }
      // Share of query terms present — rewards chunks that cover the whole question
      const coverage = q.filter((w) => tf.has(w)).length / q.length;
      return s * (0.5 + coverage);
    });
    // Squash to 0–1: ~0.55 is a strong match, comparable to the cosine thresholds
    return raw.map((s) => (s > 0 ? s / (s + 4) : 0));
  }

  /** Newest PDF manual of an appliance (for page links when no excerpt names the document). */
  async latestManualId(applianceId: string): Promise<string | null> {
    const doc = await this.documentRepo.findOne({
      where: { appliance_id: applianceId, mime_type: 'application/pdf' },
      order: { created_at: 'DESC' },
    });
    return doc?.id ?? null;
  }

  /**
   * One manual page as a JPEG, for the step cards of a visual guide. Rendered
   * with poppler on first request and cached on disk — no AI cost.
   */
  async renderManualPage(applianceId: string, documentId: string, page: number): Promise<Buffer | null> {
    if (!Number.isInteger(page) || page < 1 || page > 2000) return null;
    const doc = await this.documentRepo.findOne({ where: { id: documentId, appliance_id: applianceId } });
    if (!doc || doc.mime_type !== 'application/pdf') return null;

    const cacheDir = path.join(os.tmpdir(), 'scana-page-cache');
    const cached = path.join(cacheDir, `${doc.id}-${page}.jpg`);
    if (fs.existsSync(cached)) return fs.promises.readFile(cached);

    const pdfPath = path.join(cacheDir, `${doc.id}.pdf`);
    try {
      await fs.promises.mkdir(cacheDir, { recursive: true });
      if (!fs.existsSync(pdfPath)) await fs.promises.writeFile(pdfPath, await this.documentFiles.readByUrl(doc.file_url));
      await execFileAsync(
        'pdftoppm',
        ['-r', '90', '-jpeg', '-jpegopt', 'quality=80', '-f', String(page), '-l', String(page), '-singlefile', pdfPath, cached.replace(/\.jpg$/, '')],
        { timeout: 60_000 },
      );
      return fs.existsSync(cached) ? fs.promises.readFile(cached) : null;
    } catch (err) {
      this.logger.warn(`Manual page ${page} of ${doc.id} could not be rendered: ${err}`);
      return null;
    }
  }

  /** Cosine similarity between two equal-length vectors */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}
