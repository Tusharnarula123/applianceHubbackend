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
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../../entities/user.entity.js';
import { BusinessEntity } from '../../entities/business.entity.js';
let AuthService = class AuthService {
    userRepository;
    businessRepository;
    jwtService;
    constructor(userRepository, businessRepository, jwtService) {
        this.userRepository = userRepository;
        this.businessRepository = businessRepository;
        this.jwtService = jwtService;
    }
    async register(registerDto) {
        const { email, password, business_name, business_phone, business_address, name } = registerDto;
        const { v4: uuidv4 } = require('uuid');
        const existingUser = await this.userRepository.findOne({
            where: { email },
        });
        if (existingUser) {
            throw new BadRequestException('User with this email already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const business = this.businessRepository.create({
            id: uuidv4(),
            name: business_name,
            contact_phone: business_phone,
            metadata: { address: business_address },
        });
        const savedBusiness = await this.businessRepository.save(business);
        const user = this.userRepository.create({
            id: uuidv4(),
            email,
            name,
            password_hash: hashedPassword,
            business_id: savedBusiness.id,
            role: 'owner',
            is_active: true,
        });
        const savedUser = await this.userRepository.save(user);
        const tokens = this.generateTokens(savedUser);
        return {
            user: {
                id: savedUser.id,
                email: savedUser.email,
                name: savedUser.name,
                business_id: savedUser.business_id,
            },
            ...tokens,
        };
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        const user = await this.userRepository.findOne({
            where: { email },
            relations: ['business'],
        });
        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid email or password');
        }
        const tokens = this.generateTokens(user);
        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                business_id: user.business_id,
                business: user.business,
            },
            ...tokens,
        };
    }
    async refreshToken(token) {
        try {
            const decoded = this.jwtService.verify(token, {
                secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
            });
            const user = await this.userRepository.findOne({
                where: { id: decoded.sub },
                relations: ['business'],
            });
            if (!user) {
                throw new UnauthorizedException('User not found');
            }
            const tokens = this.generateTokens(user);
            return tokens;
        }
        catch (error) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }
    async validateUser(id) {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['business'],
        });
        if (!user) {
            return null;
        }
        const { password_hash, ...result } = user;
        return result;
    }
    generateTokens(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            business_id: user.business_id,
        };
        const access_token = this.jwtService.sign(payload, {
            secret: process.env.JWT_SECRET || 'secret-key',
            expiresIn: '1h',
        });
        const refresh_token = this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
            expiresIn: '7d',
        });
        return {
            access_token,
            refresh_token,
            expires_in: 3600,
        };
    }
};
AuthService = __decorate([
    Injectable(),
    __param(0, InjectRepository(UserEntity)),
    __param(1, InjectRepository(BusinessEntity)),
    __metadata("design:paramtypes", [Repository,
        Repository,
        JwtService])
], AuthService);
export { AuthService };
//# sourceMappingURL=auth.service.js.map