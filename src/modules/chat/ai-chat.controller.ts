import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { AiChatService } from './ai-chat.service.js';
import { RagService } from './rag.service.js';
import {
  StartAiSessionDto,
  SendAiMessageDto,
} from './dto/ai-chat.dto.js';

@ApiTags('AI Chat')
@Controller('api/chat/ai')
export class AiChatController {
  constructor(
    private readonly aiChatService: AiChatService,
    private readonly ragService: RagService,
  ) {}

  /**
   * GET /api/chat/ai/:applianceId/rag-status
   *
   * Returns how many documents have been indexed (embedded) for an appliance.
   * Used by the frontend to show "AI is learning" progress.
   */
  @Get(':applianceId/rag-status')
  @ApiOperation({ summary: 'Get RAG indexing status for an appliance' })
  @ApiParam({ name: 'applianceId', description: 'Appliance UUID' })
  async getRagStatus(@Param('applianceId') applianceId: string) {
    return this.ragService.getIndexingStatus(applianceId);
  }

  /**
   * GET /api/chat/ai/:applianceId/knowledge-media
   * PDFs in RAG + uploaded images with public_url for chatbot gallery.
   */
  @Get(':applianceId/knowledge-media')
  @ApiOperation({ summary: 'List RAG PDFs and images for chatbot display' })
  @ApiParam({ name: 'applianceId', description: 'Appliance UUID' })
  async getKnowledgeMedia(@Param('applianceId') applianceId: string) {
    return this.ragService.getChatKnowledgeMedia(applianceId);
  }

  /**
   * POST /api/chat/ai/:applianceId/retrieve-context
   * Returns RAG excerpts for a query (used by public chatbot / QR page).
   */
  @Post(':applianceId/retrieve-context')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retrieve RAG context for a user message' })
  @ApiParam({ name: 'applianceId', description: 'Appliance UUID' })
  async retrieveContext(
    @Param('applianceId') applianceId: string,
    @Body() body: { query?: string },
  ) {
    const query = body?.query?.trim() ?? '';
    if (!query) {
      throw new BadRequestException('query is required');
    }
    const meta = await this.ragService.retrieveContextWithMeta(query, applianceId);
    return {
      context: meta.context,
      has_context: meta.context.length > 0,
      chunks_matched: meta.chunkCount,
      top_similarity_score: meta.topScore,
      sources: meta.sources,
      excerpts: meta.excerpts,
    };
  }

  /**
   * POST /api/chat/ai/:applianceId/reindex
   * Process pending/failed PDFs for RAG (chunk + embed).
   */
  @Post(':applianceId/reindex')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Index pending PDF documents for RAG' })
  @ApiParam({ name: 'applianceId', description: 'Appliance UUID' })
  async reindexDocuments(@Param('applianceId') applianceId: string) {
    return this.ragService.reindexApplianceDocuments(applianceId);
  }

  /**
   * GET /api/chat/ai/:applianceId/config
   *
   * Returns the chatbot's UI configuration for a given appliance:
   * color, bot_name, bot_welcome, bot_tone — everything the frontend
   * needs to theme and initialise the chat widget.
   */
  @Get(':applianceId/config')
  @ApiOperation({ summary: 'Get chatbot UI config (color, name, welcome, tone) for an appliance' })
  @ApiParam({ name: 'applianceId', description: 'Appliance UUID' })
  async getChatbotConfig(@Param('applianceId') applianceId: string) {
    return this.aiChatService.getChatbotConfig(applianceId);
  }

  /**
   * POST /api/chat/ai/:applianceId/scan
   *
   * Called by the public chatbot page on load (QR scan landing).
   * Records the scan against the appliance's QR code and returns
   * the full chatbot config (color, bot_name, etc.) in a single round-trip.
   */
  @Post(':applianceId/scan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a QR scan and return chatbot config for the public chat page' })
  @ApiParam({ name: 'applianceId', description: 'Appliance UUID' })
  async recordScan(@Param('applianceId') applianceId: string) {
    return this.aiChatService.recordScanAndGetConfig(applianceId);
  }

  /**
   * POST /api/chat/ai/session
   *
   * Start a new AI-powered chat session for an appliance.
   * Returns the session ID, initial welcome message, and UI config.
   */
  @Post('session')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new AI chat session for an appliance' })
  @ApiBody({ type: StartAiSessionDto })
  async startSession(@Body() body: StartAiSessionDto) {
    if (!body.appliance_id) {
      throw new BadRequestException('appliance_id is required');
    }

    return this.aiChatService.createAiSession(body.appliance_id, {
      customer_name: body.customer_name,
      customer_email: body.customer_email,
    });
  }

  /**
   * POST /api/chat/ai/session/:sessionId/message
   *
   * Send a user message. The AI will:
   * 1. Decide which tools to call (warranties, claims, bookings, PDFs…)
   * 2. Execute the tools against the real database
   * 3. Return a fully-resolved natural-language reply
   *
   * Response includes:
   * - content        — the assistant's final reply text
   * - tool_calls_made — which tools were invoked (for debug/logging)
   * - pdf_urls       — any PDF download URLs produced during the turn
   */
  @Post('session/:sessionId/message')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a message and receive an AI response with tool-call resolution' })
  @ApiParam({ name: 'sessionId', description: 'Chat session UUID' })
  @ApiBody({ type: SendAiMessageDto })
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() body: SendAiMessageDto,
  ) {
    if (!body.message?.trim()) {
      throw new BadRequestException('message must not be empty');
    }

    return this.aiChatService.sendMessage(sessionId, body.message, {
      customer_name: body.customer_name,
      customer_email: body.customer_email,
    });
  }
}
