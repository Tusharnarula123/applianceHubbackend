import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import type { File as MulterFile } from 'multer';
import { RagService } from '../chat/rag.service.js';
import { CacheService } from '../../common/cache.service.js';
import { ActivityService } from '../activities/activity.service.js';
import { StorageService } from '../../common/storage.service.js';
import {
  DocumentEntity,
  DOCUMENT_FILE_TYPES,
  type DocumentFileType,
} from '../../entities/document.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { getUploadsDir, resolveDocumentFilePath } from '../../common/uploads-path.js';
import { v4 as uuidv4 } from 'uuid';

const DOCUMENT_TYPE_ALIASES: Record<string, DocumentFileType> = {
  document: 'Manual',
  manual: 'Manual',
  warranty: 'Warranty',
  'parts catalog': 'Parts Catalog',
  'parts-catalog': 'Parts Catalog',
  partscatalog: 'Parts Catalog',
  'error codes': 'Error Codes',
  'error-codes': 'Error Codes',
  errorcodes: 'Error Codes',
  'service guide': 'Service Guide',
  'service-guide': 'Service Guide',
  serviceguide: 'Service Guide',
};

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir = getUploadsDir();
  private readonly maxFileSize = 100 * 1024 * 1024; // 100MB
  private readonly allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  constructor(
    @InjectRepository(DocumentEntity)
    private documentRepository: Repository<DocumentEntity>,
    @InjectRepository(ApplianceEntity)
    private applianceRepository: Repository<ApplianceEntity>,
    private ragService: RagService,
    private cacheService: CacheService,
    private activityService: ActivityService,
    private storageService: StorageService,
  ) {}

  resolveDocumentType(documentType?: string): DocumentFileType {
    if (!documentType?.trim()) return 'Manual';
    const normalized = documentType.trim();
    if ((DOCUMENT_FILE_TYPES as readonly string[]).includes(normalized)) {
      return normalized as DocumentFileType;
    }
    const alias = DOCUMENT_TYPE_ALIASES[normalized.toLowerCase()];
    if (alias) return alias;
    throw new BadRequestException(
      `Invalid document_type. Allowed: ${DOCUMENT_FILE_TYPES.join(', ')}`,
    );
  }

  async uploadDocument(file: MulterFile, applianceId: string, documentType?: string) {
    if (!file) throw new BadRequestException('No file provided');
    this.validateFile(file);

    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `${fileId}${ext}`;
    let fileUrl: string;

    if (this.storageService.isEnabled()) {
      // ── R2 path ──────────────────────────────────────────────
      const key = `documents/${filename}`;
      await this.storageService.upload(file.buffer, key, file.mimetype);
      fileUrl = this.storageService.fileUrlFromKey(key);
    } else {
      // ── Local disk fallback (dev) ─────────────────────────────
      await fs.mkdir(this.uploadDir, { recursive: true });
      const filepath = path.join(this.uploadDir, filename);
      await fs.writeFile(filepath, file.buffer);
      if (!(await fs.stat(filepath)).isFile()) {
        throw new BadRequestException('Upload did not persist to disk — try again');
      }
      fileUrl = `/uploads/${filename}`;
    }

    const document = this.documentRepository.create({
      id: fileId,
      appliance_id: applianceId,
      name: file.originalname,
      file_url: fileUrl,
      file_size_bytes: file.size,
      file_type: this.resolveDocumentType(documentType),
      mime_type: file.mimetype,
    });

    const savedDocument = await this.documentRepository.save(document);
    await this.invalidateApplianceDocumentCaches(applianceId);
    await this.activityService.logForAppliance(
      applianceId,
      'upload',
      `Document uploaded: ${savedDocument.name}`,
      { document_id: savedDocument.id, file_type: savedDocument.file_type },
    );

    if (file.mimetype === 'application/pdf') {
      await this.documentRepository.update(savedDocument.id, {
        embedding_status: 'processing',
      });
      this.scheduleEmbeddingForAppliance(savedDocument.id, applianceId);
      return {
        id: savedDocument.id,
        name: savedDocument.name,
        file_url: savedDocument.file_url,
        public_url: this.resolvePublicUrl(savedDocument.file_url),
        file_size_bytes: savedDocument.file_size_bytes,
        embedding_status: 'processing',
        uploaded_at: savedDocument.created_at,
        storage: this.storageService.isEnabled() ? 'r2' : 'local',
        message:
          'PDF uploaded. Embedding for the AI chatbot started automatically — poll GET /api/chat/ai/:applianceId/rag-status until ready_for_chat is true.',
      };
    }

    await this.documentRepository.update(savedDocument.id, {
      embedding_status: 'indexed',
      indexed_at: new Date(),
    });

    return {
      id: savedDocument.id,
      name: savedDocument.name,
      file_url: savedDocument.file_url,
      public_url: this.resolvePublicUrl(savedDocument.file_url),
      file_size_bytes: savedDocument.file_size_bytes,
      embedding_status: 'indexed',
      uploaded_at: savedDocument.created_at,
      storage: this.storageService.isEnabled() ? 'r2' : 'local',
    };
  }

  private scheduleEmbeddingForAppliance(documentId: string, applianceId: string): void {
    void (async () => {
      try {
        this.logger.log(
          `Starting chatbot embedding for document ${documentId} (appliance ${applianceId})`,
        );
        await this.ragService.indexDocument(documentId);
        const extra = await this.ragService.reindexApplianceDocuments(applianceId);
        if (extra.indexed > 0) {
          this.logger.log(
            `Also embedded ${extra.indexed} other PDF(s) for appliance ${applianceId}`,
          );
        }
        const status = await this.ragService.getIndexingStatus(applianceId);
        this.logger.log(
          `Chatbot RAG for ${applianceId}: ${status.chunks_with_embeddings} chunk(s), ready_for_chat=${status.ready_for_chat}`,
        );
      } catch (err) {
        await this.documentRepository.update(documentId, { embedding_status: 'failed' });
        this.logger.error(
          `Chatbot embedding failed for ${documentId}: ${err instanceof Error ? err.message : err}`,
        );
      }
    })();
  }

  async uploadImage(file: MulterFile) {
    if (!file) throw new BadRequestException('No file provided');

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException('Invalid image type. Allowed: JPEG, PNG, WebP');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Image size must be less than 10MB');
    }

    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `${fileId}${ext}`;
    let url: string;

    if (this.storageService.isEnabled()) {
      const key = `images/${filename}`;
      await this.storageService.upload(file.buffer, key, file.mimetype);
      url = this.storageService.getPublicUrl(key);
    } else {
      await fs.mkdir(this.uploadDir, { recursive: true });
      const filepath = path.join(this.uploadDir, filename);
      await fs.writeFile(filepath, file.buffer);
      url = `/uploads/${filename}`;
    }

    return {
      id: fileId,
      filename,
      url,
      size: file.size,
      mimetype: file.mimetype,
      storage: this.storageService.isEnabled() ? 'r2' : 'local',
    };
  }

  async deleteFile(fileId: string, applianceId?: string) {
    const document = await this.documentRepository.findOne({ where: { id: fileId } });
    if (!document) throw new NotFoundException('File not found');

    if (applianceId && document.appliance_id !== applianceId) {
      throw new BadRequestException('Document does not belong to this appliance');
    }

    const appliance = await this.applianceRepository.findOne({
      where: { id: document.appliance_id },
      select: ['id', 'business_id'],
    });

    // Delete from R2 or local disk
    if (this.storageService.isEnabled()) {
      const key = this.storageService.keyFromFileUrl(document.file_url);
      await this.storageService.delete(key);
    } else {
      try {
        const filepath = resolveDocumentFilePath(document.file_url);
        await fs.unlink(filepath);
      } catch (err) {
        this.logger.warn(`Could not delete local file: ${err}`);
      }
    }

    await this.documentRepository.remove(document);
    await this.invalidateApplianceDocumentCaches(document.appliance_id, appliance?.business_id);
    this.logger.log(`Deleted document ${fileId} for appliance ${document.appliance_id}`);

    return {
      message: 'File deleted successfully',
      id: fileId,
      appliance_id: document.appliance_id,
    };
  }

  /** Return the publicly accessible URL for a stored file_url */
  resolvePublicUrl(fileUrl: string): string {
    if (this.storageService.isEnabled()) {
      const key = this.storageService.keyFromFileUrl(fileUrl);
      return this.storageService.getPublicUrl(key);
    }
    // Local dev — served by Express static middleware
    if (fileUrl.startsWith('/')) return fileUrl;
    return `/${fileUrl}`;
  }

  private async invalidateApplianceDocumentCaches(
    applianceId: string,
    businessId?: string,
  ): Promise<void> {
    let bid = businessId;
    if (!bid) {
      const appliance = await this.applianceRepository.findOne({
        where: { id: applianceId },
        select: ['business_id'],
      });
      bid = appliance?.business_id;
    }
    await this.cacheService.invalidateApplianceCaches(applianceId, bid);
  }

  private validateFile(file: MulterFile) {
    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File size exceeds maximum limit of 100MB');
    }
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'File type not allowed. Allowed types: PDF, DOC, DOCX, JPEG, PNG, WebP',
      );
    }
  }
}
