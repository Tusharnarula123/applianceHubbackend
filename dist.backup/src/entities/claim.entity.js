var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, OneToMany, Index, ForeignKey } from 'typeorm';
import { ApplianceEntity } from './appliance.entity.js';
import { WarrantyRegistrationEntity } from './warranty-registration.entity.js';
import { BookingEntity } from './booking.entity.js';
import { NotificationEntity } from './notification.entity.js';
let ClaimEntity = class ClaimEntity {
    id;
    appliance_id;
    warranty_id;
    customer_name;
    customer_email;
    customer_phone;
    issue;
    status;
    priority;
    resolution_notes;
    filed_at;
    resolved_at;
    appliance;
    warranty;
    bookings;
    notifications;
};
__decorate([
    PrimaryColumn('varchar', { length: 36 }),
    __metadata("design:type", String)
], ClaimEntity.prototype, "id", void 0);
__decorate([
    Column('varchar', { length: 36 }),
    ForeignKey(() => ApplianceEntity),
    __metadata("design:type", String)
], ClaimEntity.prototype, "appliance_id", void 0);
__decorate([
    Column('varchar', { length: 36, nullable: true }),
    ForeignKey(() => WarrantyRegistrationEntity),
    __metadata("design:type", String)
], ClaimEntity.prototype, "warranty_id", void 0);
__decorate([
    Column('varchar', { length: 255 }),
    __metadata("design:type", String)
], ClaimEntity.prototype, "customer_name", void 0);
__decorate([
    Column('varchar', { length: 255 }),
    __metadata("design:type", String)
], ClaimEntity.prototype, "customer_email", void 0);
__decorate([
    Column('varchar', { length: 50, nullable: true }),
    __metadata("design:type", String)
], ClaimEntity.prototype, "customer_phone", void 0);
__decorate([
    Column('text'),
    __metadata("design:type", String)
], ClaimEntity.prototype, "issue", void 0);
__decorate([
    Column('enum', { enum: ['open', 'pending', 'resolved'] }),
    __metadata("design:type", String)
], ClaimEntity.prototype, "status", void 0);
__decorate([
    Column('enum', { enum: ['low', 'medium', 'high'] }),
    __metadata("design:type", String)
], ClaimEntity.prototype, "priority", void 0);
__decorate([
    Column('text', { nullable: true }),
    __metadata("design:type", String)
], ClaimEntity.prototype, "resolution_notes", void 0);
__decorate([
    Column('timestamp'),
    __metadata("design:type", Date)
], ClaimEntity.prototype, "filed_at", void 0);
__decorate([
    Column('timestamp', { nullable: true }),
    __metadata("design:type", Date)
], ClaimEntity.prototype, "resolved_at", void 0);
__decorate([
    ManyToOne(() => ApplianceEntity, { onDelete: 'CASCADE' }),
    JoinColumn({ name: 'appliance_id' }),
    __metadata("design:type", ApplianceEntity)
], ClaimEntity.prototype, "appliance", void 0);
__decorate([
    ManyToOne(() => WarrantyRegistrationEntity, { onDelete: 'SET NULL' }),
    JoinColumn({ name: 'warranty_id' }),
    __metadata("design:type", WarrantyRegistrationEntity)
], ClaimEntity.prototype, "warranty", void 0);
__decorate([
    OneToMany(() => BookingEntity, booking => booking.claim),
    __metadata("design:type", Array)
], ClaimEntity.prototype, "bookings", void 0);
__decorate([
    OneToMany(() => NotificationEntity, notification => notification.claim),
    __metadata("design:type", Array)
], ClaimEntity.prototype, "notifications", void 0);
ClaimEntity = __decorate([
    Entity('claims'),
    Index(['appliance_id']),
    Index(['warranty_id']),
    Index(['status'])
], ClaimEntity);
export { ClaimEntity };
//# sourceMappingURL=claim.entity.js.map