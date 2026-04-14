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
  @Column()
  sortOrder: number;

  /** Mapped from: Category.is_active */
  @Column()
  isActive: boolean;

  /** Mapped from: Category.meta_title */
  @Column({ nullable: true })
  metaTitle: string | null;

  /** Mapped from: Category.meta_description */
  @Column({ nullable: true })
  metaDescription: string | null;

  /** Mapped from: Category.color */
  @Column({ default: 'blue' })
  color: string;

  /** Mapped from: Category.type */
  @Column({ default: 'listing' })
  type: string;

  @CreateDateColumn()
  createdAt: Date;
}