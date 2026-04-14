import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * PostMetrics entity.
 * Source: BlogService view count tracking
 */
@Entity('post_metricses')
export class PostMetrics {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: BlogService post reference */
  @Column()
  postId: number;

  /** Mapped from: BlogService view tracking */
  @Column({ default: 0 })
  viewCount: number;

  /** Mapped from: BlogService view timestamp */
  @Column()
  lastViewed: number;

  @CreateDateColumn()
  createdAt: Date;
}