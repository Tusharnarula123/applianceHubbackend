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
import { ChatSessionEntity } from './chat-session.entity.js';
let MessageEntity = class MessageEntity {
    id;
    chat_session_id;
    role;
    content;
    message_type;
    metadata;
    created_at;
    chat_session;
};
__decorate([
    PrimaryColumn('varchar', { length: 36 }),
    __metadata("design:type", String)
], MessageEntity.prototype, "id", void 0);
__decorate([
    Column('varchar', { length: 36 }),
    ForeignKey(() => ChatSessionEntity),
    __metadata("design:type", String)
], MessageEntity.prototype, "chat_session_id", void 0);
__decorate([
    Column('enum', { enum: ['user', 'assistant'] }),
    __metadata("design:type", String)
], MessageEntity.prototype, "role", void 0);
__decorate([
    Column('text'),
    __metadata("design:type", String)
], MessageEntity.prototype, "content", void 0);
__decorate([
    Column('varchar', { length: 255, nullable: true }),
    __metadata("design:type", String)
], MessageEntity.prototype, "message_type", void 0);
__decorate([
    Column('json', { nullable: true }),
    __metadata("design:type", Object)
], MessageEntity.prototype, "metadata", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], MessageEntity.prototype, "created_at", void 0);
__decorate([
    ManyToOne(() => ChatSessionEntity, { onDelete: 'CASCADE' }),
    JoinColumn({ name: 'chat_session_id' }),
    __metadata("design:type", ChatSessionEntity)
], MessageEntity.prototype, "chat_session", void 0);
MessageEntity = __decorate([
    Entity('messages'),
    Index(['chat_session_id'])
], MessageEntity);
export { MessageEntity };
//# sourceMappingURL=message.entity.js.map