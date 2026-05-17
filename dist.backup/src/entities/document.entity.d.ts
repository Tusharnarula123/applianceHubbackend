import { ApplianceEntity } from './appliance.entity.js';
export declare class DocumentEntity {
    id: string;
    appliance_id: string;
    name: string;
    file_url: string;
    file_size_bytes: number;
    file_type: string;
    mime_type: string;
    indexed_at: Date;
    created_at: Date;
    appliance: ApplianceEntity;
}
