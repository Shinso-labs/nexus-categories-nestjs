import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * ActivityLog entity.
 * Source: Laravel ActivityLog model
 */
@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: ActivityLog.user_id */
  @Column()
  userId: number;

  /** Mapped from: ActivityLog.action */
  @Column()
  action: string;

  /** Mapped from: ActivityLog.details */
  @Column({ nullable: true })
  details: string | null;

  @CreateDateColumn()
  createdAt: Date;
}