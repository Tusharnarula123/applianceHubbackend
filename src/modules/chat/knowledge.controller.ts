import { Controller, Get, Post, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';
import { KnowledgeService } from './knowledge.service.js';

@ApiTags('AI Knowledge')
@Controller()
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  /**
   * GET /api/appliances/:applianceId/knowledge
   * Pipeline status and every generated item with its verification result (business dashboard).
   */
  @Get('api/appliances/:applianceId/knowledge')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI knowledge built from the appliance PDFs, with OCR cross-verification' })
  @ApiParam({ name: 'applianceId', description: 'Appliance ID (UUID)' })
  async getKnowledge(@Param('applianceId') applianceId: string) {
    return this.knowledgeService.getForAppliance(applianceId);
  }

  /**
   * POST /api/appliances/:applianceId/knowledge/:documentId/rebuild
   * Re-run scan → OCR → generate → verify for one PDF.
   */
  @Post('api/appliances/:applianceId/knowledge/:documentId/rebuild')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Rebuild AI knowledge for one PDF' })
  async rebuild(@Param('applianceId') applianceId: string, @Param('documentId') documentId: string) {
    return this.knowledgeService.rebuild(applianceId, documentId);
  }

  /**
   * GET /api/chat/ai/:applianceId/guides
   * Public: verified instructions, troubleshooting and error codes for the customer chat page.
   */
  @Get('api/chat/ai/:applianceId/guides')
  @ApiOperation({ summary: 'Verified guides for customers (only items that passed OCR cross-verification)' })
  async getGuides(@Param('applianceId') applianceId: string) {
    return this.knowledgeService.getVerifiedGuides(applianceId);
  }
}
