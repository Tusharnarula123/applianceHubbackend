import { Entity, Column, PrimaryColumn, OneToMany, CreateDateColumn, Index } from 'typeorm';
import { UserEntity } from './user.entity.js';
import { ApplianceEntity } from './appliance.entity.js';
import { NotificationEntity } from './notification.entity.js';
import { ActivityEntity } from './activity.entity.js';

@Entity('businesses')
@Index(['id'])
export class BusinessEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('varchar', { length: 255, nullable: true })
  website: string;

  @Column('varchar', { length: 255, nullable: true })
  contact_email: string;

  @Column('varchar', { length: 20, nullable: true })
  contact_phone: string;

  @Column('enum', { enum: ['startup', 'basic', 'pro', 'enterprise'] })
  plan: string;

  @Column('enum', { enum: ['active', 'trial', 'inactive', 'suspended'] })
  plan_status: string;

  @Column('text', { nullable: true })
  logo_url: string;

  @Column('varchar', { length: 255, nullable: true })
  timezone: string;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @OneToMany((user: any) => UserEntity, (user: any) => user.business)
  users: any[];

  @OneToMany((appliance: any) => ApplianceEntity, (appliance: any) => appliance.business)
  appliances: any[];

  @OneToMany((notification: any) => NotificationEntity, (notification: any) => notification.business)
  notifications: any[];

  @OneToMany((activity: any) => ActivityEntity, (activity: any) => activity.business)
  activities: any[];
}
