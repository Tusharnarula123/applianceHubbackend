import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { ChatSessionEntity } from '../../entities/chat-session.entity.js';
import { MessageEntity } from '../../entities/message.entity.js';
import { WarrantyRegistrationEntity } from '../../entities/warranty-registration.entity.js';
import { ClaimEntity } from '../../entities/claim.entity.js';
import { BookingEntity } from '../../entities/booking.entity.js';
import { QrCodeEntity } from '../../entities/qr-code.entity.js';
import { RagService } from './rag.service.js';
import { CacheService } from '../../common/cache.service.js';
import { ActivityService } from '../activities/activity.service.js';

// ─── Tool definitions for OpenAI ───────────────────────────────────────────

const CHATBOT_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_appliance_info',
      description:
        'Get detailed information about the appliance including name, model, category, status, and statistics.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_warranties',
      description:
        'Look up warranty registrations for the appliance. Returns a list of warranties with customer details, status, purchase date, and expiry date.',
      parameters: {
        type: 'object',
        properties: {
          customer_email: {
            type: 'string',
            description: "Customer's email to filter warranties. Optional.",
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_warranty_pdf_url',
      description: 'Get the download URL for a warranty certificate PDF.',
      parameters: {
        type: 'object',
        properties: {
          warranty_id: {
            type: 'string',
            description: 'The warranty registration ID.',
          },
        },
        required: ['warranty_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_claims',
      description:
        'Look up service claims for the appliance. Returns claim ID, status, priority, issue description, and filing date.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['open', 'pending', 'resolved'],
            description: 'Filter claims by status. Optional.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_claim',
      description:
        'File a new warranty or service claim on behalf of the customer.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: "Customer's full name." },
          customer_email: { type: 'string', description: "Customer's email address." },
          customer_phone: { type: 'string', description: "Customer's phone number. Optional." },
          issue: { type: 'string', description: 'Detailed description of the issue.' },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Claim priority level.',
          },
          warranty_id: {
            type: 'string',
            description: 'Associated warranty ID if applicable. Optional.',
          },
        },
        required: ['customer_name', 'customer_email', 'issue', 'priority'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_claim_pdf_url',
      description: 'Get the download URL for a claim details PDF.',
      parameters: {
        type: 'object',
        properties: {
          claim_id: { type: 'string', description: 'The claim ID.' },
        },
        required: ['claim_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_bookings',
      description:
        'Look up service bookings for the appliance. Returns booking details, service type, scheduled date, and status.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'completed', 'cancelled'],
            description: 'Filter bookings by status. Optional.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_booking',
      description: 'Schedule a new service booking for the appliance.',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: "Customer's full name." },
          customer_email: { type: 'string', description: "Customer's email address." },
          customer_phone: { type: 'string', description: "Customer's phone number. Optional." },
          service_type: {
            type: 'string',
            enum: ['repair', 'maintenance', 'inspection', 'installation'],
            description: 'Type of service required.',
          },
          preferred_date: {
            type: 'string',
            description: 'Preferred service date in YYYY-MM-DD format.',
          },
          preferred_time: {
            type: 'string',
            description: 'Preferred time slot, e.g. "09:00-12:00". Optional.',
          },
          notes: { type: 'string', description: 'Additional notes or instructions. Optional.' },
          claim_id: { type: 'string', description: 'Related claim ID. Optional.' },
        },
        required: ['customer_name', 'customer_email', 'service_type', 'preferred_date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_booking_pdf_url',
      description: 'Get the download URL for a booking confirmation PDF.',
      parameters: {
        type: 'object',
        properties: {
          booking_id: { type: 'string', description: 'The booking ID.' },
        },
        required: ['booking_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_appliance_pdf_url',
      description: 'Get the download URL for a full appliance report PDF.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

// ─── Service ───────────────────────────────────────────────────────────────

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);
  private openai: OpenAI;

  constructor(
    @InjectRepository(ApplianceEntity)
    private applianceRepo: Repository<ApplianceEntity>,
    @InjectRepository(ChatSessionEntity)
    private sessionRepo: Repository<ChatSessionEntity>,
    @InjectRepository(MessageEntity)
    private messageRepo: Repository<MessageEntity>,
    @InjectRepository(WarrantyRegistrationEntity)
    private warrantyRepo: Repository<WarrantyRegistrationEntity>,
    @InjectRepository(ClaimEntity)
    private claimRepo: Repository<ClaimEntity>,
    @InjectRepository(BookingEntity)
    private bookingRepo: Repository<BookingEntity>,
    @InjectRepository(QrCodeEntity)
    private qrCodeRepo: Repository<QrCodeEntity>,
    private configService: ConfigService,
    private ragService: RagService,
    private cacheService: CacheService,
    private activityService: ActivityService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Returns the chatbot UI config (color, name, welcome msg, tone, description, image) for a given appliance */
  async getChatbotConfig(applianceId: string) {
    const appliance = await this.applianceRepo.findOne({ where: { id: applianceId } });
    if (!appliance) throw new NotFoundException(`Appliance ${applianceId} not found`);
    return await this.formatConfig(appliance);
  }

  private async formatConfig(appliance: ApplianceEntity) {
    const media = await this.ragService.getChatKnowledgeMedia(appliance.id);
    return {
      appliance_id: appliance.id,
      appliance_name: appliance.name,
      bot_name: appliance.bot_name ?? 'ApplianceBot',
      bot_welcome: appliance.bot_welcome ?? `Hi! I'm here to help you with your ${appliance.name}. How can I assist you today?`,
      bot_tone: appliance.bot_tone ?? 'professional',
      color: appliance.color ?? '#4F46E5',
      model: appliance.model,
      category: appliance.category,
      description: (appliance as any).description ?? null,
      image_url: (appliance as any).image_url ?? null,
      /** PDFs embedded in RAG + uploaded images — show in chatbot sidebar/gallery */
      knowledge_media: media.items,
      knowledge_summary: {
        pdfs_in_rag: media.pdfs_in_rag,
        images: media.images,
        total: media.items.length,
      },
    };
  }

  /**
   * Record a QR code scan for an appliance and return chatbot config in one call.
   * Called by the public /chat/[applianceId] page on load.
   */
  async recordScanAndGetConfig(applianceId: string) {
    const appliance = await this.applianceRepo.findOne({ where: { id: applianceId } });
    if (!appliance) throw new NotFoundException(`Appliance ${applianceId} not found`);

    // Increment scan count on the latest QR code for this appliance (best-effort)
    try {
      const qr = await this.qrCodeRepo.findOne({
        where: { appliance_id: applianceId },
        order: { created_at: 'DESC' },
      });
      if (qr) {
        qr.scan_count += 1;
        await this.qrCodeRepo.save(qr);
        appliance.scans_count += 1;
        await this.applianceRepo.save(appliance);
        await this.activityService.logForAppliance(
          applianceId,
          'scan',
          `QR code scanned for ${appliance.name}`,
          { qr_code_id: qr.id, source: 'chatbot' },
        );
      }
    } catch (err) {
      this.logger.warn(`Scan tracking failed for appliance ${applianceId}: ${err}`);
    }

    return await this.formatConfig(appliance);
  }

  /** Create a new AI chat session for an appliance */
  async createAiSession(applianceId: string, metadata?: Record<string, any>) {
    const appliance = await this.applianceRepo.findOne({ where: { id: applianceId } });
    if (!appliance) throw new NotFoundException(`Appliance ${applianceId} not found`);

    const session = this.sessionRepo.create({
      id: uuidv4(),
      appliance_id: applianceId,
      ...(metadata ?? {}),
    });

    const saved = await this.sessionRepo.save(session);

    // Save initial welcome message from assistant
    const welcomeContent =
      appliance.bot_welcome ??
      `Hi! I'm ${appliance.bot_name ?? 'ApplianceBot'}, your assistant for the ${appliance.name}. I can help you with warranties, claims, service bookings, and general product information. How can I help you today?`;

    await this.messageRepo.save(
      this.messageRepo.create({
        id: uuidv4(),
        chat_session_id: saved.id,
        role: 'assistant',
        content: welcomeContent,
      }),
    );

    const config = await this.formatConfig(appliance);

    return {
      session_id: saved.id,
      appliance_id: applianceId,
      bot_name: appliance.bot_name ?? 'ApplianceBot',
      bot_welcome: welcomeContent,
      color: appliance.color ?? '#4F46E5',
      bot_tone: appliance.bot_tone ?? 'professional',
      started_at: saved.started_at,
      knowledge_media: config.knowledge_media,
      knowledge_summary: config.knowledge_summary,
    };
  }

  /** Send a user message and get an AI response (with full tool-call loop) */
  async sendMessage(
    sessionId: string,
    userMessage: string,
    customerContext?: { customer_name?: string; customer_email?: string },
  ) {
    // 1. Load session + appliance
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
      relations: ['appliance'],
    });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    const appliance = session.appliance as ApplianceEntity;

    // 2. Save the user message to DB
    await this.messageRepo.save(
      this.messageRepo.create({
        id: uuidv4(),
        chat_session_id: sessionId,
        role: 'user',
        content: userMessage,
      }),
    );

    // 3. Load conversation history
    const history = await this.messageRepo.find({
      where: { chat_session_id: sessionId },
      order: { created_at: 'ASC' },
    });

    // 4. Retrieve RAG context from indexed PDFs (document_chunks)
    const rag = await this.ragService.retrieveContextWithMeta(userMessage, appliance.id);
    const ragContext = rag.context;

    // 5. Build OpenAI messages array
    const systemPrompt = this.buildSystemPrompt(appliance, customerContext, ragContext);
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
    ];

    // 6. Run the tool-calling loop
    const { finalContent, toolCallsMade, pdfUrls } = await this.runToolLoop(
      openaiMessages,
      appliance,
      customerContext,
    );

    // 6. Save assistant reply to DB
    await this.messageRepo.save(
      this.messageRepo.create({
        id: uuidv4(),
        chat_session_id: sessionId,
        role: 'assistant',
        content: finalContent,
      }),
    );

    const gallery = await this.ragService.getChatKnowledgeMedia(appliance.id);

    return {
      session_id: sessionId,
      role: 'assistant' as const,
      content: finalContent,
      tool_calls_made: toolCallsMade,
      pdf_urls: pdfUrls,
      rag_used: rag.chunkCount > 0,
      rag_chunks: rag.chunkCount,
      /** PDFs used for this answer + related images to render under the message */
      rag_sources: rag.sources,
      rag_excerpts: rag.excerpts,
      knowledge_media: gallery.items,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private buildSystemPrompt(
    appliance: ApplianceEntity,
    customerContext?: { customer_name?: string; customer_email?: string },
    ragContext?: string,
  ): string {
    const botName = appliance.bot_name ?? 'ApplianceBot';
    const tone = appliance.bot_tone ?? 'professional';

    const TONE_INSTRUCTIONS: Record<string, string> = {
      professional: 'Be professional, clear, and helpful. Strike a balance between warmth and precision.',
      friendly:     'Be warm, conversational, and encouraging. Use simple everyday language. Add light empathy.',
      formal:       'Be strictly formal. Use proper business language. Address the customer respectfully at all times.',
      technical:    'Be precise and technical. Include model numbers, part references, and step-by-step detail where relevant.',
      casual:       'Be relaxed and informal. Use everyday language, keep it brief and approachable.',
    };
    const toneInstruction = TONE_INSTRUCTIONS[tone] ?? TONE_INSTRUCTIONS.professional;

    const customerInfo = customerContext?.customer_name
      ? `\nThe customer's name is ${customerContext.customer_name}${customerContext.customer_email ? ` (${customerContext.customer_email})` : ''}.`
      : '';

    const descriptionSection = (appliance as any).description
      ? `\nAPPLIANCE DESCRIPTION:\n${(appliance as any).description}`
      : '';

    const manualSection = ragContext?.trim()
      ? ragContext
      : '\n\nNO MANUAL EXCERPTS WERE RETRIEVED for this question. If the user asks about product-specific steps, say you do not have matching text from their uploaded manual and suggest they confirm the PDF is indexed (GET /api/chat/ai/:id/rag-status). Do not claim answers come from a PDF.';

    return `You are ${botName}, an intelligent customer support assistant for the ${appliance.name}${appliance.model ? ` (${appliance.model})` : ''}.
Category: ${appliance.category}. SKU: ${appliance.sku}.
${descriptionSection}${manualSection}

TONE: ${toneInstruction}
${customerInfo}

CAPABILITIES — you help customers with:
• Warranty registration lookups and certificate downloads
• Filing and tracking service claims
• Scheduling and managing service bookings
• General product information, appliance details, and troubleshooting

TOOL USE GUIDELINES:
- Always call the relevant tool before answering questions about real data. Never invent IDs.
- When you create a claim or booking, share the ID with the customer for future reference.
- After creating a claim or booking, proactively offer a PDF confirmation.
- If data is not found, say so clearly and offer to create a new record.
- Keep replies concise, actionable, and in the configured tone above.

Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
  }

  /** Runs the OpenAI chat completion loop, executing tool calls until the model produces a final text response */
  private async runToolLoop(
    messages: OpenAI.Chat.ChatCompletionMessageParam[],
    appliance: ApplianceEntity,
    customerContext?: { customer_name?: string; customer_email?: string },
  ): Promise<{ finalContent: string; toolCallsMade: string[]; pdfUrls: Record<string, string> }> {
    const toolCallsMade: string[] = [];
    const pdfUrls: Record<string, string> = {};
    const MAX_ROUNDS = 8; // prevent infinite loops
    let round = 0;

    let currentMessages = [...messages];

    while (round < MAX_ROUNDS) {
      round++;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: currentMessages,
        tools: CHATBOT_TOOLS,
        tool_choice: 'auto',
        temperature: 0.4,
        max_tokens: 1024,
      });

      const choice = completion.choices[0];
      const assistantMsg = choice.message;

      // No more tool calls — we have the final reply
      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        return {
          finalContent: assistantMsg.content ?? 'I apologize, I was unable to generate a response.',
          toolCallsMade,
          pdfUrls,
        };
      }

      // Execute each tool call
      currentMessages.push(assistantMsg as OpenAI.Chat.ChatCompletionMessageParam);

      for (const toolCall of assistantMsg.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const fnName = (toolCall as any).function.name as string;
        let args: Record<string, any> = {};
        try {
          args = JSON.parse((toolCall as any).function.arguments || '{}');
        } catch {
          args = {};
        }

        toolCallsMade.push(fnName);
        this.logger.log(`Tool call: ${fnName}(${JSON.stringify(args)})`);

        const result = await this.executeTool(fnName, args, appliance, customerContext, pdfUrls);

        currentMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }

    // Fallback if we somehow exhaust rounds
    return {
      finalContent: 'I was unable to complete your request after multiple attempts. Please try again.',
      toolCallsMade,
      pdfUrls,
    };
  }

  /** Dispatches a tool call to the appropriate internal method */
  private async executeTool(
    name: string,
    args: Record<string, any>,
    appliance: ApplianceEntity,
    customerContext?: { customer_name?: string; customer_email?: string },
    pdfUrls?: Record<string, string>,
  ): Promise<unknown> {
    const applianceId = appliance.id;
    const baseUrl = this.configService.get<string>('APP_BASE_URL') ?? 'http://localhost:3001';

    switch (name) {
      // ── Appliance ────────────────────────────────────────────
      case 'get_appliance_info': {
        const a = await this.applianceRepo.findOne({
          where: { id: applianceId },
          relations: ['business', 'documents', 'warranties', 'claims', 'bookings'],
        });
        if (!a) return { error: 'Appliance not found' };
        return {
          id: a.id,
          name: a.name,
          model: a.model,
          sku: a.sku,
          category: a.category,
          status: a.status,
          color: a.color,
          description: (a as any).description ?? null,
          image_url: (a as any).image_url ?? null,
          scans_count: a.scans_count,
          business_name: a.business?.name,
          total_documents: a.documents?.length ?? 0,
          total_warranties: a.warranties?.length ?? 0,
          total_claims: a.claims?.length ?? 0,
          total_bookings: a.bookings?.length ?? 0,
        };
      }

      case 'get_appliance_pdf_url': {
        const url = `${baseUrl}/pdf/appliance/${applianceId}`;
        if (pdfUrls) pdfUrls['appliance_report'] = url;
        return { pdf_url: url, description: 'Full appliance report PDF' };
      }

      // ── Warranties ────────────────────────────────────────────
      case 'get_warranties': {
        const where: any = { appliance_id: applianceId };
        if (args.customer_email) where.customer_email = args.customer_email;
        const warranties = await this.warrantyRepo.find({ where, order: { created_at: 'DESC' } });
        if (!warranties.length) return { message: 'No warranties found for this appliance.', warranties: [] };
        return {
          count: warranties.length,
          warranties: warranties.map((w) => ({
            id: w.id,
            customer_name: w.customer_name,
            customer_email: w.customer_email,
            status: w.status,
            serial_number: w.serial_number,
            purchase_date: w.purchase_date,
            expiry_date: w.expiry_date,
          })),
        };
      }

      case 'get_warranty_pdf_url': {
        const url = `${baseUrl}/pdf/warranty/${args.warranty_id}`;
        if (pdfUrls) pdfUrls[`warranty_${args.warranty_id}`] = url;
        return { pdf_url: url, description: 'Warranty certificate PDF' };
      }

      // ── Claims ────────────────────────────────────────────────
      case 'get_claims': {
        const where: any = { appliance_id: applianceId };
        if (args.status) where.status = args.status;
        const claims = await this.claimRepo.find({ where, order: { filed_at: 'DESC' } });
        if (!claims.length) return { message: 'No claims found.', claims: [] };
        return {
          count: claims.length,
          claims: claims.map((c) => ({
            id: c.id,
            customer_name: c.customer_name,
            customer_email: c.customer_email,
            issue: c.issue,
            status: c.status,
            priority: c.priority,
            filed_at: c.filed_at,
            resolved_at: c.resolved_at,
            resolution_notes: c.resolution_notes,
          })),
        };
      }

      case 'create_claim': {
        const now = new Date();
        const claim = this.claimRepo.create({
          id: uuidv4(),
          appliance_id: applianceId,
          customer_name: args.customer_name ?? customerContext?.customer_name ?? 'Unknown',
          customer_email: args.customer_email ?? customerContext?.customer_email ?? '',
          customer_phone: args.customer_phone,
          issue: args.issue,
          status: 'open',
          priority: args.priority ?? 'medium',
          warranty_id: args.warranty_id ?? null,
          filed_at: now,
        });
        const saved = await this.claimRepo.save(claim);
        await this.cacheService.invalidateClaimCaches(
          saved.id,
          applianceId,
          appliance.business_id,
        );
        await this.activityService.logForAppliance(
          applianceId,
          'claim',
          `Claim filed via chatbot: ${saved.customer_name}`,
          { claim_id: saved.id, source: 'chatbot', priority: saved.priority },
        );
        return {
          success: true,
          claim_id: saved.id,
          status: saved.status,
          priority: saved.priority,
          filed_at: saved.filed_at,
          message: 'Claim successfully filed.',
        };
      }

      case 'get_claim_pdf_url': {
        const url = `${baseUrl}/pdf/claim/${args.claim_id}`;
        if (pdfUrls) pdfUrls[`claim_${args.claim_id}`] = url;
        return { pdf_url: url, description: 'Claim details PDF' };
      }

      // ── Bookings ──────────────────────────────────────────────
      case 'get_bookings': {
        const where: any = { appliance_id: applianceId };
        if (args.status) where.status = args.status;
        const bookings = await this.bookingRepo.find({ where, order: { created_at: 'DESC' } });
        if (!bookings.length) return { message: 'No bookings found.', bookings: [] };
        return {
          count: bookings.length,
          bookings: bookings.map((b) => ({
            id: b.id,
            customer_name: b.customer_name,
            customer_email: b.customer_email,
            service_type: b.service_type,
            preferred_date: b.preferred_date,
            preferred_time: b.preferred_time,
            status: b.status,
            notes: b.notes,
          })),
        };
      }

      case 'create_booking': {
        const booking = this.bookingRepo.create({
          id: uuidv4(),
          appliance_id: applianceId,
          customer_name: args.customer_name ?? customerContext?.customer_name ?? 'Unknown',
          customer_email: args.customer_email ?? customerContext?.customer_email ?? '',
          customer_phone: args.customer_phone,
          service_type: args.service_type,
          preferred_date: new Date(args.preferred_date),
          preferred_time: args.preferred_time,
          status: 'pending',
          notes: args.notes,
          claim_id: args.claim_id ?? null,
        });
        const saved = await this.bookingRepo.save(booking);
        await this.cacheService.invalidateBookingCaches(
          saved.id,
          applianceId,
          appliance.business_id,
        );
        return {
          success: true,
          booking_id: saved.id,
          service_type: saved.service_type,
          preferred_date: saved.preferred_date,
          preferred_time: saved.preferred_time,
          status: saved.status,
          message: 'Service booking successfully created.',
        };
      }

      case 'get_booking_pdf_url': {
        const url = `${baseUrl}/pdf/booking/${args.booking_id}`;
        if (pdfUrls) pdfUrls[`booking_${args.booking_id}`] = url;
        return { pdf_url: url, description: 'Booking confirmation PDF' };
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  }
}
