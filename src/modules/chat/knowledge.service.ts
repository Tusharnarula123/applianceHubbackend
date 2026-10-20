import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DocumentEntity } from '../../entities/document.entity.js';
import {
  DocumentKnowledgeEntity,
  type KnowledgeItem,
  type KnowledgeStatus,
  type VerificationStatus,
} from '../../entities/document-knowledge.entity.js';
import { StorageService } from '../../common/storage.service.js';
import { resolveDocumentFilePath } from '../../common/uploads-path.js';
import { resolveAiConfig, type AiConfig } from '../../common/ai-config.js';

const execFileAsync = promisify(execFile);

const ITEM_TYPES = [
  'procedure',
  'troubleshooting',
  'error_code',
  'spec',
  'maintenance',
  'safety',
  'warranty',
  'faq',
] as const;

/** Pages sent to the vision model per request (Groq allows at most 5 images) */
const SCAN_BATCH = 4;
/** Keep each vision request under provider size limits (Groq: ~4MB of base64 per request) */
const SCAN_BATCH_BYTES = 2_500_000;
/** Items sent to the verifier per request */
const VERIFY_BATCH = 30;
/** Max characters of OCR text given to the verifier in one request */
const VERIFY_REF_CHARS = 120_000;
/** Max characters of verified knowledge injected into the chat system prompt */
const CHAT_CONTEXT_CHARS = 12_000;

const SCAN_PROMPT = `You are scanning pages of an appliance manual.
For EACH page image, write a faithful transcription in Markdown:
- Keep headings, numbered steps, bullet lists and table rows exactly as printed.
- Copy every number, unit, error code, model number and warning word-for-word.
- Describe diagrams/pictures briefly as [Diagram: ...] including any labels printed on them.
- Do not summarise, interpret or add anything that is not printed on the page.
Return JSON: {"pages":[{"page":<page number>,"content":"<markdown>"}]}`;

const GENERATE_PROMPT = `You turn a scanned appliance manual into structured, customer-ready support knowledge.
Use ONLY information present in the manual text. Never invent steps, numbers, codes or claims.
Every item must cite the page number(s) it came from in "pages".

Item types and their "data" fields:
- procedure:       { "title": string, "steps": string[], "warnings": string[] }   (how-to instructions, e.g. setup, defrosting, cleaning)
- troubleshooting: { "problem": string, "causes": string[], "steps": string[] }
- error_code:      { "code": string, "meaning": string, "action": string }
- spec:            { "name": string, "value": string }
- maintenance:     { "task": string, "frequency": string }
- safety:          { "text": string }
- warranty:        { "text": string }
- faq:             { "question": string, "answer": string }   (common customer questions answered by the manual)

Write steps as short imperative sentences. Keep exact values (temperatures, durations, codes) as printed.
Return JSON: {"summary":"<2-3 sentence overview of the product and manual>","items":[{"type":"...","data":{...},"pages":[n]}]}`;

const VERIFY_PROMPT = `You are a strict fact-checker. You are given OCR text extracted from an appliance manual
and a list of support items that another AI generated from the same manual.
Judge each item ONLY against the OCR text (OCR may contain small character errors — tolerate typos, not different facts).

For each item return:
- "verdict": "supported" (every fact and step is backed by the OCR text),
             "partially_supported" (mostly right but some detail is wrong, missing or added),
             "unsupported" (not found in the OCR text or contradicts it)
- "corrected_data": for partially_supported, the item's "data" object rewritten so that it is fully backed by the OCR text (same fields); otherwise null
- "evidence": a short verbatim quote (max 200 chars) from the OCR text that supports the item, or null
- "note": one short sentence explaining any problem, or null

Return JSON: {"results":[{"id":"<item id>","verdict":"...","corrected_data":{...}|null,"evidence":"...","note":"..."}]}`;

type RawItem = { type: string; data: Record<string, any>; pages: number[] };

