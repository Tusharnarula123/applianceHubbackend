import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, Index, ForeignKey } from 'typeorm';
import { ApplianceEntity } from './appliance.entity.js';
import { ClaimEntity } from './claim.entity.js';
import { NotificationEntity } from './notification.entity.js';

@Entity('bookings')
@Index(['appliance_id'])
@Index(['status'])
export class BookingEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  @ForeignKey((appliance: any) => ApplianceEntity)
  appliance_id: string;

  @Column('varchar', { length: 36, nullable: true })
  @ForeignKey((claim: any) => ClaimEntity)
  claim_id: string;

  @Column('varchar', { length: 255 })
  customer_name: string;

  @Column('varchar', { length: 255 })
  customer_email: string;

  @Column('varchar', { length: 50, nullable: true })
  customer_phone: string;

  @Column('enum', { enum: ['repair', 'maintenance', 'inspection', 'installation'] })
  service_type: string;

  @Column('date')
  preferred_date: Date;

  @Column('varchar', { length: 50, nullable: true })
  preferred_time: string;

  @Column('enum', { enum: ['pending', 'confirmed', 'completed', 'cancelled'] })
  status: string;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne((appliance: any) => ApplianceEntity, (appliance: any) => appliance.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appliance_id' })
  appliance: any;

  @ManyToOne((claim: any) => ClaimEntity, (claim: any) => claim.bookings, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'claim_id' })
  claim: any;

  @OneToMany((notification: any) => NotificationEntity, (notification: any) => notification.booking)
  notifications: any[];
}
