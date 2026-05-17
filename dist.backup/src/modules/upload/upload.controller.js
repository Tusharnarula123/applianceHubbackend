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
import { Controller, Post, Delete, Param, UseInterceptors, UploadedFile, BadRequestException, UseGuards, HttpCode, HttpStatus, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { UploadService } from './upload.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';
let UploadController = class UploadController {
    uploadService;
    constructor(uploadService) {
        this.uploadService = uploadService;
    }
    async uploadDocument(file, applianceId) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }
        return this.uploadService.uploadDocument(file, applianceId);
    }
    async uploadImage(file) {
        if (!file) {
            throw new BadRequestException('No file provided');
        }
        return this.uploadService.uploadImage(file);
    }
    async deleteFile(fileId) {
        return this.uploadService.deleteFile(fileId);
    }
};
__decorate([
    Post('document/:applianceId'),
    UseGuards(JwtAuthGuard),
    UseInterceptors(FileInterceptor('file')),
    ApiBearerAuth(),
    ApiConsumes('multipart/form-data'),
    HttpCode(HttpStatus.CREATED),
    ApiOperation({ summary: 'Upload document for an appliance' }),
    __param(0, UploadedFile()),
    __param(1, Param('applianceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadDocument", null);
__decorate([
    Post('image'),
    UseGuards(JwtAuthGuard),
    UseInterceptors(FileInterceptor('file')),
    ApiBearerAuth(),
    ApiConsumes('multipart/form-data'),
    HttpCode(HttpStatus.CREATED),
    ApiOperation({ summary: 'Upload image' }),
    __param(0, UploadedFile()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "uploadImage", null);
__decorate([
    Delete(':fileId'),
    UseGuards(JwtAuthGuard),
    ApiBearerAuth(),
    HttpCode(HttpStatus.OK),
    ApiOperation({ summary: 'Delete uploaded file' }),
    __param(0, Param('fileId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UploadController.prototype, "deleteFile", null);
UploadController = __decorate([
    ApiTags('Upload'),
    Controller('upload'),
    __metadata("design:paramtypes", [UploadService])
], UploadController);
export { UploadController };
//# sourceMappingURL=upload.controller.js.map