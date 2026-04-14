import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Category entity.
 * Enhanced with tenant scoping, type field, and color field
 * Source: Category model from Eloquent
 */
@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: Category.tenant_id */
  @Column()
  tenantId: number;

  /** Mapped from: Category.name */
  @Column()
  name: string;

  /** Mapped from: Category.slug */
  @Column()
  slug: string;

  /** Mapped from: Category.description */
  @Column({ nullable: true })
  description: string | null;

  /** Mapped from: Category.parent_id */
  @Column({ nullable: true })
  parentId: number | null;

  /** Mapped from: Category.sort_order */
  @Column({ default: 0 })
  sortOrder: number;

  /** Mapped from: Category.is_active */
  @Column({ default: true })
  isActive: boolean;

  /** Mapped from: Category.posts_count */
  @Column({ default: 0 })
  postCount: number;

  /** Mapped from: Category.color */
  @Column({ default: 'blue' })
  color: string;

  /** Mapped from: Category.type */
  @Column({ default: 'listing' })
  type: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}