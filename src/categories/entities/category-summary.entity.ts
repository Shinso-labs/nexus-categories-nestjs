import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * CategorySummary entity.
 * Enhanced with tenant scoping
 * Source: Formatted category data for API responses
 */
@Entity('category_summaries')
export class CategorySummary {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: Tenant ID */
  @Column()
  tenantId: number;

  /** Mapped from: Category.name */
  @Column()
  name: string;

  /** Mapped from: Category.slug */
  @Column()
  slug: string;

  /** Mapped from: Category.posts_count */
  @Column()
  postCount: number;

  /** Mapped from: Category.parent_id */
  @Column({ nullable: true })
  parentId: number | null;

  @CreateDateColumn()
  createdAt: Date;
}