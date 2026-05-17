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
import { ApplianceEntity } from './appliance.entity.js';
let DocumentEntity = class DocumentEntity {
    id;
    appliance_id;
    name;
    file_url;
    file_size_bytes;
    file_type;
    mime_type;
    indexed_at;
    created_at;
    appliance;
};
__decorate([
    PrimaryColumn('varchar', { length: 36 }),
    __metadata("design:type", String)
], DocumentEntity.prototype, "id", void 0);
__decorate([
    Column('varchar', { length: 36 }),
    ForeignKey(() => ApplianceEntity),
    __metadata("design:type", String)
], DocumentEntity.prototype, "appliance_id", void 0);
__decorate([
    Column('varchar', { length: 255 }),
    __metadata("design:type", String)
], DocumentEntity.prototype, "name", void 0);
__decorate([
    Column('varchar', { length: 500 }),
    __metadata("design:type", String)
], DocumentEntity.prototype, "file_url", void 0);
__decorate([
    Column('bigint', { nullable: true, unsigned: true }),
    __metadata("design:type", Number)
], DocumentEntity.prototype, "file_size_bytes", void 0);
__decorate([
    Column('enum', { enum: ['Manual', 'Warranty', 'Parts Catalog', 'Error Codes', 'Service Guide'] }),
    __metadata("design:type", String)
], DocumentEntity.prototype, "file_type", void 0);
__decorate([
    Column('varchar', { length: 100, nullable: true }),
    __metadata("design:type", String)
], DocumentEntity.prototype, "mime_type", void 0);
__decorate([
    Column('timestamp', { nullable: true }),
    __metadata("design:type", Date)
], DocumentEntity.prototype, "indexed_at", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], DocumentEntity.prototype, "created_at", void 0);
__decorate([
    ManyToOne(() => ApplianceEntity, { onDelete: 'CASCADE' }),
    JoinColumn({ name: 'appliance_id' }),
    __metadata("design:type", ApplianceEntity)
], DocumentEntity.prototype, "appliance", void 0);
DocumentEntity = __decorate([
    Entity('documents'),
    Index(['appliance_id']),
    Index(['file_type'])
], DocumentEntity);
export { DocumentEntity };
//# sourceMappingURL=document.entity.js.map