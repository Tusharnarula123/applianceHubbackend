import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs/promises';
import type { File as MulterFile } from 'multer';
import { DocumentEntity } from '../../entities/document.entity.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly uploadDir = './uploads';
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
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
  ) {}

  async uploadDocument(file: MulterFile, applianceId: string) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file
    this.validateFile(file);

    // Create uploads directory if it doesn't exist
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }

    // Generate unique filename
    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `${fileId}${ext}`;
    const filepath = path.join(this.uploadDir, filename);

    // Save file to disk
    try {
      await fs.writeFile(filepath, file.buffer);
    } catch (error) {
      throw new BadRequestException('Failed to save file');
    }

    // Create document record
    const document = this.documentRepository.create({
      id: fileId,
      appliance_id: applianceId,
      name: file.originalname,
      file_url: `/uploads/${filename}`,
      file_size_bytes: file.size,
      file_type: path.extname(file.originalname).substring(1),
      mime_type: file.mimetype,
    });

    const savedDocument = await this.documentRepository.save(document);

    return {
      id: savedDocument.id,
      name: savedDocument.name,
      file_url: savedDocument.file_url,
      file_size_bytes: savedDocument.file_size_bytes,
      uploaded_at: savedDocument.created_at,
    };
  }

  async uploadImage(file: MulterFile) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate image
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException('Invalid image type. Allowed: JPEG, PNG, WebP');
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB for images
      throw new BadRequestException('Image size must be less than 10MB');
    }

    // Create uploads directory
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }

    // Generate unique filename
    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `${fileId}${ext}`;
    const filepath = path.join(this.uploadDir, filename);

    // Save file
    try {
      await fs.writeFile(filepath, file.buffer);
    } catch (error) {
      throw new BadRequestException('Failed to save image');
    }

    return {
      id: fileId,
      filename: filename,
      url: `/uploads/${filename}`,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  async deleteFile(fileId: string) {
    const document = await this.documentRepository.findOne({
      where: { id: fileId },
    });

    if (!document) {
      throw new BadRequestException('File not found');
    }

    // Delete physical file
    try {
      const filename = path.basename(document.file_url);
      const filepath = path.join(this.uploadDir, filename);
      await fs.unlink(filepath);
    } catch (error) {
      console.error('Error deleting file:', error);
      // Continue anyway, delete from DB
    }

    // Delete document record
    await this.documentRepository.remove(document);

    return { message: 'File deleted successfully' };
  }

  private validateFile(file: MulterFile) {
    if (file.size > this.maxFileSize) {
      throw new BadRequestException('File size exceeds maximum limit of 50MB');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'File type not allowed. Allowed types: PDF, DOC, DOCX, JPEG, PNG, WebP',
      );
    }
  }
}
