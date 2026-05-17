import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn, Index, ForeignKey } from 'typeorm';
import { BusinessEntity } from './business.entity.js';
import { ClaimEntity } from './claim.entity.js';
import { BookingEntity } from './booking.entity.js';

@Entity('notifications')
@Index(['business_id'])
@Index(['status'])
export class NotificationEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  @ForeignKey((business: any) => BusinessEntity)
  business_id: string;

  @Column('varchar', { length: 36, nullable: true })
  @ForeignKey((claim: any) => ClaimEntity)
  claim_id: string;

  @Column('varchar', { length: 36, nullable: true })
  @ForeignKey((booking: any) => BookingEntity)
  booking_id: string;

  @Column('enum', { enum: ['email', 'sms', 'in_app'] })
  channel: string;

  @Column('varchar', { length: 255 })
  recipient: string;

  @Column('text')
  message: string;

  @Column('enum', { enum: ['pending', 'sent', 'failed'] })
  status: string;

  @Column('timestamp', { nullable: true })
  sent_at: Date;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne((business: any) => BusinessEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: any;

  @ManyToOne((claim: any) => ClaimEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'claim_id' })
  claim: any;

  @ManyToOne((booking: any) => BookingEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'booking_id' })
  booking: any;
}
