import {
  Entity, Column, PrimaryColumn, ManyToOne,
  JoinColumn, CreateDateColumn, Index,
} from 'typeorm';
import { RepairRequestEntity } from './repair-request.entity.js';
import { RepairAgentEntity } from './repair-agent.entity.js';

@Entity('repair_reviews')
@Index(['agent_id'])
@Index(['repair_request_id'])
export class RepairReviewEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  repair_request_id: string;

  @Column('varchar', { length: 36 })
  agent_id: string;

  /** 1 – 5 stars */
  @Column('tinyint', { unsigned: true })
  rating: number;

  @Column('text', { nullable: true })
  comment: string;

  @Column('varchar', { length: 255, nullable: true })
  reviewer_name: string;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne(() => RepairRequestEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'repair_request_id' })
  repair_request: RepairRequestEntity;

  @ManyToOne(() => RepairAgentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agent_id' })
  agent: RepairAgentEntity;
}
