var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { join } from 'path';
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
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
        imports: [
            ConfigModule.forRoot({
                isGlobal: true,
                load: [databaseConfig, redisConfig],
            }),
            CacheModule.registerAsync({
                isGlobal: true,
                inject: [ConfigService],
                useFactory: async (configService) => ({
                    store: redisStore,
                    host: configService.get('redis.host'),
                    port: configService.get('redis.port'),
                    ttl: configService.get('redis.ttl'),
                    db: configService.get('redis.db'),
                }),
            }),
            TypeOrmModule.forRootAsync({
                inject: [ConfigService],
                useFactory: (config) => ({
                    type: 'mysql',
                    host: config.get('database.host'),
                    port: config.get('database.port'),
                    username: config.get('database.username'),
                    password: config.get('database.password'),
                    database: config.get('database.database'),
                    entities: [join(__dirname, '**', '*.entity.{ts,js}')],
                    migrations: [join(__dirname, 'database', 'migrations', '*.{ts,js}')],
                    synchronize: false,
                    logging: process.env.NODE_ENV !== 'production',
                }),
            }),
            AuthModule,
            UploadModule,
            PdfModule,
            ApplianceModule,
            BusinessModule,
            ClaimModule,
            BookingModule,
            ChatModule,
            ActivityModule,
        ],
        controllers: [AppController],
        providers: [AppService],
    })
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map