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
import { ApplianceEntity } from './appliance.entity.js';
let OfferEntity = class OfferEntity {
    id;
    appliance_id;
    title;
    description;
    discount_amount;
    discount_percentage;
    valid_from;
    valid_until;
    is_active;
    usage_count;
    max_usage_count;
    metadata;
    created_at;
    appliance;
};
__decorate([
    PrimaryColumn('varchar', { length: 36 }),
    __metadata("design:type", String)
], OfferEntity.prototype, "id", void 0);
__decorate([
    Column('varchar', { length: 36 }),
    ForeignKey(() => ApplianceEntity),
    __metadata("design:type", String)
], OfferEntity.prototype, "appliance_id", void 0);
__decorate([
    Column('varchar', { length: 255 }),
    __metadata("design:type", String)
], OfferEntity.prototype, "title", void 0);
__decorate([
    Column('text', { nullable: true }),
    __metadata("design:type", String)
], OfferEntity.prototype, "description", void 0);
__decorate([
    Column('decimal', { precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], OfferEntity.prototype, "discount_amount", void 0);
__decorate([
    Column('decimal', { precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], OfferEntity.prototype, "discount_percentage", void 0);
__decorate([
    Column('date'),
    __metadata("design:type", Date)
], OfferEntity.prototype, "valid_from", void 0);
__decorate([
    Column('date'),
    __metadata("design:type", Date)
], OfferEntity.prototype, "valid_until", void 0);
__decorate([
    Column('tinyint', { default: 1 }),
    __metadata("design:type", Boolean)
], OfferEntity.prototype, "is_active", void 0);
__decorate([
    Column('int', { default: 0 }),
    __metadata("design:type", Number)
], OfferEntity.prototype, "usage_count", void 0);
__decorate([
    Column('int', { nullable: true }),
    __metadata("design:type", Number)
], OfferEntity.prototype, "max_usage_count", void 0);
__decorate([
    Column('json', { nullable: true }),
    __metadata("design:type", Object)
], OfferEntity.prototype, "metadata", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], OfferEntity.prototype, "created_at", void 0);
__decorate([
    ManyToOne(() => ApplianceEntity, { onDelete: 'CASCADE' }),
    JoinColumn({ name: 'appliance_id' }),
    __metadata("design:type", ApplianceEntity)
], OfferEntity.prototype, "appliance", void 0);
OfferEntity = __decorate([
    Entity('offers'),
    Index(['appliance_id'])
], OfferEntity);
export { OfferEntity };
//# sourceMappingURL=offer.entity.js.map