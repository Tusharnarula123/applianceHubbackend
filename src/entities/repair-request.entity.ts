import {
  Entity, Column, PrimaryColumn, ManyToOne, OneToOne,
  JoinColumn, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { ApplianceEntity } from './appliance.entity.js';
import { RepairAgentEntity } from './repair-agent.entity.js';

export enum RepairStatus {
  PENDING    = 'pending',
  ASSIGNED   = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED  = 'completed',
  CANCELLED  = 'cancelled',
}

@Entity('repair_requests')
@Index(['appliance_id'])
@Index(['status'])
@Index(['agent_id'])
@Index(['session_id'])
export class RepairRequestEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  appliance_id: string;

  @Column('varchar', { length: 36, nullable: true })
  agent_id: string | null;

  /** Chat session that created this request */
  @Column('varchar', { length: 36, nullable: true })
  session_id: string;

  @Column('varchar', { length: 255 })
  customer_name: string;

  @Column('varchar', { length: 255, nullable: true })
  customer_email: string;

  @Column('varchar', { length: 30, nullable: true })
  customer_phone: string;

  @Column('text', { nullable: true })
  customer_address: string;

  @Column('varchar', { length: 100, nullable: true })
  customer_city: string;

  @Column('varchar', { length: 20, nullable: true })
  customer_zipcode: string;

  @Column('text')
  issue_description: string;

  @Column('enum', {
    enum: RepairStatus,
    default: RepairStatus.PENDING,
  })
  status: RepairStatus;

  @Column('datetime', { nullable: true })
  scheduled_date: Date | null;

  @Column('datetime', { nullable: true })
  completed_date: Date | null;

  /** Repair cost logged by agent or company after job completion */
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  repair_cost: number | null;

  @Column('text', { nullable: true })
  agent_notes: string;

  @Column('text', { nullable: true })
  internal_notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => ApplianceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appliance_id' })
  appliance: ApplianceEntity;

  @ManyToOne(() => RepairAgentEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agent_id' })
  agent: RepairAgentEntity;
}
