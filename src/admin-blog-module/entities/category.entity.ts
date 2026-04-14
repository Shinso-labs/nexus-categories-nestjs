import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Category entity.
 * Source: Laravel Category model for blog categorization
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
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Mapped from: Category.parent_id */
  @Column({ nullable: true })
  parentId: number | null;

  /** Mapped from: Category.type */
  @Column({ default: 'general' })
  type: string;

  /** Mapped from: Category.color */
  @Column({ nullable: true })
  color: string | null;

  /** Mapped from: Category.is_active */
  @Column({ default: true })
  isActive: boolean;

  /** Mapped from: Category.sort_order */
  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}