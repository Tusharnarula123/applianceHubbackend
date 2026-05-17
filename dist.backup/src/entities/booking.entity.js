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
import { ApplianceEntity } from './appliance.entity.js';
import { ClaimEntity } from './claim.entity.js';
import { NotificationEntity } from './notification.entity.js';
let BookingEntity = class BookingEntity {
    id;
    appliance_id;
    claim_id;
    customer_name;
    customer_email;
    customer_phone;
    service_type;
    preferred_date;
    preferred_time;
    status;
    notes;
    created_at;
    appliance;
    claim;
    notifications;
};
__decorate([
    PrimaryColumn('varchar', { length: 36 }),
    __metadata("design:type", String)
], BookingEntity.prototype, "id", void 0);
__decorate([
    Column('varchar', { length: 36 }),
    ForeignKey(() => ApplianceEntity),
    __metadata("design:type", String)
], BookingEntity.prototype, "appliance_id", void 0);
__decorate([
    Column('varchar', { length: 36, nullable: true }),
    ForeignKey(() => ClaimEntity),
    __metadata("design:type", String)
], BookingEntity.prototype, "claim_id", void 0);
__decorate([
    Column('varchar', { length: 255 }),
    __metadata("design:type", String)
], BookingEntity.prototype, "customer_name", void 0);
__decorate([
    Column('varchar', { length: 255 }),
    __metadata("design:type", String)
], BookingEntity.prototype, "customer_email", void 0);
__decorate([
    Column('varchar', { length: 50, nullable: true }),
    __metadata("design:type", String)
], BookingEntity.prototype, "customer_phone", void 0);
__decorate([
    Column('enum', { enum: ['repair', 'maintenance', 'inspection', 'installation'] }),
    __metadata("design:type", String)
], BookingEntity.prototype, "service_type", void 0);
__decorate([
    Column('date'),
    __metadata("design:type", Date)
], BookingEntity.prototype, "preferred_date", void 0);
__decorate([
    Column('varchar', { length: 50, nullable: true }),
    __metadata("design:type", String)
], BookingEntity.prototype, "preferred_time", void 0);
__decorate([
    Column('enum', { enum: ['pending', 'confirmed', 'completed', 'cancelled'] }),
    __metadata("design:type", String)
], BookingEntity.prototype, "status", void 0);
__decorate([
    Column('text', { nullable: true }),
    __metadata("design:type", String)
], BookingEntity.prototype, "notes", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], BookingEntity.prototype, "created_at", void 0);
__decorate([
    ManyToOne(() => ApplianceEntity, appliance => appliance.bookings, { onDelete: 'CASCADE' }),
    JoinColumn({ name: 'appliance_id' }),
    __metadata("design:type", ApplianceEntity)
], BookingEntity.prototype, "appliance", void 0);
__decorate([
    ManyToOne(() => ClaimEntity, claim => claim.bookings, { onDelete: 'SET NULL' }),
    JoinColumn({ name: 'claim_id' }),
    __metadata("design:type", ClaimEntity)
], BookingEntity.prototype, "claim", void 0);
__decorate([
    OneToMany(() => NotificationEntity, notification => notification.booking),
    __metadata("design:type", Array)
], BookingEntity.prototype, "notifications", void 0);
BookingEntity = __decorate([
    Entity('bookings'),
    Index(['appliance_id']),
    Index(['status'])
], BookingEntity);
export { BookingEntity };
//# sourceMappingURL=booking.entity.js.map