import {
  Entity, Column, PrimaryColumn, ManyToOne,
  JoinColumn, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { ApplianceEntity } from './appliance.entity.js';

export enum PartsOrderStatus {
  PENDING   = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED   = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface OrderLineItem {
  part_id: string;
  name: string;
  part_number?: string;
  quantity: number;
  unit_price: number;
}

@Entity('parts_orders')
@Index(['appliance_id'])
@Index(['status'])
@Index(['session_id'])
export class PartsOrderEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  appliance_id: string;

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

  /** JSON array of OrderLineItem */
  @Column('json')
  items: OrderLineItem[];

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  total_amount: number;

  @Column('enum', {
    enum: PartsOrderStatus,
    default: PartsOrderStatus.PENDING,
  })
  status: PartsOrderStatus;

  @Column('varchar', { length: 255, nullable: true })
  tracking_number: string;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => ApplianceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appliance_id' })
  appliance: ApplianceEntity;
}
