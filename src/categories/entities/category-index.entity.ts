import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * CategoryIndex entity.
 * Source: Category indexing metadata
 */
@Entity('category_indexes')
export class CategoryIndex {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: Category count */
  @Column()
  totalCategories: number;

  /** Mapped from: Active category count */
  @Column()
  activeCategories: number;

  /** Mapped from: Index last update timestamp */
  @Column()
  lastUpdated: number;

  @CreateDateColumn()
  createdAt: Date;
}
