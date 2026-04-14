import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * AdminCategory entity.
 * Source: Category model state for admin management
 */
@Entity('admin_categories')
export class AdminCategory {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: Category.name */
  @Column({ name: 'name' })
  name: string;

  /** Mapped from: Category.slug */
  @Column({ name: 'slug' })
  slug: string;

  /** Mapped from: Category.description */
  @Column({ name: 'description', nullable: true })
  description: string | null;

  /** Mapped from: Category.parent_id */
  @Column({ name: 'parent_id', nullable: true })
  parentId: number | null;

  /** Mapped from: Category.sort_order */
  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  /** Mapped from: Category.is_active */
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  /** Mapped from: Category.meta_title */
  @Column({ name: 'meta_title', nullable: true })
  metaTitle: string | null;

  /** Mapped from: Category.meta_description */
  @Column({ name: 'meta_description', nullable: true })
  metaDescription: string | null;

  /** Mapped from: Category.color */
  @Column({ name: 'color', default: 'blue' })
  color: string;

  /** Mapped from: Category.type */
  @Column({ name: 'type', default: 'listing' })
  type: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}