@Injectable()
export class KnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeService.name);
  private readonly openai: OpenAI;
  private readonly ai: AiConfig;
  private readonly hasKey: boolean;
  private readonly model: string;
  private readonly maxPages: number;
  /** Builds run one at a time — OCR and vision calls are heavy on a small instance */
  private queue: Promise<void> = Promise.resolve();
  private readonly queued = new Set<string>();

  constructor(
    @InjectRepository(DocumentKnowledgeEntity)
    private readonly knowledgeRepo: Repository<DocumentKnowledgeEntity>,
    @InjectRepository(DocumentEntity)
    private readonly documentRepo: Repository<DocumentEntity>,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {
    this.ai = resolveAiConfig(this.configService);
    this.hasKey = !!this.ai.apiKey;
    this.openai = new OpenAI({ apiKey: this.ai.apiKey || 'not-configured', baseURL: this.ai.baseURL });
    this.model = this.ai.chatModel;
    this.maxPages = parseInt(this.configService.get<string>('KNOWLEDGE_MAX_PAGES') || '40', 10);
  }

  /** Resume builds interrupted by a restart, and build knowledge for PDFs that have none yet. */
  async onModuleInit() {
    setTimeout(() => void this.resumePending(), 5000);
  }

  private async resumePending() {
    try {
      const unfinished = await this.knowledgeRepo.find({
        where: { status: In(['pending', 'scanning', 'ocr', 'generating', 'verifying']) },
      });
      const pdfs = await this.documentRepo.find({ where: { mime_type: 'application/pdf' } });
      const existing = new Set(
        (await this.knowledgeRepo.find({ select: ['document_id'] })).map((k) => k.document_id),
      );
      const missing = pdfs.filter((d) => !existing.has(d.id));
      for (const k of unfinished) this.schedule(k.document_id);
      for (const d of missing) this.schedule(d.id);
      if (unfinished.length || missing.length) {
        this.logger.log(`Knowledge: queued ${unfinished.length} unfinished + ${missing.length} new PDF(s)`);
      }
    } catch (err) {
      this.logger.warn(`Knowledge resume skipped: ${err instanceof Error ? err.message : err}`);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Queue a knowledge build for a PDF document (fire and forget). */
  schedule(documentId: string): void {
    if (this.queued.has(documentId)) return;
    this.queued.add(documentId);
    this.queue = this.queue
      .then(() => this.build(documentId))
      .catch((err) => this.logger.error(`Knowledge build crashed for ${documentId}: ${err}`))
      .finally(() => this.queued.delete(documentId));
  }

  async rebuild(applianceId: string, documentId: string) {
    const doc = await this.documentRepo.findOne({ where: { id: documentId, appliance_id: applianceId } });
    if (!doc) throw new NotFoundException('Document not found for this appliance');
    await this.upsert(doc, { status: 'pending', stage_detail: 'Queued', error: null });
    this.schedule(documentId);
    return { document_id: documentId, status: 'pending' };
  }

  /** Full knowledge (all verification states) for the business dashboard. */
  async getForAppliance(applianceId: string) {
    const docs = await this.documentRepo.find({
      where: { appliance_id: applianceId, mime_type: 'application/pdf' },
      order: { created_at: 'DESC' },
    });
    const rows = await this.knowledgeRepo.find({ where: { appliance_id: applianceId } });
    const byDoc = new Map(rows.map((r) => [r.document_id, r]));
    return docs.map((d) => {
      const k = byDoc.get(d.id);
      return {
        document_id: d.id,
        document_name: d.name,
        status: k?.status ?? 'pending',
        stage_detail: k?.stage_detail ?? (this.queued.has(d.id) ? 'Queued' : 'Not started'),
        error: k?.error ?? null,
        page_count: k?.page_count ?? 0,
        summary: k?.summary ?? null,
        stats: k?.stats ?? null,
        items: k?.items ?? [],
        model: k?.model ?? null,
        updated_at: k?.updated_at ?? null,
      };
    });
  }

  /** Customer-facing guides: only verified or corrected items. */
  async getVerifiedGuides(applianceId: string) {
    const rows = await this.knowledgeRepo.find({ where: { appliance_id: applianceId, status: 'ready' } });
    const items = rows.flatMap((r) =>
      (r.items ?? []).filter((i) => i.verification.status !== 'unverified'),
    );
    return {
      summaries: rows.map((r) => r.summary).filter(Boolean),
      items,
      ready: rows.length > 0,
    };
  }

  /** Compact verified knowledge for the chatbot system prompt. */
  async getVerifiedContext(applianceId: string): Promise<string> {
    const { items, summaries } = await this.getVerifiedGuides(applianceId);
    if (!items.length) return '';
    const order = ['error_code', 'troubleshooting', 'procedure', 'safety', 'maintenance', 'spec', 'warranty', 'faq'];
    const sorted = [...items].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
    let out = `\n\nVERIFIED MANUAL KNOWLEDGE (cross-checked against OCR of the uploaded manual — prefer this over anything else and cite the page):\n`;
    if (summaries.length) out += summaries.join('\n') + '\n';
    for (const item of sorted) {
      const line = `- [${item.type}, p.${item.pages.join(',') || '?'}] ${this.itemToText(item)}\n`;
      if (out.length + line.length > CHAT_CONTEXT_CHARS) break;
      out += line;
    }
    return out;
  }

  // ── Pipeline ──────────────────────────────────────────────────────────────

  private async build(documentId: string): Promise<void> {
    const doc = await this.documentRepo.findOne({ where: { id: documentId } });
    if (!doc) return;
    if (doc.mime_type !== 'application/pdf') return;

    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scana-kb-'));
    try {
      if (!this.hasKey) {
        throw new Error('No AI key configured — set GROQ_API_KEY (or OPENAI_API_KEY) in the backend environment, then click Rebuild.');
      }

      // 0. Load PDF and render pages to images
      await this.upsert(doc, {
        status: 'scanning',
        stage_detail: 'Preparing pages',
        error: null,
        model: `${this.ai.visionModel} + ${this.ai.chatModel}`.slice(0, 50),
      });
      const pdfPath = path.join(workDir, 'source.pdf');
      await fs.writeFile(pdfPath, await this.loadPdf(doc.file_url));
      const totalPages = await this.pageCount(pdfPath);
      const pageCount = Math.min(totalPages, this.maxPages);
      if (pageCount === 0) throw new Error('The PDF has no readable pages');
      const images = await this.renderPages(pdfPath, workDir, pageCount);
      await this.upsert(doc, { page_count: pageCount });

      // 1. AI scan — vision model transcribes every page
      const aiScan: Array<{ page: number; content: string }> = [];
      for (const batch of await this.scanBatches(images)) {
        await this.upsert(doc, {
          status: 'scanning',
          stage_detail: `AI scanning pages ${batch[0].page}–${batch[batch.length - 1].page} of ${pageCount}`,
        });
        aiScan.push(...(await this.scanPages(batch)));
      }
      await this.upsert(doc, { ai_scan: aiScan });

      // 2. OCR — independent read of every page (tesseract + PDF text layer)
      const ocrPages: Array<{ page: number; ocr: string; text_layer: string }> = [];
      for (const img of images) {
        await this.upsert(doc, { status: 'ocr', stage_detail: `OCR reading page ${img.page} of ${pageCount}` });
        ocrPages.push({
          page: img.page,
          ocr: await this.ocrImage(img.file),
          text_layer: await this.textLayer(pdfPath, img.page),
        });
      }
      await this.upsert(doc, { ocr_pages: ocrPages });
      const ocrChars = ocrPages.reduce((n, p) => n + p.ocr.length + p.text_layer.length, 0);
      if (ocrChars < 20) throw new Error('OCR could not read any text from this PDF');

      // 3. Generate instructions and support content from the AI scan
      await this.upsert(doc, { status: 'generating', stage_detail: 'Generating instructions and guides' });
      const generated = await this.generate(aiScan, doc.name);

      // 4. Cross-verify every item against the OCR text
      await this.upsert(doc, { status: 'verifying', stage_detail: `Cross-verifying ${generated.items.length} items against OCR` });
      const items = await this.verify(generated.items, ocrPages);

      const stats = {
        total: items.length,
        verified: items.filter((i) => i.verification.status === 'verified').length,
        corrected: items.filter((i) => i.verification.status === 'corrected').length,
        unverified: items.filter((i) => i.verification.status === 'unverified').length,
        pages_processed: pageCount,
        pages_total: totalPages,
      };
      await this.upsert(doc, {
        status: 'ready',
        stage_detail:
          totalPages > pageCount
            ? `Done — first ${pageCount} of ${totalPages} pages processed`
            : `Done — ${stats.verified + stats.corrected} of ${stats.total} items verified`,
        summary: generated.summary,
        items,
        stats,
      });
      this.logger.log(`Knowledge ready for ${doc.name}: ${JSON.stringify(stats)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Knowledge build failed for ${doc.name}: ${message}`);
      await this.upsert(doc, { status: 'failed', stage_detail: 'Failed', error: message.slice(0, 2000) });
    } finally {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /** Group pages into vision requests by count and payload size */
  private async scanBatches(images: Array<{ page: number; file: string; scanFile: string }>) {
    const batches: Array<typeof images> = [];
    let current: typeof images = [];
    let bytes = 0;
    for (const img of images) {
      const size = Math.ceil(((await fs.stat(img.scanFile)).size * 4) / 3);
      if (current.length && (current.length >= SCAN_BATCH || bytes + size > SCAN_BATCH_BYTES)) {
        batches.push(current);
        current = [];
        bytes = 0;
      }
      current.push(img);
      bytes += size;
    }
    if (current.length) batches.push(current);
    return batches;
  }

  private async scanPages(batch: Array<{ page: number; file: string; scanFile: string }>) {
    const content: OpenAI.Chat.ChatCompletionContentPart[] = [
      { type: 'text', text: `Pages ${batch.map((b) => b.page).join(', ')} follow, in order.` },
    ];
    for (const b of batch) {
      content.push({ type: 'text', text: `Page ${b.page}:` });
      const base64 = (await fs.readFile(b.scanFile)).toString('base64');
      content.push({
        type: 'image_url',
        image_url:
          this.ai.provider === 'openai'
            ? { url: `data:image/jpeg;base64,${base64}`, detail: 'high' }
            : { url: `data:image/jpeg;base64,${base64}` },
      });
    }
    const json = await this.completeJson(
      [
        { role: 'system', content: SCAN_PROMPT },
        { role: 'user', content },
      ],
      8000,
      this.ai.visionModel,
    );
    const pages: Array<{ page: number; content: string }> = Array.isArray(json.pages) ? json.pages : [];
    // Guarantee one entry per requested page, in order
    return batch.map((b) => ({
      page: b.page,
      content: String(pages.find((p) => Number(p.page) === b.page)?.content ?? ''),
    }));
  }

  private async generate(aiScan: Array<{ page: number; content: string }>, docName: string) {
    const manual = aiScan.map((p) => `=== PAGE ${p.page} ===\n${p.content}`).join('\n\n');
    const json = await this.completeJson(
      [
        { role: 'system', content: GENERATE_PROMPT },
        { role: 'user', content: `Manual: ${docName}\n\n${manual}` },
      ],
      16000,
    );
    const items: RawItem[] = (Array.isArray(json.items) ? json.items : [])
      .filter((i: any) => i && (ITEM_TYPES as readonly string[]).includes(i.type) && i.data && typeof i.data === 'object')
      .map((i: any) => ({
        type: i.type,
        data: i.data,
        pages: (Array.isArray(i.pages) ? i.pages : [i.pages]).map(Number).filter((n: number) => Number.isFinite(n)),
      }));
    return { summary: typeof json.summary === 'string' ? json.summary : null, items };
  }

  private async verify(
    raw: RawItem[],
    ocrPages: Array<{ page: number; ocr: string; text_layer: string }>,
  ): Promise<KnowledgeItem[]> {
    const items = raw.map((r, idx) => ({ ...r, id: `${r.type}-${idx}` }));
    const verdicts = new Map<string, any>();

    for (let i = 0; i < items.length; i += VERIFY_BATCH) {
      const batch = items.slice(i, i + VERIFY_BATCH);
      const reference = this.referenceText(ocrPages, batch.flatMap((b) => b.pages));
      const json = await this.completeJson(
        [
          { role: 'system', content: VERIFY_PROMPT },
          {
            role: 'user',
            content:
              `OCR TEXT:\n${reference}\n\nITEMS TO VERIFY:\n` +
              JSON.stringify(batch.map((b) => ({ id: b.id, type: b.type, data: b.data, pages: b.pages }))),
          },
        ],
        8000,
      );
      for (const r of Array.isArray(json.results) ? json.results : []) {
        if (r?.id) verdicts.set(String(r.id), r);
      }
    }

    return items.map((item) => {
      const v = verdicts.get(item.id);
      const verdict: string = v?.verdict ?? 'unsupported';
      let data = item.data;
      let status: VerificationStatus = 'unverified';
      let note: string | null = v?.note ?? (v ? null : 'Verifier returned no result for this item');

      if (verdict === 'partially_supported' && v?.corrected_data && typeof v.corrected_data === 'object') {
        data = v.corrected_data;
      }
      const facts = this.factCheck({ ...item, data }, ocrPages);

      if (verdict === 'supported' && facts.found === facts.total) status = 'verified';
      else if (verdict === 'partially_supported' && data !== item.data && facts.found === facts.total) status = 'corrected';
      else if (verdict !== 'unsupported' && facts.found < facts.total) {
        note = `Not found in OCR text: ${facts.missing.slice(0, 5).join(', ')}`;
      }

      return {
        id: item.id,
        type: item.type as KnowledgeItem['type'],
        data,
        pages: item.pages,
        verification: {
          status,
          evidence: typeof v?.evidence === 'string' ? v.evidence.slice(0, 300) : null,
          note,
          facts_total: facts.total,
          facts_found: facts.found,
        },
      };
    });
  }

  // ── Deterministic cross-check ─────────────────────────────────────────────

  /** Every number and code in the item must appear in the OCR/text-layer of its cited pages (±1). */
  private factCheck(
    item: { data: Record<string, any>; pages: number[] },
    ocrPages: Array<{ page: number; ocr: string; text_layer: string }>,
  ) {
    const facts = this.extractFacts(this.flatten(item.data));
    const nearby = item.pages.length
      ? ocrPages.filter((p) => item.pages.some((n) => Math.abs(n - p.page) <= 1))
      : ocrPages;
    const ref = this.normalize((nearby.length ? nearby : ocrPages).map((p) => `${p.ocr}\n${p.text_layer}`).join('\n'));
    const missing = facts.filter((f) => !new RegExp(`(^|[^a-z0-9])${this.escape(f)}([^a-z0-9]|$)`).test(ref));
    return { total: facts.length, found: facts.length - missing.length, missing };
  }

  private extractFacts(text: string): string[] {
    const norm = this.normalize(text);
    const codes = norm.match(/\b[a-z]{1,3}-?\d{1,4}\b/g) ?? [];
    const numbers = (norm.match(/\d+(?:\.\d+)?/g) ?? []).filter((n) => n.length > 0);
    return [...new Set([...codes, ...numbers])];
  }

  private normalize(s: string): string {
    return s
      .toLowerCase()
      .replace(/[‐-―−]/g, '-')
      .replace(/(\d),(\d)/g, '$1.$2')
      .replace(/[^a-z0-9.\-\s]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  private flatten(v: unknown): string {
    if (v == null) return '';
    if (typeof v === 'string' || typeof v === 'number') return String(v);
    if (Array.isArray(v)) return v.map((x) => this.flatten(x)).join(' ');
    if (typeof v === 'object') return Object.values(v).map((x) => this.flatten(x)).join(' ');
    return '';
  }

  private escape(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private referenceText(ocrPages: Array<{ page: number; ocr: string; text_layer: string }>, cited: number[]) {
    const render = (pages: typeof ocrPages) =>
      pages
        .map((p) => `=== PAGE ${p.page} (OCR) ===\n${p.ocr}\n=== PAGE ${p.page} (PDF text layer) ===\n${p.text_layer}`)
        .join('\n\n');
    const full = render(ocrPages);
    if (full.length <= VERIFY_REF_CHARS) return full;
    const wanted = ocrPages.filter((p) => cited.some((n) => Math.abs(n - p.page) <= 1));
    return render(wanted).slice(0, VERIFY_REF_CHARS);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private itemToText(item: KnowledgeItem): string {
    const d = item.data;
    switch (item.type) {
      case 'procedure':
        return `${d.title}: ${(d.steps ?? []).map((s: string, i: number) => `${i + 1}) ${s}`).join(' ')}${d.warnings?.length ? ` Warnings: ${d.warnings.join('; ')}` : ''}`;
      case 'troubleshooting':
        return `Problem "${d.problem}" — causes: ${(d.causes ?? []).join('; ')} — fix: ${(d.steps ?? []).join(' ')}`;
      case 'error_code':
        return `${d.code}: ${d.meaning} → ${d.action}`;
      case 'spec':
        return `${d.name}: ${d.value}`;
      case 'maintenance':
        return `${d.task} (${d.frequency})`;
      case 'faq':
        return `Q: ${d.question} A: ${d.answer}`;
      default:
        return String(d.text ?? this.flatten(d));
    }
  }

  private async completeJson(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    maxTokens: number,
    model: string = this.model,
  ) {
    const res = await this.openai.chat.completions.create({
      model,
      messages,
      temperature: 0,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      // gpt-oss on Groq is a reasoning model; reasoning tokens count toward max_tokens
      ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'medium' as const } : {}),
    });
    const text = res.choices[0]?.message?.content ?? '{}';
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Model returned invalid JSON (finish_reason=${res.choices[0]?.finish_reason})`);
    }
  }

  private async loadPdf(fileUrl: string): Promise<Buffer> {
    if (this.storageService.isEnabled()) {
      return this.storageService.download(this.storageService.keyFromFileUrl(fileUrl));
    }
    const filePath = resolveDocumentFilePath(fileUrl);
    if (!fsSync.existsSync(filePath)) {
      throw new Error('PDF file is no longer on the server (local uploads are lost on redeploy) — upload it again');
    }
    return fs.readFile(filePath);
  }

  private async pageCount(pdfPath: string): Promise<number> {
    const { stdout } = await execFileAsync('pdfinfo', [pdfPath], { timeout: 60_000 });
    const m = stdout.match(/Pages:\s+(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  private async renderPages(pdfPath: string, workDir: string, pageCount: number) {
    await execFileAsync('pdftoppm', ['-r', '150', '-png', '-f', '1', '-l', String(pageCount), pdfPath, path.join(workDir, 'p')], {
      timeout: 10 * 60_000,
    });
    // Smaller JPEGs for the vision model (request size limits); PNGs above stay full quality for OCR
    await execFileAsync(
      'pdftoppm',
      ['-r', '110', '-jpeg', '-jpegopt', 'quality=85', '-f', '1', '-l', String(pageCount), pdfPath, path.join(workDir, 's')],
      { timeout: 10 * 60_000 },
    );
    const all = await fs.readdir(workDir);
    const pageOf = (f: string) => parseInt(f.match(/-(\d+)\./)![1], 10);
    const jpgs = new Map(all.filter((f) => /^s-\d+\.jpg$/.test(f)).map((f) => [pageOf(f), path.join(workDir, f)]));
    return all
      .filter((f) => /^p-\d+\.png$/.test(f))
      .map((f) => ({ page: pageOf(f), file: path.join(workDir, f), scanFile: jpgs.get(pageOf(f)) ?? path.join(workDir, f) }))
      .sort((a, b) => a.page - b.page);
  }

  private async ocrImage(file: string): Promise<string> {
    const { stdout } = await execFileAsync('tesseract', [file, 'stdout', '-l', 'eng', '--psm', '3'], {
      timeout: 3 * 60_000,
      maxBuffer: 20 * 1024 * 1024,
    });
    return stdout.trim();
  }

  private async textLayer(pdfPath: string, page: number): Promise<string> {
    try {
      const { stdout } = await execFileAsync('pdftotext', ['-layout', '-f', String(page), '-l', String(page), pdfPath, '-'], {
        timeout: 60_000,
        maxBuffer: 20 * 1024 * 1024,
      });
      return stdout.trim();
    } catch {
      return '';
    }
  }

  private async upsert(doc: DocumentEntity, patch: Partial<DocumentKnowledgeEntity> & { status?: KnowledgeStatus }) {
    const existing = await this.knowledgeRepo.findOne({ where: { document_id: doc.id } });
    if (existing) {
      await this.knowledgeRepo.save({ ...existing, ...patch });
    } else {
      await this.knowledgeRepo.save(
        this.knowledgeRepo.create({ document_id: doc.id, appliance_id: doc.appliance_id, status: 'pending', ...patch }),
      );
    }
  }
}
