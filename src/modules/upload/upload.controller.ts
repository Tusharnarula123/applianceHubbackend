import {
  Controller,
  Post,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { File as MulterFile } from 'multer';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { UploadService } from './upload.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';

const MAX_DOCUMENT_BYTES = 100 * 1024 * 1024; // 100MB
const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20MB

@ApiTags('Upload')
@Controller(['api/upload', 'upload'])
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('document/:applianceId')
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
  async uploadDocument(
    @UploadedFile() file: MulterFile,
    @Param('applianceId') applianceId: string,
    @Query('document_type') documentType?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.uploadService.uploadDocument(file, applianceId, documentType);
  }

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_BYTES },
    }),
  )
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload image' })
  async uploadImage(@UploadedFile() file: MulterFile) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.uploadService.uploadImage(file);
  }

  @Delete(':fileId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete uploaded file' })
  async deleteFile(
    @Param('fileId') fileId: string,
    @Query('applianceId') applianceId?: string,
  ) {
    return this.uploadService.deleteFile(fileId, applianceId);
  }
}
