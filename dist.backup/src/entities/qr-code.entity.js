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
import { ChatSessionEntity } from './chat-session.entity.js';
let QrCodeEntity = class QrCodeEntity {
    id;
    appliance_id;
    url;
    scan_count;
    created_at;
    appliance;
    chat_sessions;
};
__decorate([
    PrimaryColumn('varchar', { length: 36 }),
    __metadata("design:type", String)
], QrCodeEntity.prototype, "id", void 0);
__decorate([
    Column('varchar', { length: 36 }),
    ForeignKey(() => ApplianceEntity),
    __metadata("design:type", String)
], QrCodeEntity.prototype, "appliance_id", void 0);
__decorate([
    Column('varchar', { length: 500 }),
    __metadata("design:type", String)
], QrCodeEntity.prototype, "url", void 0);
__decorate([
    Column('int', { unsigned: true, default: 0 }),
    __metadata("design:type", Number)
], QrCodeEntity.prototype, "scan_count", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], QrCodeEntity.prototype, "created_at", void 0);
__decorate([
    ManyToOne(() => ApplianceEntity, { onDelete: 'CASCADE' }),
    JoinColumn({ name: 'appliance_id' }),
    __metadata("design:type", ApplianceEntity)
], QrCodeEntity.prototype, "appliance", void 0);
__decorate([
    OneToMany(() => ChatSessionEntity, chatSession => chatSession.qr_code),
    __metadata("design:type", Array)
], QrCodeEntity.prototype, "chat_sessions", void 0);
QrCodeEntity = __decorate([
    Entity('qr_codes'),
    Index(['appliance_id'])
], QrCodeEntity);
export { QrCodeEntity };
//# sourceMappingURL=qr-code.entity.js.map