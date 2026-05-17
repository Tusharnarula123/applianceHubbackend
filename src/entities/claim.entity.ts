import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, OneToMany, Index, ForeignKey } from 'typeorm';
import { ApplianceEntity } from './appliance.entity.js';
import { WarrantyRegistrationEntity } from './warranty-registration.entity.js';
import { BookingEntity } from './booking.entity.js';
import { NotificationEntity } from './notification.entity.js';

@Entity('claims')
@Index(['appliance_id'])
@Index(['warranty_id'])
@Index(['status'])
export class ClaimEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  @ForeignKey((appliance: any) => ApplianceEntity)
  appliance_id: string;

  @Column('varchar', { length: 36, nullable: true })
  @ForeignKey((warrantyRegistration: any) => WarrantyRegistrationEntity)
  warranty_id: string;

  @Column('varchar', { length: 255 })
  customer_name: string;

  @Column('varchar', { length: 255 })
  customer_email: string;

  @Column('varchar', { length: 50, nullable: true })
  customer_phone: string;

  @Column('text')
  issue: string;

  @Column('enum', { enum: ['open', 'pending', 'resolved'] })
  status: string;

  @Column('enum', { enum: ['low', 'medium', 'high'] })
  priority: string;

  @Column('text', { nullable: true })
  resolution_notes: string;

  @Column('timestamp')
  filed_at: Date;

  @Column('timestamp', { nullable: true })
  resolved_at: Date;

  // Relations
  @ManyToOne((appliance: any) => ApplianceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appliance_id' })
  appliance: any;

  @ManyToOne((warrantyRegistration: any) => WarrantyRegistrationEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'warranty_id' })
  warranty: any;

  @OneToMany((booking: any) => BookingEntity, (booking: any) => booking.claim)
  bookings: any[];

  @OneToMany((notification: any) => NotificationEntity, (notification: any) => notification.claim)
  notifications: any[];
}
