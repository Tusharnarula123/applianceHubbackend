import {
  Entity, Column, PrimaryColumn, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { BusinessEntity } from './business.entity.js';

@Entity('repair_agents')
@Index(['business_id'])
@Index(['is_active'])
export class RepairAgentEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  /** Null = independent marketplace agent; set = belongs to this company */
  @Column('varchar', { length: 36, nullable: true })
  business_id: string | null;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 255 })
  email: string;

  @Column('varchar', { length: 30, nullable: true })
  phone: string;

  @Column('varchar', { length: 30, nullable: true })
  whatsapp: string;

  @Column('varchar', { length: 500, nullable: true })
  photo_url: string;

  /** Appliance categories/types this agent specialises in */
  @Column('json', { nullable: true })
  specializations: string[];

  /** Cities or postal codes the agent covers */
  @Column('json', { nullable: true })
  service_areas: string[];

  @Column('boolean', { default: true })
  is_active: boolean;

  /** Whether the agent is visible in the public marketplace */
  @Column('boolean', { default: false })
  is_marketplace: boolean;

  /** Cached average rating (updated on each review save) */
  @Column('decimal', { precision: 3, scale: 2, default: 0 })
  rating: number;

  @Column('int', { unsigned: true, default: 0 })
  total_jobs: number;

  @Column('text', { nullable: true })
  bio: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => BusinessEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'business_id' })
  business: BusinessEntity;
}
