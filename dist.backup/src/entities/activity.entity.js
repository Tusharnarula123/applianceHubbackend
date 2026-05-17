var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn, Index, ForeignKey } from 'typeorm';
import { BusinessEntity } from './business.entity.js';
import { ApplianceEntity } from './appliance.entity.js';
let ActivityEntity = class ActivityEntity {
    id;
    business_id;
    appliance_id;
    type;
    text;
    metadata;
    created_at;
    business;
    appliance;
};
__decorate([
    PrimaryColumn('varchar', { length: 36 }),
    __metadata("design:type", String)
], ActivityEntity.prototype, "id", void 0);
__decorate([
    Column('varchar', { length: 36 }),
    ForeignKey(() => BusinessEntity),
    __metadata("design:type", String)
], ActivityEntity.prototype, "business_id", void 0);
__decorate([
    Column('varchar', { length: 36, nullable: true }),
    ForeignKey(() => ApplianceEntity),
    __metadata("design:type", String)
], ActivityEntity.prototype, "appliance_id", void 0);
__decorate([
    Column('enum', { enum: ['claim', 'scan', 'resolve', 'upload'] }),
    __metadata("design:type", String)
], ActivityEntity.prototype, "type", void 0);
__decorate([
    Column('varchar', { length: 500 }),
    __metadata("design:type", String)
], ActivityEntity.prototype, "text", void 0);
__decorate([
    Column('json', { nullable: true }),
    __metadata("design:type", Object)
], ActivityEntity.prototype, "metadata", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], ActivityEntity.prototype, "created_at", void 0);
__decorate([
    ManyToOne(() => BusinessEntity, business => business.activities, { onDelete: 'CASCADE' }),
    JoinColumn({ name: 'business_id' }),
    __metadata("design:type", BusinessEntity)
], ActivityEntity.prototype, "business", void 0);
__decorate([
    ManyToOne(() => ApplianceEntity, appliance => appliance.activities, { onDelete: 'SET NULL' }),
    JoinColumn({ name: 'appliance_id' }),
    __metadata("design:type", ApplianceEntity)
], ActivityEntity.prototype, "appliance", void 0);
ActivityEntity = __decorate([
    Entity('activity'),
    Index(['business_id']),
    Index(['appliance_id']),
    Index(['created_at'])
], ActivityEntity);
export { ActivityEntity };
//# sourceMappingURL=activity.entity.js.map