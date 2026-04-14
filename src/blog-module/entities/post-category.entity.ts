import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * PostCategory entity.
 * Source: BlogService post-category relationship
 */
@Entity('post_categories')
export class PostCategory {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: BlogService post reference */
  @Column()
  postId: number;

  /** Mapped from: BlogService category association */
  @Column()
  categorySlug: string;

  /** Mapped from: BlogService category display */
  @Column()
  categoryName: string;

  @CreateDateColumn()
  createdAt: Date;
}