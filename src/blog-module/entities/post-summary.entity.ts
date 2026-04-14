import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * PostSummary entity.
 * Source: formatPostSummary output
 */
@Entity('post_summaries')
export class PostSummary {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: BlogPost.slug */
  @Column()
  slug: string;

  /** Mapped from: BlogPost.title */
  @Column()
  title: string;

  /** Mapped from: BlogPost.excerpt */
  @Column()
  excerpt: string;

  /** Mapped from: Resolved image URL */
  @Column({ nullable: true })
  featuredImageUrl: string | null;

  /** Mapped from: BlogPost.published_at */
  @Column({ nullable: true })
  publishedAt: number | null;

  @CreateDateColumn()
  createdAt: Date;
}