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
  @Column()
  totalCategories: number;

  /** Mapped from: Auto-incrementing ID */
  @Column()
  nextCategoryId: number;

  /** Mapped from: Last modification timestamp */
  @Column()
  lastUpdated: number;

  @CreateDateColumn()
  createdAt: Date;
}
