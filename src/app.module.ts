import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import databaseConfig from './config/database.config.js';
import redisConfig from './config/redis.config.js';
import { ApplianceModule } from './modules/appliances/appliance.module.js';
import { BusinessModule } from './modules/businesses/business.module.js';
import { ClaimModule } from './modules/claims/claim.module.js';
import { BookingModule } from './modules/bookings/booking.module.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { ActivityModule } from './modules/activities/activity.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UploadModule } from './modules/upload/upload.module.js';
import { PdfModule } from './modules/pdf/pdf.module.js';
import { SupportModule } from './modules/support/support.module.js';
import { UsersModule } from './modules/users/users.module.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig],
    }),
    // Redis Cache Manager
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore as any,
        host: configService.get('redis.host'),
        port: configService.get('redis.port'),
        ttl: configService.get('redis.ttl'),
        db: configService.get('redis.db'),
      }),
    }),
    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get('database.host'),
        port: config.get<number>('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.database'),
        entities: [join(__dirname, '**', '*.entity.{ts,js}')],
        migrations: [join(__dirname, 'database', 'migrations', '*.{ts,js}')],
        synchronize: process.env.NODE_ENV === 'development',
        logging: process.env.NODE_ENV !== 'production',
      }),
    }),
    // Feature Modules
    AuthModule,
    UploadModule,
    PdfModule,
    ApplianceModule,
    BusinessModule,
    ClaimModule,
    BookingModule,
    ChatModule,
    ActivityModule,
    SupportModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
