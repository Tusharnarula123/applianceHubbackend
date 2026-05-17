import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, Index, ForeignKey } from 'typeorm';
import { ApplianceEntity } from './appliance.entity.js';
import { ChatSessionEntity } from './chat-session.entity.js';

@Entity('qr_codes')
@Index(['appliance_id'])
export class QrCodeEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  @ForeignKey((appliance: any) => ApplianceEntity)
  appliance_id: string;

  @Column('varchar', { length: 500 })
  url: string;

  @Column('int', { unsigned: true, default: 0 })
  scan_count: number;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne((appliance: any) => ApplianceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appliance_id' })
  appliance: any;

  @OneToMany((chatSession: any) => ChatSessionEntity, (chatSession: any) => chatSession.qr_code)
  chat_sessions: any[];
}
