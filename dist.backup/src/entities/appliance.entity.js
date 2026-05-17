var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, Index, ForeignKey } from 'typeorm';
import { BusinessEntity } from './business.entity.js';
import { QrCodeEntity } from './qr-code.entity.js';
import { DocumentEntity } from './document.entity.js';
import { WarrantyRegistrationEntity } from './warranty-registration.entity.js';
import { ClaimEntity } from './claim.entity.js';
import { BookingEntity } from './booking.entity.js';
import { ChatSessionEntity } from './chat-session.entity.js';
import { OfferEntity } from './offer.entity.js';
import { ActivityEntity } from './activity.entity.js';
let ApplianceEntity = class ApplianceEntity {
    id;
    business_id;
    name;
    model;
    sku;
    category;
    status;
    color;
    bot_name;
    bot_welcome;
    bot_tone;
    scans_count;
    created_at;
    business;
    qr_codes;
    documents;
    warranties;
    claims;
    bookings;
    chat_sessions;
    offers;
    activities;
};
__decorate([
    PrimaryColumn('varchar', { length: 36 }),
    __metadata("design:type", String)
], ApplianceEntity.prototype, "id", void 0);
__decorate([
    Column('varchar', { length: 36 }),
    ForeignKey(() => BusinessEntity),
    __metadata("design:type", String)
], ApplianceEntity.prototype, "business_id", void 0);
__decorate([
    Column('varchar', { length: 255 }),
    __metadata("design:type", String)
], ApplianceEntity.prototype, "name", void 0);
__decorate([
    Column('varchar', { length: 255, nullable: true }),
    __metadata("design:type", String)
], ApplianceEntity.prototype, "model", void 0);
__decorate([
    Column('varchar', { length: 100 }),
    __metadata("design:type", String)
], ApplianceEntity.prototype, "sku", void 0);
__decorate([
    Column('varchar', { length: 100 }),
    __metadata("design:type", String)
], ApplianceEntity.prototype, "category", void 0);
__decorate([
    Column('enum', { enum: ['active', 'training', 'draft'] }),
    __metadata("design:type", String)
], ApplianceEntity.prototype, "status", void 0);
__decorate([
    Column('varchar', { length: 20, default: '#4F46E5' }),
    __metadata("design:type", String)
], ApplianceEntity.prototype, "color", void 0);
__decorate([
    Column('varchar', { length: 255, nullable: true }),
    __metadata("design:type", String)
], ApplianceEntity.prototype, "bot_name", void 0);
__decorate([
    Column('text', { nullable: true }),
    __metadata("design:type", String)
], ApplianceEntity.prototype, "bot_welcome", void 0);
__decorate([
    Column('varchar', { length: 100, nullable: true, default: 'professional' }),
    __metadata("design:type", String)
], ApplianceEntity.prototype, "bot_tone", void 0);
__decorate([
    Column('int', { unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], ApplianceEntity.prototype, "scans_count", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], ApplianceEntity.prototype, "created_at", void 0);
__decorate([
    ManyToOne(() => BusinessEntity, business => business.appliances, { onDelete: 'CASCADE' }),
    JoinColumn({ name: 'business_id' }),
    __metadata("design:type", BusinessEntity)
], ApplianceEntity.prototype, "business", void 0);
__decorate([
    OneToMany(() => QrCodeEntity, qr => qr.appliance),
    __metadata("design:type", Array)
], ApplianceEntity.prototype, "qr_codes", void 0);
__decorate([
    OneToMany(() => DocumentEntity, doc => doc.appliance),
    __metadata("design:type", Array)
], ApplianceEntity.prototype, "documents", void 0);
__decorate([
    OneToMany(() => WarrantyRegistrationEntity, warranty => warranty.appliance),
    __metadata("design:type", Array)
], ApplianceEntity.prototype, "warranties", void 0);
__decorate([
    OneToMany(() => ClaimEntity, claim => claim.appliance),
    __metadata("design:type", Array)
], ApplianceEntity.prototype, "claims", void 0);
__decorate([
    OneToMany(() => BookingEntity, booking => booking.appliance),
    __metadata("design:type", Array)
], ApplianceEntity.prototype, "bookings", void 0);
__decorate([
    OneToMany(() => ChatSessionEntity, chat => chat.appliance),
    __metadata("design:type", Array)
], ApplianceEntity.prototype, "chat_sessions", void 0);
__decorate([
    OneToMany(() => OfferEntity, offer => offer.appliance),
    __metadata("design:type", Array)
], ApplianceEntity.prototype, "offers", void 0);
__decorate([
    OneToMany(() => ActivityEntity, activity => activity.appliance),
    __metadata("design:type", Array)
], ApplianceEntity.prototype, "activities", void 0);
ApplianceEntity = __decorate([
    Entity('appliances'),
    Index(['business_id']),
    Index(['status'])
], ApplianceEntity);
export { ApplianceEntity };
//# sourceMappingURL=appliance.entity.js.map