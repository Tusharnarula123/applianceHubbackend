import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { File as MulterFile } from 'multer';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ApplianceService } from './appliance.service.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { UploadService } from '../upload/upload.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';

const MAX_DOCUMENT_BYTES = 100 * 1024 * 1024;

@ApiTags('Appliances')
@Controller('api/appliances')
export class ApplianceController {
  constructor(
    private applianceService: ApplianceService,
    private uploadService: UploadService,
  ) {}

  /**
   * GET /api/appliances/business/:businessId
   * Get all appliances for a business with pagination
   */
  @Get('business/:businessId')
  @ApiOperation({ summary: 'Get all appliances for a business' })
  @ApiParam({ name: 'businessId', description: 'Business ID (UUID)' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'offset', required: false, example: 0 })
  @ApiResponse({ status: 200, description: 'List of appliances with pagination' })
  async getByBusiness(
    @Param('businessId') businessId: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.applianceService.getAppliancesByBusiness(businessId, limit, offset);
  }

  /**
   * GET /api/appliances/:id
   * Get single appliance with all related data
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get single appliance with all relations' })
  @ApiParam({ name: 'id', description: 'Appliance ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Appliance with all relations (documents, claims, bookings, etc.)' })
  async getById(@Param('id') id: string) {
    return this.applianceService.getApplianceById(id);
  }

  /**
   * GET /api/appliances/:id/documents
   * Get appliance with documents only (optimized)
   */
  @Get(':id/documents')
  async getWithDocuments(@Param('id') id: string) {
    return this.applianceService.getApplianceWithDocuments(id);
  }

  /**
   * POST /api/appliances/:id/documents
   * Upload document (PDF) for an appliance — same as POST /api/upload/document/:id
   */
  @Post(':id/documents')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_DOCUMENT_BYTES },
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload document for an appliance' })
  @ApiParam({ name: 'id', description: 'Appliance ID (UUID)' })
  @ApiQuery({ name: 'document_type', required: false, example: 'Manual' })
  async uploadDocument(
    @Param('id') id: string,
    @UploadedFile() file: MulterFile,
    @Query('document_type') documentType?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.uploadService.uploadDocument(file, id, documentType);
  }

  /**
   * DELETE /api/appliances/:id/documents/:documentId
   */
  @Delete(':id/documents/:documentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete appliance document' })
  async deleteDocument(
    @Param('id') applianceId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.uploadService.deleteFile(documentId, applianceId);
  }

  /**
   * GET /api/appliances/:id/claims
   * Get appliance with claims only (optimized)
   */
  @Get(':id/claims')
  async getWithClaims(@Param('id') id: string) {
    return this.applianceService.getApplianceWithClaims(id);
  }

  /**
   * GET /api/appliances/:id/bookings
   * Get appliance with bookings only (optimized)
   */
  @Get(':id/bookings')
  async getWithBookings(@Param('id') id: string) {
    return this.applianceService.getApplianceWithBookings(id);
  }

  /**
   * GET /api/appliances/:id/stats
   * Get appliance statistics (dashboard)
   */
  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.applianceService.getApplianceStats(id);
  }

  /**
   * POST /api/appliances
   * Create new appliance
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() data: { business_id: string; name: string; model?: string; brand?: string; status?: string },
  ) {
    return this.applianceService.create(data.business_id, data);
  }

  /**
   * PUT /api/appliances/:id
   * Update appliance
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: { business_id: string } & Partial<ApplianceEntity>,
  ) {
    return this.applianceService.update(id, data.business_id, data);
  }

  /**
   * DELETE /api/appliances/:id
   * Delete appliance
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete appliance' })
  @ApiParam({ name: 'id', description: 'Appliance ID (UUID)' })
  @ApiQuery({ name: 'businessId', required: false, description: 'Business ID (optional - will be fetched if not provided)' })
  @ApiResponse({ status: 200, description: 'Appliance deleted successfully' })
  async delete(@Param('id') id: string, @Query('businessId') businessId?: string) {
    return this.applianceService.delete(id, businessId);
  }
}
