var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, Column, PrimaryColumn, OneToMany, CreateDateColumn, Index } from 'typeorm';
let BusinessEntity = class BusinessEntity {
    id;
    name;
    description;
    website;
    contact_email;
    contact_phone;
    plan;
    plan_status;
    logo_url;
    timezone;
    metadata;
    created_at;
    users;
    appliances;
    notifications;
    activities;
};
__decorate([
    PrimaryColumn('varchar', { length: 36 }),
    __metadata("design:type", String)
], BusinessEntity.prototype, "id", void 0);
__decorate([
    Column('varchar', { length: 255 }),
    __metadata("design:type", String)
], BusinessEntity.prototype, "name", void 0);
__decorate([
    Column('text', { nullable: true }),
    __metadata("design:type", String)
], BusinessEntity.prototype, "description", void 0);
__decorate([
    Column('varchar', { length: 255, nullable: true }),
    __metadata("design:type", String)
], BusinessEntity.prototype, "website", void 0);
__decorate([
    Column('varchar', { length: 255, nullable: true }),
    __metadata("design:type", String)
], BusinessEntity.prototype, "contact_email", void 0);
__decorate([
    Column('varchar', { length: 20, nullable: true }),
    __metadata("design:type", String)
], BusinessEntity.prototype, "contact_phone", void 0);
__decorate([
    Column('enum', { enum: ['startup', 'basic', 'pro', 'enterprise'] }),
    __metadata("design:type", String)
], BusinessEntity.prototype, "plan", void 0);
__decorate([
    Column('enum', { enum: ['active', 'trial', 'inactive', 'suspended'] }),
    __metadata("design:type", String)
], BusinessEntity.prototype, "plan_status", void 0);
__decorate([
    Column('text', { nullable: true }),
    __metadata("design:type", String)
], BusinessEntity.prototype, "logo_url", void 0);
__decorate([
    Column('varchar', { length: 255, nullable: true }),
    __metadata("design:type", String)
], BusinessEntity.prototype, "timezone", void 0);
__decorate([
    Column('json', { nullable: true }),
    __metadata("design:type", Object)
], BusinessEntity.prototype, "metadata", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], BusinessEntity.prototype, "created_at", void 0);
__decorate([
    OneToMany(() => require('./user.entity.js').UserEntity, (user) => user.business),
    __metadata("design:type", Array)
], BusinessEntity.prototype, "users", void 0);
__decorate([
    OneToMany(() => require('./appliance.entity.js').ApplianceEntity, (appliance) => appliance.business),
    __metadata("design:type", Array)
], BusinessEntity.prototype, "appliances", void 0);
__decorate([
    OneToMany(() => require('./notification.entity.js').NotificationEntity, (notification) => notification.business),
    __metadata("design:type", Array)
], BusinessEntity.prototype, "notifications", void 0);
__decorate([
    OneToMany(() => require('./activity.entity.js').ActivityEntity, (activity) => activity.business),
    __metadata("design:type", Array)
], BusinessEntity.prototype, "activities", void 0);
BusinessEntity = __decorate([
    Entity('businesses'),
    Index(['id'])
], BusinessEntity);
export { BusinessEntity };
//# sourceMappingURL=business.entity.js.map