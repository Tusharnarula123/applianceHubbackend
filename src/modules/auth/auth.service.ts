import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from '../../entities/user.entity.js';
import { BusinessEntity } from '../../entities/business.entity.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(BusinessEntity)
    private businessRepository: Repository<BusinessEntity>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, business_name, business_phone, business_address, name } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create business
    const business = this.businessRepository.create({
      id: uuidv4(),
      name: business_name,
      contact_phone: business_phone,
      metadata: { address: business_address },
    });
    const savedBusiness = await this.businessRepository.save(business);

    // Create user
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

    // Generate tokens
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

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['business'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
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

  async refreshToken(token: string) {
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
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(id: string) {
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

  private generateTokens(user: UserEntity) {
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
}
