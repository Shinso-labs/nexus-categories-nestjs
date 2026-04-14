import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Category entity.
 * Source: Category model from Eloquent
 */
@Entity('categories')
export class Category {
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

  /** Mapped from: Category.posts_count */
  @Column()
  postCount: number;

  @CreateDateColumn()
  createdAt: Date;
}