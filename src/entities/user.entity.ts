import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn, Index, ForeignKey } from 'typeorm';
import { BusinessEntity } from './business.entity.js';

@Entity('users')
@Index(['business_id'])
export class UserEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  @ForeignKey((business: any) => BusinessEntity)
  business_id: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 255, unique: true })
  email: string;

  @Column('varchar', { length: 20, nullable: true })
  phone: string;

  @Column('enum', { enum: ['owner', 'editor', 'viewer'] })
  role: string;

  @Column('varchar', { length: 255, nullable: true })
  avatar_url: string;

  @Column('boolean', { default: true })
  is_active: boolean;

  @Column('varchar', { length: 255, nullable: true })
  password_hash: string;

  @Column('timestamp', { nullable: true })
  last_login: Date;

  @Column('json', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  // Relations
  @ManyToOne((business: any) => BusinessEntity, (business: any) => business.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: any;
}
