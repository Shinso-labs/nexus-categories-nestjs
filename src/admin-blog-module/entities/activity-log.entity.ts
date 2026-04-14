import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * ActivityLog entity.
 * Source: Laravel ActivityLog model for tracking user actions
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
  @Column({ type: 'text', nullable: true })
  details: string | null;

  /** Mapped from: ActivityLog.ip_address */
  @Column({ nullable: true })
  ipAddress: string | null;

  /** Mapped from: ActivityLog.user_agent */
  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  /** Mapped from: ActivityLog.entity_type */
  @Column({ nullable: true })
  entityType: string | null;

  /** Mapped from: ActivityLog.entity_id */
  @Column({ nullable: true })
  entityId: number | null;

  @CreateDateColumn()
  createdAt: Date;
}