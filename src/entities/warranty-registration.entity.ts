import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, Index, ForeignKey } from 'typeorm';
import { ApplianceEntity } from './appliance.entity.js';
import { ClaimEntity } from './claim.entity.js';

@Entity('warranty_registrations')
@Index(['appliance_id'])
@Index(['customer_email'])
export class WarrantyRegistrationEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  @ForeignKey((appliance: any) => ApplianceEntity)
  appliance_id: string;

  @Column('varchar', { length: 255 })
  customer_name: string;

  @Column('varchar', { length: 255 })
  customer_email: string;

  @Column('varchar', { length: 50, nullable: true })
  customer_phone: string;

  @Column('varchar', { length: 100, nullable: true })
  serial_number: string;

  @Column('date', { nullable: true })
  purchase_date: Date;

  @Column('varchar', { length: 500, nullable: true })
  receipt_url: string;

  @Column('date', { nullable: true })
  expiry_date: Date;

  @Column('enum', { enum: ['active', 'expired', 'void'] })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne((appliance: any) => ApplianceEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appliance_id' })
  appliance: any;

  @OneToMany((claim: any) => ClaimEntity, (claim: any) => claim.warranty)
  claims: any[];
}
