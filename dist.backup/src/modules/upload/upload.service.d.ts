import { Repository } from 'typeorm';
import type { File as MulterFile } from 'multer';
import { DocumentEntity } from '../../entities/document.entity.js';
export declare class UploadService {
    private documentRepository;
    private readonly uploadDir;
    private readonly maxFileSize;
    private readonly allowedMimeTypes;
    constructor(documentRepository: Repository<DocumentEntity>);
    uploadDocument(file: MulterFile, applianceId: string): Promise<{
        id: string;
        name: string;
        file_url: string;
        file_size_bytes: number;
        uploaded_at: Date;
    }>;
    uploadImage(file: MulterFile): Promise<{
        id: string;
        filename: string;
        url: string;
        size: any;
        mimetype: any;
    }>;
    deleteFile(fileId: string): Promise<{
        message: string;
    }>;
    private validateFile;
}
