import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';

import { DocumentEntity } from '../entities/document.entity.js';
import { DocumentBlobEntity } from '../entities/document-blob.entity.js';
import { StorageService } from './storage.service.js';
import { getUploadsDir, resolveDocumentFilePath } from './uploads-path.js';

/**
 * One place to read uploaded documents, wherever they live:
 *   1. R2 (production, when configured)
 *   2. local disk (fast path)
 *   3. database copy — restored to disk on demand when the disk was wiped
 * Every AI feature (embedding, OCR knowledge build, guides) reads through
 * this, so a restart on an ephemeral host no longer breaks them.
 */
@Injectable()
export class DocumentFilesService implements OnModuleInit {
  private readonly logger = new Logger(DocumentFilesService.name);

  constructor(
    @InjectRepository(DocumentEntity) private documentRepo: Repository<DocumentEntity>,
    @InjectRepository(DocumentBlobEntity) private blobRepo: Repository<DocumentBlobEntity>,
    private storage: StorageService,
  ) {}

  /** Storage mode, for health reporting. */
  mode(): 'r2' | 'local_with_db_backup' {
    return this.storage.isEnabled() ? 'r2' : 'local_with_db_backup';
  }

  /** After a restart, put database copies back on disk so static links and the AI pipeline work again. */
  async onModuleInit() {
    if (this.storage.isEnabled()) return;
    if (process.env.NODE_ENV === 'production') {
      this.logger.warn('R2 is not configured: uploads are kept on local disk with a database backup. Configure R2 for production.');
    }
    setTimeout(() => void this.restoreMissing(), 2000);
  }

  async restoreMissing(limit = 500) {
    try {
      const blobs = await this.blobRepo.find({ select: ['document_id'], take: limit });
      if (!blobs.length) return;
      const docs = await this.documentRepo.find({ where: { id: In(blobs.map((b) => b.document_id)) } });
      let restored = 0;
      for (const d of docs) {
        if (fs.existsSync(resolveDocumentFilePath(d.file_url))) continue;
        if (await this.restoreToDisk(d)) restored++;
      }
      if (restored) this.logger.log(`Restored ${restored} uploaded file(s) from the database backup`);
    } catch (err) {
      this.logger.warn(`Restore from database backup skipped: ${err}`);
    }
  }

  private async restoreToDisk(doc: DocumentEntity): Promise<Buffer | null> {
    const blob = await this.blobRepo.findOne({ where: { document_id: doc.id } });
    if (!blob) return null;
    const buffer = Buffer.from(blob.data_base64, 'base64');
    try {
      await fsp.mkdir(getUploadsDir(), { recursive: true });
      await fsp.writeFile(resolveDocumentFilePath(doc.file_url), buffer);
    } catch (err) {
      this.logger.warn(`Could not write restored file for ${doc.id}: ${err}`);
    }
    return buffer;
  }

  /** Keep a database copy when there is no durable object storage. */
  async backup(documentId: string, buffer: Buffer, mimeType: string) {
    if (this.storage.isEnabled()) return;
    await this.blobRepo.save(this.blobRepo.create({
      document_id: documentId,
      data_base64: buffer.toString('base64'),
      mime_type: mimeType,
      size_bytes: buffer.length,
    }));
  }

  async removeBackup(documentId: string) {
    await this.blobRepo.delete({ document_id: documentId });
  }

  private async docByUrl(fileUrl: string) {
    return this.documentRepo.findOne({ where: { file_url: fileUrl } });
  }

  /** Is the file readable from any source? */
  async existsByUrl(fileUrl: string): Promise<boolean> {
    if (this.storage.isEnabled()) {
      return this.storage.exists(this.storage.keyFromFileUrl(fileUrl));
    }
    if (fs.existsSync(resolveDocumentFilePath(fileUrl))) return true;
    const doc = await this.docByUrl(fileUrl);
    return doc ? (await this.blobRepo.count({ where: { document_id: doc.id } })) > 0 : false;
  }

  /** Read the file bytes, restoring a wiped local file from the database copy. Throws when truly gone. */
  async readByUrl(fileUrl: string): Promise<Buffer> {
    if (this.storage.isEnabled()) {
      return this.storage.download(this.storage.keyFromFileUrl(fileUrl));
    }
    const filePath = resolveDocumentFilePath(fileUrl);
    if (fs.existsSync(filePath)) return fsp.readFile(filePath);
    const doc = await this.docByUrl(fileUrl);
    const restored = doc ? await this.restoreToDisk(doc) : null;
    if (restored) {
      this.logger.log(`Restored ${path.basename(filePath)} from the database backup`);
      return restored;
    }
    throw new Error('The file was removed from the server and no backup exists — please upload it again');
  }
}
