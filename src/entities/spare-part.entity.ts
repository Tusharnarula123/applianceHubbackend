import {
  Entity, Column, PrimaryColumn, ManyToOne,
  JoinColumn, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { BusinessEntity } from './business.entity.js';
import { ApplianceEntity } from './appliance.entity.js';

@Entity('spare_parts')
@Index(['business_id'])
@Index(['appliance_id'])
@Index(['is_available'])
export class SparePartEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  business_id: string;

  /** Optional: part is specific to a single appliance model */
  @Column('varchar', { length: 36, nullable: true })
  appliance_id: string | null;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 100, nullable: true })
  part_number: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('varchar', { length: 100, nullable: true })
  compatible_models: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  price: number;

  @Column('int', { unsigned: true, default: 0 })
  stock_quantity: number;

  @Column('boolean', { default: true })
  is_available: boolean;

  @Column('varchar', { length: 500, nullable: true })
  image_url: string;

  @Column('varchar', { length: 100, nullable: true })
  category: string;

  /** Estimated delivery days */
  @Column('int', { unsigned: true, nullable: true })
  lead_time_days: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => BusinessEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: BusinessEntity;

  @ManyToOne(() => ApplianceEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appliance_id' })
  appliance: ApplianceEntity;
}
