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
import { QrCodeEntity } from './qr-code.entity.js';
import { MessageEntity } from './message.entity.js';
let ChatSessionEntity = class ChatSessionEntity {
    id;
    appliance_id;
    qr_code_id;
    customer_identifier;
    started_at;
    ended_at;
    appliance;
    qr_code;
    messages;
};
__decorate([
    PrimaryColumn('varchar', { length: 36 }),
    __metadata("design:type", String)
], ChatSessionEntity.prototype, "id", void 0);
__decorate([
    Column('varchar', { length: 36 }),
    ForeignKey(() => ApplianceEntity),
    __metadata("design:type", String)
], ChatSessionEntity.prototype, "appliance_id", void 0);
__decorate([
    Column('varchar', { length: 36, nullable: true }),
    ForeignKey(() => QrCodeEntity),
    __metadata("design:type", String)
], ChatSessionEntity.prototype, "qr_code_id", void 0);
__decorate([
    Column('varchar', { length: 255, nullable: true }),
    __metadata("design:type", String)
], ChatSessionEntity.prototype, "customer_identifier", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], ChatSessionEntity.prototype, "started_at", void 0);
__decorate([
    Column('timestamp', { nullable: true }),
    __metadata("design:type", Date)
], ChatSessionEntity.prototype, "ended_at", void 0);
__decorate([
    ManyToOne(() => ApplianceEntity, { onDelete: 'CASCADE' }),
    JoinColumn({ name: 'appliance_id' }),
    __metadata("design:type", ApplianceEntity)
], ChatSessionEntity.prototype, "appliance", void 0);
__decorate([
    ManyToOne(() => QrCodeEntity, { onDelete: 'SET NULL' }),
    JoinColumn({ name: 'qr_code_id' }),
    __metadata("design:type", QrCodeEntity)
], ChatSessionEntity.prototype, "qr_code", void 0);
__decorate([
    OneToMany(() => MessageEntity, message => message.chat_session),
    __metadata("design:type", Array)
], ChatSessionEntity.prototype, "messages", void 0);
ChatSessionEntity = __decorate([
    Entity('chat_sessions'),
    Index(['appliance_id']),
    Index(['qr_code_id'])
], ChatSessionEntity);
export { ChatSessionEntity };
//# sourceMappingURL=chat-session.entity.js.map