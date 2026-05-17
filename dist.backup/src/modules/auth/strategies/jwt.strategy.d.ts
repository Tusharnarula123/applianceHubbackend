import { AuthService } from '../auth.service.js';
declare const JwtStrategy_base: new (...args: any) => any;
export declare class JwtStrategy extends JwtStrategy_base {
    private authService;
    constructor(authService: AuthService);
    validate(payload: any): Promise<{
        id: string;
        business_id: string;
        name: string;
        email: string;
        phone: string;
        role: string;
        avatar_url: string;
        is_active: boolean;
        last_login: Date;
        metadata: Record<string, any>;
        created_at: Date;
        business: any;
    } | null>;
}
export {};
