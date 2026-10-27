import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm';

/**
 * A maintenance task the business adds for an appliance, on top of the
 * maintenance items extracted (and verified) from the uploaded manual.
 */
@Entity('maintenance_tasks')
@Index(['appliance_id'])
export class MaintenanceTaskEntity {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36 })
  appliance_id: string;

  @Column('varchar', { length: 255 })
  title: string;

  /** Human-readable frequency, e.g. "Every 3 months" */
  @Column('varchar', { length: 100 })
  frequency: string;

  /** Interval in days, used to sort and to compute reminders */
  @Column('int', { nullable: true })
  interval_days: number | null;

  @Column('text', { nullable: true })
  details: string | null;

  @CreateDateColumn()
  created_at: Date;
}
