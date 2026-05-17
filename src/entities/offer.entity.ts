import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn, Index, ForeignKey } from 'typeorm';
import { ApplianceEntity } from './appliance.entity.js';

@Entity('offers')
@Index(['appliance_id'])
export class OfferEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  @ForeignKey((appliance: any) => ApplianceEntity)
  appliance_id: string;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  discount_amount: number;

  @Column('decimal', { precision: 5, scale: 2 })
  discount_percentage: number;

  @Column('date')
  valid_from: Date;

  @Column('date')
  valid_until: Date;

  @Column('tinyint', { default: 1 })
  is_active: boolean;

  @Column('int', { default: 0 })
  usage_count: number;

  @Column('int', { nullable: true })
  max_usage_count: number;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne((appliance: any) => ApplianceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appliance_id' })
  appliance: any;
}
