var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs/promises';
import { DocumentEntity } from '../../entities/document.entity.js';
import { v4 as uuidv4 } from 'uuid';
let UploadService = class UploadService {
    documentRepository;
    uploadDir = './uploads';
    maxFileSize = 50 * 1024 * 1024;
    allowedMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    constructor(documentRepository) {
        this.documentRepository = documentRepository;
    }
    async uploadDocument(file, applianceId) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }
        this.validateFile(file);
        try {
            await fs.mkdir(this.uploadDir, { recursive: true });
        }
        catch (error) {
            console.error('Error creating upload directory:', error);
        }
        const fileId = uuidv4();
        const ext = path.extname(file.originalname);
        const filename = `${fileId}${ext}`;
        const filepath = path.join(this.uploadDir, filename);
        try {
            await fs.writeFile(filepath, file.buffer);
        }
        catch (error) {
            throw new BadRequestException('Failed to save file');
        }
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
    async uploadImage(file) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            throw new BadRequestException('Invalid image type. Allowed: JPEG, PNG, WebP');
        }
        if (file.size > 10 * 1024 * 1024) {
            throw new BadRequestException('Image size must be less than 10MB');
        }
        try {
            await fs.mkdir(this.uploadDir, { recursive: true });
        }
        catch (error) {
            console.error('Error creating upload directory:', error);
        }
        const fileId = uuidv4();
        const ext = path.extname(file.originalname);
        const filename = `${fileId}${ext}`;
        const filepath = path.join(this.uploadDir, filename);
        try {
            await fs.writeFile(filepath, file.buffer);
        }
        catch (error) {
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
    async deleteFile(fileId) {
        const document = await this.documentRepository.findOne({
            where: { id: fileId },
        });
        if (!document) {
            throw new BadRequestException('File not found');
        }
        try {
            const filename = path.basename(document.file_url);
            const filepath = path.join(this.uploadDir, filename);
            await fs.unlink(filepath);
        }
        catch (error) {
            console.error('Error deleting file:', error);
        }
        await this.documentRepository.remove(document);
        return { message: 'File deleted successfully' };
    }
    validateFile(file) {
        if (file.size > this.maxFileSize) {
            throw new BadRequestException('File size exceeds maximum limit of 50MB');
        }
        if (!this.allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException('File type not allowed. Allowed types: PDF, DOC, DOCX, JPEG, PNG, WebP');
        }
    }
};
UploadService = __decorate([
    Injectable(),
    __param(0, InjectRepository(DocumentEntity)),
    __metadata("design:paramtypes", [Repository])
], UploadService);
export { UploadService };
//# sourceMappingURL=upload.service.js.map