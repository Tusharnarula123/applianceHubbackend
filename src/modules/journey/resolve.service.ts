import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { ProductIdentifierEntity } from '../../entities/connect-records.entity.js';
import { ProductResolutionEntity } from '../../entities/case-event.entity.js';
import { resolveAiConfig, type AiConfig } from '../../common/ai-config.js';

/** Characters OCR and people commonly mix up on rating plates. */
const CONFUSABLE: Record<string, string> = { O: '0', Q: '0', D: '0', I: '1', L: '1', S: '5', B: '8', Z: '2', G: '6' };

const normalize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
const canonical = (s: string) => normalize(s).split('').map((c) => CONFUSABLE[c] ?? c).join('');

/** Positions (0-based, in the normalized input) where input and model differ only by a confusable character. */
function confusablePositions(input: string, model: string): number[] {
  const a = normalize(input);
  const b = normalize(model);
  if (a.length !== b.length) return [];
  const out: number[] = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) out.push(i);
  return out;
}

export type ResolveCandidate = {
  appliance_id: string;
  name: string;
  model: string | null;
  category: string;
  image_url: string | null;
  color: string | null;
  /** exact = identical code; confusable = differs only by look-alike characters; partial = regional/suffix variant */
  match: 'exact' | 'confusable' | 'partial';
  matched_code: string;
  differing_positions: number[];
};

/**
 * P0 product identity: resolve a QR, barcode, typed model or label photo to
 * the brand's catalogue. Anything short of a single exact match must be
 * confirmed by the customer — never guessed.
 */
@Injectable()
export class ResolveService {
  private readonly logger = new Logger(ResolveService.name);
  private readonly ai: AiConfig;
  private readonly openai: OpenAI;

  constructor(
    @InjectRepository(ApplianceEntity) private applianceRepo: Repository<ApplianceEntity>,
    @InjectRepository(ProductIdentifierEntity) private identifierRepo: Repository<ProductIdentifierEntity>,
    @InjectRepository(ProductResolutionEntity) private resolutionRepo: Repository<ProductResolutionEntity>,
    config: ConfigService,
  ) {
    this.ai = resolveAiConfig(config);
    this.openai = new OpenAI({ apiKey: this.ai.apiKey || 'not-configured', baseURL: this.ai.baseURL });
  }

  async resolve(rawInput: string, method: string, businessId?: string | null) {
    const input = (rawInput ?? '').trim().slice(0, 120);
    const key = normalize(input);
    if (key.length < 3) throw new BadRequestException('Enter at least 3 characters of the model number');

    const where = businessId ? { business_id: businessId } : {};
    const appliances = await this.applianceRepo.find({ where, take: 5000 });
    const byId = new Map(appliances.map((a) => [a.id, a]));
    const identifiers = appliances.length
      ? await this.identifierRepo.find({ where: { appliance_id: In(appliances.map((a) => a.id)) } })
      : [];

    // Every code a product can be known by
    const codes: Array<{ appliance_id: string; code: string }> = [];
    for (const a of appliances) {
      if (a.model) codes.push({ appliance_id: a.id, code: a.model });
      if (a.sku) codes.push({ appliance_id: a.id, code: a.sku });
    }
    for (const i of identifiers) codes.push({ appliance_id: i.appliance_id, code: i.value });

    const found = new Map<string, ResolveCandidate>();
    const consider = (applianceId: string, code: string, match: ResolveCandidate['match']) => {
      const a = byId.get(applianceId);
      if (!a) return;
      const rank = { exact: 0, confusable: 1, partial: 2 };
      const prev = found.get(applianceId);
      if (prev && rank[prev.match] <= rank[match]) return;
      found.set(applianceId, {
        appliance_id: a.id, name: a.name, model: a.model ?? null, category: a.category,
        image_url: a.image_url ?? null, color: a.color ?? null, match, matched_code: code,
        differing_positions: match === 'confusable' ? confusablePositions(input, code) : [],
      });
    };

    for (const c of codes) {
      const n = normalize(c.code);
      if (!n) continue;
      if (n === key) consider(c.appliance_id, c.code, 'exact');
      else if (canonical(c.code) === canonical(input)) consider(c.appliance_id, c.code, 'confusable');
      // Regional/colour suffix variants, e.g. WF45T6000AW vs WF45T6000AW/US — only for reasonably long codes
      else if (key.length >= 6 && (n.startsWith(key) || key.startsWith(n)) && Math.abs(n.length - key.length) <= 4) {
        consider(c.appliance_id, c.code, 'partial');
      }
    }

    const rank = { exact: 0, confusable: 1, partial: 2 } as const;
    const candidates = [...found.values()].sort((a, b) => rank[a.match] - rank[b.match]).slice(0, 8);
    const exact = candidates.filter((c) => c.match === 'exact');
    const outcome = exact.length === 1 ? 'exact' : candidates.length ? 'needs_confirmation' : 'not_found';

    const log = await this.resolutionRepo.save(this.resolutionRepo.create({
      id: uuidv4(),
      business_id: businessId ?? (candidates[0] ? byId.get(candidates[0].appliance_id)?.business_id ?? null : null),
      method: ['qr', 'barcode', 'label_photo', 'typed'].includes(method) ? method : 'typed',
      input: input.slice(0, 255),
      outcome,
      candidate_ids: candidates.map((c) => c.appliance_id),
    }));

    return {
      resolution_id: log.id,
      input,
      outcome,
      /** When outcome is exact the client may continue; otherwise the customer must pick or correct */
      confirmed: outcome === 'exact' ? exact[0] : null,
      candidates,
      message:
        outcome === 'exact' ? 'Model matched exactly.'
        : outcome === 'needs_confirmation' ? 'We found close matches. Please check the model on your label and pick the right one.'
        : 'No product matches that model. Check the label — the model number is usually next to "Model" or "MOD".',
    };
  }

