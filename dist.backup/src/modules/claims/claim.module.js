var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClaimEntity } from '../../entities/claim.entity.js';
import { ClaimController } from './claim.controller.js';
import { ClaimService } from './claim.service.js';
import { CacheService } from '../../common/cache.service.js';
let ClaimModule = class ClaimModule {
};
ClaimModule = __decorate([
    Module({
        imports: [TypeOrmModule.forFeature([ClaimEntity])],
        controllers: [ClaimController],
        providers: [ClaimService, CacheService],
        exports: [ClaimService],
    })
], ClaimModule);
export { ClaimModule };
//# sourceMappingURL=claim.module.js.map