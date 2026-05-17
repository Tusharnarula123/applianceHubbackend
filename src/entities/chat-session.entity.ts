import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, Index, ForeignKey } from 'typeorm';
import { ApplianceEntity } from './appliance.entity.js';
import { QrCodeEntity } from './qr-code.entity.js';
import { MessageEntity } from './message.entity.js';

@Entity('chat_sessions')
@Index(['appliance_id'])
@Index(['qr_code_id'])
export class ChatSessionEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  @ForeignKey((appliance: any) => ApplianceEntity)
  appliance_id: string;

  @Column('varchar', { length: 36, nullable: true })
  @ForeignKey((qrCode: any) => QrCodeEntity)
  qr_code_id: string;

  @Column('varchar', { length: 255, nullable: true })
  customer_identifier: string;

  @CreateDateColumn()
  started_at: Date;

  @Column('timestamp', { nullable: true })
  ended_at: Date;

  // Relations
  @ManyToOne((appliance: any) => ApplianceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appliance_id' })
  appliance: any;

  @ManyToOne((qrCode: any) => QrCodeEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'qr_code_id' })
  qr_code: any;

  @OneToMany((message: any) => MessageEntity, (message: any) => message.chat_session)
  messages: any[];
}
