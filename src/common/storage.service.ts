import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3: S3Client | null = null;
  private bucket = '';
  private publicUrl = '';
  private r2Enabled = false;

  constructor(private configService: ConfigService) {
    const accountId = configService.get<string>('R2_ACCOUNT_ID')?.trim();
    const accessKeyId = configService.get<string>('R2_ACCESS_KEY_ID')?.trim();
    const secretAccessKey = configService.get<string>('R2_SECRET_ACCESS_KEY')?.trim();
    this.bucket = configService.get<string>('R2_BUCKET_NAME')?.trim() ?? '';
    this.publicUrl =
      configService.get<string>('R2_PUBLIC_URL')?.trim().replace(/\/$/, '') ?? '';

    if (accountId && accessKeyId && secretAccessKey && this.bucket) {
      this.s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
      this.r2Enabled = true;
      this.logger.log('✅ Cloudflare R2 storage initialized');
    } else {
      this.logger.warn(
        '⚠️  R2 not configured — falling back to local disk. ' +
          'Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME in .env',
      );
    }
  }

  /** True when R2 credentials are configured */
  isEnabled(): boolean {
    return this.r2Enabled;
  }

  /**
   * Upload a buffer to R2.
   * @returns The object key stored in R2 (e.g. "documents/uuid.pdf")
   */
  async upload(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    if (!this.r2Enabled || !this.s3) throw new Error('R2 not configured');
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    this.logger.log(`R2 upload: ${key} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return key;
  }

  /**
   * Download an object from R2 and return it as a Buffer.
   */
  async download(key: string): Promise<Buffer> {
    if (!this.r2Enabled || !this.s3) throw new Error('R2 not configured');
    const response = await this.s3.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * Delete an object from R2. Silently ignores errors (file may already be gone).
   */
  async delete(key: string): Promise<void> {
    if (!this.r2Enabled || !this.s3) return;
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      this.logger.log(`R2 deleted: ${key}`);
    } catch (err) {
      this.logger.warn(`R2 delete failed for ${key}: ${err}`);
    }
  }

  /**
   * Check whether an object exists in R2.
   */
  async exists(key: string): Promise<boolean> {
    if (!this.r2Enabled || !this.s3) return false;
    try {
      await this.s3.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Return the public-facing URL for a stored key.
   * Requires the R2 bucket to have public access enabled,
   * or a custom domain set as R2_PUBLIC_URL.
   */
  getPublicUrl(key: string): string {
    if (this.publicUrl) return `${this.publicUrl}/${key}`;
    // No public URL configured — return as relative path (served locally in dev)
    return `/${key}`;
  }

  /**
   * Convert a DB-stored file_url to an R2 object key.
   *
   * Legacy records store  "/uploads/uuid.pdf"
   * New R2 records store  "documents/uuid.pdf"
   */
  keyFromFileUrl(fileUrl: string): string {
    if (fileUrl.startsWith('/uploads/')) {
      return `documents/${fileUrl.replace('/uploads/', '')}`;
    }
    // Already an R2 key
    return fileUrl;
  }

  /**
   * Build the file_url to persist in the DB from an R2 key.
   * Always stored as the key itself (e.g. "documents/uuid.pdf").
   */
  fileUrlFromKey(key: string): string {
    return key;
  }
}