  /** The customer picked a product (possibly not the top suggestion) — record it for accuracy metrics. */
  async confirm(resolutionId: string, applianceId: string, edited = false) {
    const r = await this.resolutionRepo.findOne({ where: { id: resolutionId } });
    if (!r) throw new NotFoundException('Resolution not found');
    const a = await this.applianceRepo.findOne({ where: { id: applianceId } });
    if (!a) throw new NotFoundException('Product not found');
    r.chosen_appliance_id = applianceId;
    r.corrected = edited || !r.candidate_ids?.length || r.candidate_ids[0] !== applianceId;
    r.business_id = r.business_id ?? a.business_id;
    await this.resolutionRepo.save(r);
    return { appliance_id: a.id, chat_url: `/chat/${a.id}` };
  }

  /**
   * Read the model (and serial) from a photo of the rating plate. Characters
   * the vision model is unsure about are returned so the UI can ask.
   */
  async readLabel(image: Buffer, mime: string, businessId?: string | null) {
    if (!this.ai.apiKey) throw new ServiceUnavailableException('Label reading needs an AI key on the server.');
    if (!/^image\/(jpeg|png|webp)$/.test(mime)) throw new BadRequestException('Upload a JPG, PNG or WebP photo');
    if (image.length > 8 * 1024 * 1024) throw new BadRequestException('Photo must be under 8 MB');

    const url = `data:${mime};base64,${image.toString('base64')}`;
    const res = await this.openai.chat.completions.create({
      model: this.ai.visionModel,
      temperature: 0,
      max_tokens: this.ai.visionModel.startsWith('openai/gpt-oss') ? 2048 : 400,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You read appliance rating plates / model labels. Return JSON: {"brand":string|null,"model":string|null,"serial":string|null,"uncertain_characters":string[],"readable":boolean}. ' +
            'Copy the model number exactly as printed (after "Model", "MOD", "Model No"). Do not guess unreadable characters — list any character you are not sure about in uncertain_characters (e.g. "0 or O at position 6"). If no label is visible set readable=false.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Read the model and serial number on this label.' },
            { type: 'image_url', image_url: this.ai.provider === 'openai' ? { url, detail: 'high' } : { url } },
          ],
        },
      ],
    });

    let parsed: any = {};
    try { parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}'); } catch { parsed = {}; }
    if (!parsed.readable || !parsed.model) {
      return { read: { brand: parsed.brand ?? null, model: null, serial: null, uncertain_characters: [] }, resolution: null,
        message: "We couldn't read a model number. Try a sharper photo in good light, or type the model." };
    }
    const resolution = await this.resolve(String(parsed.model), 'label_photo', businessId);
    return {
      read: {
        brand: parsed.brand ?? null,
        model: String(parsed.model),
        serial: parsed.serial ? String(parsed.serial) : null,
        uncertain_characters: Array.isArray(parsed.uncertain_characters) ? parsed.uncertain_characters.slice(0, 10).map(String) : [],
      },
      // A photo read is never treated as certain on its own
      resolution: resolution.outcome === 'exact' && (parsed.uncertain_characters ?? []).length
        ? { ...resolution, outcome: 'needs_confirmation', confirmed: null }
        : resolution,
    };
  }
}
