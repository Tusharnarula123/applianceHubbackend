import type { File as MulterFile } from 'multer';
import { UploadService } from './upload.service.js';
export declare class UploadController {
    private uploadService;
    constructor(uploadService: UploadService);
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
}
