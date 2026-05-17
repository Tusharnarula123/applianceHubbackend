import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn, Index, ForeignKey } from 'typeorm';
import { BusinessEntity } from './business.entity.js';
import { ApplianceEntity } from './appliance.entity.js';

@Entity('activity')
@Index(['business_id'])
@Index(['appliance_id'])
@Index(['created_at'])
export class ActivityEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  @ForeignKey((business: any) => BusinessEntity)
  business_id: string;

  @Column('varchar', { length: 36, nullable: true })
  @ForeignKey((appliance: any) => ApplianceEntity)
  appliance_id: string;

  @Column('enum', { enum: ['claim', 'scan', 'resolve', 'upload'] })
  type: string;

  @Column('varchar', { length: 500 })
  text: string;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne((business: any) => BusinessEntity, (business: any) => business.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: any;

  @ManyToOne((appliance: any) => ApplianceEntity, (appliance: any) => appliance.activities, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'appliance_id' })
  appliance: any;
}
