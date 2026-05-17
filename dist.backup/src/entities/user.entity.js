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
let UserEntity = class UserEntity {
    id;
    business_id;
    name;
    email;
    phone;
    role;
    avatar_url;
    is_active;
    password_hash;
    last_login;
    metadata;
    created_at;
    business;
};
__decorate([
    PrimaryColumn('varchar', { length: 36 }),
    __metadata("design:type", String)
], UserEntity.prototype, "id", void 0);
__decorate([
    Column('varchar', { length: 36 }),
    ForeignKey(() => require('./business.entity.js').BusinessEntity),
    __metadata("design:type", String)
], UserEntity.prototype, "business_id", void 0);
__decorate([
    Column('varchar', { length: 255 }),
    __metadata("design:type", String)
], UserEntity.prototype, "name", void 0);
__decorate([
    Column('varchar', { length: 255, unique: true }),
    __metadata("design:type", String)
], UserEntity.prototype, "email", void 0);
__decorate([
    Column('varchar', { length: 20, nullable: true }),
    __metadata("design:type", String)
], UserEntity.prototype, "phone", void 0);
__decorate([
    Column('enum', { enum: ['owner', 'editor', 'viewer'] }),
    __metadata("design:type", String)
], UserEntity.prototype, "role", void 0);
__decorate([
    Column('varchar', { length: 255, nullable: true }),
    __metadata("design:type", String)
], UserEntity.prototype, "avatar_url", void 0);
__decorate([
    Column('boolean', { default: true }),
    __metadata("design:type", Boolean)
], UserEntity.prototype, "is_active", void 0);
__decorate([
    Column('varchar', { length: 255, nullable: true }),
    __metadata("design:type", String)
], UserEntity.prototype, "password_hash", void 0);
__decorate([
    Column('timestamp', { nullable: true }),
    __metadata("design:type", Date)
], UserEntity.prototype, "last_login", void 0);
__decorate([
    Column('json', { nullable: true }),
    __metadata("design:type", Object)
], UserEntity.prototype, "metadata", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], UserEntity.prototype, "created_at", void 0);
__decorate([
    ManyToOne(() => require('./business.entity.js').BusinessEntity, (business) => business.users, { onDelete: 'CASCADE' }),
    JoinColumn({ name: 'business_id' }),
    __metadata("design:type", Object)
], UserEntity.prototype, "business", void 0);
UserEntity = __decorate([
    Entity('users'),
    Index(['business_id']),
    Index(['email'])
], UserEntity);
export { UserEntity };
//# sourceMappingURL=user.entity.js.map