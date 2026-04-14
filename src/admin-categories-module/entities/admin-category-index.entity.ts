import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * AdminCategoryIndex entity.
 * Source: Global category management state
 */
@Entity('admin_category_indexes')
export class AdminCategoryIndex {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: Category count */
  @Column({ name: 'total_categories', default: 0 })
  totalCategories: number;

  /** Mapped from: Auto-incrementing ID */
  @Column({ name: 'next_category_id', default: 1 })
  nextCategoryId: number;

  /** Mapped from: Last modification timestamp */
  @Column({ name: 'last_updated', type: 'bigint', default: () => 'EXTRACT(EPOCH FROM NOW())' })
  lastUpdated: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}