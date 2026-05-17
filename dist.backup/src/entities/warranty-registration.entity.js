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
let WarrantyRegistrationEntity = class WarrantyRegistrationEntity {
    id;
    appliance_id;
    customer_name;
    customer_email;
    customer_phone;
    serial_number;
    purchase_date;
    receipt_url;
    expiry_date;
    status;
    created_at;
    appliance;
    claims;
};
__decorate([
    PrimaryColumn('varchar', { length: 36 }),
    __metadata("design:type", String)
], WarrantyRegistrationEntity.prototype, "id", void 0);
__decorate([
    Column('varchar', { length: 36 }),
    ForeignKey(() => ApplianceEntity),
    __metadata("design:type", String)
], WarrantyRegistrationEntity.prototype, "appliance_id", void 0);
__decorate([
    Column('varchar', { length: 255 }),
    __metadata("design:type", String)
], WarrantyRegistrationEntity.prototype, "customer_name", void 0);
__decorate([
    Column('varchar', { length: 255 }),
    __metadata("design:type", String)
], WarrantyRegistrationEntity.prototype, "customer_email", void 0);
__decorate([
    Column('varchar', { length: 50, nullable: true }),
    __metadata("design:type", String)
], WarrantyRegistrationEntity.prototype, "customer_phone", void 0);
__decorate([
    Column('varchar', { length: 100, nullable: true }),
    __metadata("design:type", String)
], WarrantyRegistrationEntity.prototype, "serial_number", void 0);
__decorate([
    Column('date', { nullable: true }),
    __metadata("design:type", Date)
], WarrantyRegistrationEntity.prototype, "purchase_date", void 0);
__decorate([
    Column('varchar', { length: 500, nullable: true }),
    __metadata("design:type", String)
], WarrantyRegistrationEntity.prototype, "receipt_url", void 0);
__decorate([
    Column('date', { nullable: true }),
    __metadata("design:type", Date)
], WarrantyRegistrationEntity.prototype, "expiry_date", void 0);
__decorate([
    Column('enum', { enum: ['active', 'expired', 'void'] }),
    __metadata("design:type", String)
], WarrantyRegistrationEntity.prototype, "status", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], WarrantyRegistrationEntity.prototype, "created_at", void 0);
__decorate([
    ManyToOne(() => ApplianceEntity, { onDelete: 'CASCADE' }),
    JoinColumn({ name: 'appliance_id' }),
    __metadata("design:type", ApplianceEntity)
], WarrantyRegistrationEntity.prototype, "appliance", void 0);
__decorate([
    OneToMany(() => ClaimEntity, claim => claim.warranty),
    __metadata("design:type", Array)
], WarrantyRegistrationEntity.prototype, "claims", void 0);
WarrantyRegistrationEntity = __decorate([
    Entity('warranty_registrations'),
    Index(['appliance_id']),
    Index(['customer_email'])
], WarrantyRegistrationEntity);
export { WarrantyRegistrationEntity };
//# sourceMappingURL=warranty-registration.entity.js.map