import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * BulkOperation entity.
 * Source: Bulk operations tracking for admin actions
 */
@Entity('bulk_operations')
export class BulkOperation {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: Unique operation identifier */
  @Column()
  operationId: number;

  /** Mapped from: AdminBlogController.parseBulkIds */
  @Column()
  postIds: number[];

  /** Mapped from: delete, publish, etc. */
  @Column()
  operationType: string;

  /** Mapped from: pending, completed, failed */
  @Column()
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}