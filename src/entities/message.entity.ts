import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn, Index, ForeignKey } from 'typeorm';
import { ChatSessionEntity } from './chat-session.entity.js';

@Entity('messages')
@Index(['chat_session_id'])
export class MessageEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  @ForeignKey((chatSession: any) => ChatSessionEntity)
  chat_session_id: string;

  @Column('enum', { enum: ['user', 'assistant'] })
  role: string;

  @Column('text')
  content: string;

  @Column('varchar', { length: 255, nullable: true })
  message_type: string;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne((chatSession: any) => ChatSessionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_session_id' })
  chat_session: any;
}
