var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { ApplianceController } from './appliance.controller.js';
import { DashboardController } from './dashboard.controller.js';
import { ApplianceService } from './appliance.service.js';
import { CacheService } from '../../common/cache.service.js';
let ApplianceModule = class ApplianceModule {
};
ApplianceModule = __decorate([
    Module({
        imports: [TypeOrmModule.forFeature([ApplianceEntity])],
        controllers: [ApplianceController, DashboardController],
        providers: [ApplianceService, CacheService],
        exports: [ApplianceService],
    })
], ApplianceModule);
export { ApplianceModule };
//# sourceMappingURL=appliance.module.js.map