export declare class UserEntity {
    id: string;
    business_id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    avatar_url: string;
    is_active: boolean;
    password_hash: string;
    last_login: Date;
    metadata: Record<string, any>;
    created_at: Date;
    business: any;
}
