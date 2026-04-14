import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * BlogIndex entity.
 * Source: Blog listing cache
 */
@Entity('blog_indexes')
export class BlogIndex {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: BlogPost count */
  @Column()
  totalPosts: number;

  /** Mapped from: Featured posts */
  @Column('simple-array')
  featuredPostIds: number[];

  /** Mapped from: Recent posts */
  @Column('simple-array')
  recentPostIds: number[];

  /** Mapped from: Cache timestamp */
  @Column()
  lastUpdated: number;

  @CreateDateColumn()
  createdAt: Date;
}