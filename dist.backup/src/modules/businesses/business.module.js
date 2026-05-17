var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessEntity } from '../../entities/business.entity.js';
import { BusinessController } from './business.controller.js';
import { BusinessService } from './business.service.js';
import { CacheService } from '../../common/cache.service.js';
let BusinessModule = class BusinessModule {
};
BusinessModule = __decorate([
    Module({
        imports: [TypeOrmModule.forFeature([BusinessEntity])],
        controllers: [BusinessController],
        providers: [BusinessService, CacheService],
        exports: [BusinessService],
    })
], BusinessModule);
export { BusinessModule };
//# sourceMappingURL=business.module.js.map