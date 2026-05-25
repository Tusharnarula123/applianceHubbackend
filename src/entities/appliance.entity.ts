import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, Index, ForeignKey } from 'typeorm';
import { BusinessEntity } from './business.entity.js';
import { QrCodeEntity } from './qr-code.entity.js';
import { DocumentEntity } from './document.entity.js';
import { WarrantyRegistrationEntity } from './warranty-registration.entity.js';
import { ClaimEntity } from './claim.entity.js';
import { BookingEntity } from './booking.entity.js';
import { ChatSessionEntity } from './chat-session.entity.js';
import { OfferEntity } from './offer.entity.js';
import { ActivityEntity } from './activity.entity.js';

@Entity('appliances')
@Index(['business_id'])
@Index(['status'])
export class ApplianceEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  @ForeignKey((business: any) => BusinessEntity)
  business_id: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 255, nullable: true })
  model: string;

  @Column('varchar', { length: 100 })
  sku: string;

  @Column('varchar', { length: 100 })
  category: string;

  @Column('enum', { enum: ['active', 'training', 'draft'] })
  status: string;

  @Column('varchar', { length: 20, default: '#4F46E5' })
  color: string;

  @Column('varchar', { length: 255, nullable: true })
  bot_name: string;

  @Column('text', { nullable: true })
  bot_welcome: string;

  @Column('varchar', { length: 100, nullable: true, default: 'professional' })
  bot_tone: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('varchar', { length: 500, nullable: true })
  image_url: string;

  @Column('int', { unsigned: true, default: 0 })
  scans_count: number;

  @CreateDateColumn()
  created_at: Date;

  @Column('datetime', { nullable: true })
  deleted_at: Date | null = null;

  // Relations
  @ManyToOne((business: any) => BusinessEntity, (business: any) => business.appliances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: any;

  @OneToMany((qrCode: any) => QrCodeEntity, (qr: any) => qr.appliance)
  qr_codes: any[];

  @OneToMany((document: any) => DocumentEntity, (doc: any) => doc.appliance)
  documents: any[];

  @OneToMany((warrantyRegistration: any) => WarrantyRegistrationEntity, (warranty: any) => warranty.appliance)
  warranties: any[];

  @OneToMany((claim: any) => ClaimEntity, (claim: any) => claim.appliance)
  claims: any[];

  @OneToMany((booking: any) => BookingEntity, (booking: any) => booking.appliance)
  bookings: any[];

  @OneToMany((chatSession: any) => ChatSessionEntity, (chat: any) => chat.appliance)
  chat_sessions: any[];

  @OneToMany((offer: any) => OfferEntity, (offer: any) => offer.appliance)
  offers: any[];

  @OneToMany((activity: any) => ActivityEntity, (activity: any) => activity.appliance)
  activities: any[];
}
