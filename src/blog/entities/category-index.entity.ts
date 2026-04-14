import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * CategoryIndex entity.
 * Source: BlogService getCategories method state
 */
@Entity('category_indexes')
export class CategoryIndex {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: BlogService category count */
  @Column()
  totalCategories: number;

  /** Mapped from: BlogService category listing */
  @Column('simple-array')
  categorySlugs: string[];

  /** Mapped from: BlogService cache timestamp */
  @Column()
  lastUpdated: number;

  @CreateDateColumn()
  createdAt: Date;
}