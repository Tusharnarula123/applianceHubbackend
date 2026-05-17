import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from '../../entities/document.entity.js';
import { UploadService } from './upload.service.js';
import { UploadController } from './upload.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity])],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
