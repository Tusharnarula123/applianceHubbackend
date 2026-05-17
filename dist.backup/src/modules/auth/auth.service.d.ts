import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity.js';
import { BusinessEntity } from '../../entities/business.entity.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
export declare class AuthService {
    private userRepository;
    private businessRepository;
    private jwtService;
    constructor(userRepository: Repository<UserEntity>, businessRepository: Repository<BusinessEntity>, jwtService: JwtService);
    register(registerDto: RegisterDto): Promise<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
        user: {
            id: string;
            email: string;
            name: string;
            business_id: string;
        };
    }>;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
        user: {
            id: string;
            email: string;
            name: string;
            business_id: string;
            business: any;
        };
    }>;
    refreshToken(token: string): Promise<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
    }>;
    validateUser(id: string): Promise<{
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
    private generateTokens;
}
