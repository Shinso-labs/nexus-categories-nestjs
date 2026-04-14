import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * AdminBlogIndex entity.
 * Source: Admin blog statistics and counters
 */
@Entity('admin_blog_indexes')
export class AdminBlogIndex {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: Post count from database */
  @Column()
  totalPosts: number;

  /** Mapped from: Published posts count */
  @Column()
  publishedCount: number;

  /** Mapped from: Draft posts count */
  @Column()
  draftCount: number;

  /** Mapped from: Auto-increment counter */
  @Column()
  lastPostId: number;

  @CreateDateColumn()
  createdAt: Date;
}
