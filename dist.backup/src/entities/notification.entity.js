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
import { ClaimEntity } from './claim.entity.js';
import { BookingEntity } from './booking.entity.js';
let NotificationEntity = class NotificationEntity {
    id;
    business_id;
    claim_id;
    booking_id;
    channel;
    recipient;
    message;
    status;
    sent_at;
    created_at;
    business;
    claim;
    booking;
};
__decorate([
    PrimaryColumn('varchar', { length: 36 }),
    __metadata("design:type", String)
], NotificationEntity.prototype, "id", void 0);
__decorate([
    Column('varchar', { length: 36 }),
    ForeignKey(() => BusinessEntity),
    __metadata("design:type", String)
], NotificationEntity.prototype, "business_id", void 0);
__decorate([
    Column('varchar', { length: 36, nullable: true }),
    ForeignKey(() => ClaimEntity),
    __metadata("design:type", String)
], NotificationEntity.prototype, "claim_id", void 0);
__decorate([
    Column('varchar', { length: 36, nullable: true }),
    ForeignKey(() => BookingEntity),
    __metadata("design:type", String)
], NotificationEntity.prototype, "booking_id", void 0);
__decorate([
    Column('enum', { enum: ['email', 'sms', 'in_app'] }),
    __metadata("design:type", String)
], NotificationEntity.prototype, "channel", void 0);
__decorate([
    Column('varchar', { length: 255 }),
    __metadata("design:type", String)
], NotificationEntity.prototype, "recipient", void 0);
__decorate([
    Column('text'),
    __metadata("design:type", String)
], NotificationEntity.prototype, "message", void 0);
__decorate([
    Column('enum', { enum: ['pending', 'sent', 'failed'] }),
    __metadata("design:type", String)
], NotificationEntity.prototype, "status", void 0);
__decorate([
    Column('timestamp', { nullable: true }),
    __metadata("design:type", Date)
], NotificationEntity.prototype, "sent_at", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], NotificationEntity.prototype, "created_at", void 0);
__decorate([
    ManyToOne(() => BusinessEntity, { onDelete: 'CASCADE' }),
    JoinColumn({ name: 'business_id' }),
    __metadata("design:type", BusinessEntity)
], NotificationEntity.prototype, "business", void 0);
__decorate([
    ManyToOne(() => ClaimEntity, { onDelete: 'SET NULL' }),
    JoinColumn({ name: 'claim_id' }),
    __metadata("design:type", ClaimEntity)
], NotificationEntity.prototype, "claim", void 0);
__decorate([
    ManyToOne(() => BookingEntity, { onDelete: 'SET NULL' }),
    JoinColumn({ name: 'booking_id' }),
    __metadata("design:type", BookingEntity)
], NotificationEntity.prototype, "booking", void 0);
NotificationEntity = __decorate([
    Entity('notifications'),
    Index(['business_id']),
    Index(['status'])
], NotificationEntity);
export { NotificationEntity };
//# sourceMappingURL=notification.entity.js.map