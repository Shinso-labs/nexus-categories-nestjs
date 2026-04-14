import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * BlogPost entity.
 * Source: BlogPost model
 */
@Entity('blog_posts')
export class BlogPost {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: BlogPost.slug */
  @Column()
  slug: string;

  /** Mapped from: BlogPost.title */
  @Column()
  title: string;

  /** Mapped from: BlogPost.content */
  @Column()
  content: string;

  /** Mapped from: BlogPost.excerpt */
  @Column()
  excerpt: string;

  /** Mapped from: BlogPost.featured_image */
  @Column({ nullable: true })
  featuredImage: string | null;

  /** Mapped from: BlogPost.author_id */
  @Column()
  authorId: number;

  /** Mapped from: BlogPost.categories */
  @Column()
  categoryIds: number[];

  /** Mapped from: BlogPost.status */
  @Column()
  status: string;

  /** Mapped from: BlogPost.published_at */
  @Column({ nullable: true })
  publishedAt: number | null;

  /** Mapped from: BlogPost.view_count */
  @Column()
  viewCount: number;

  /** Mapped from: BlogPost.is_featured */
  @Column()
  isFeatured: boolean;

  /** Mapped from: BlogPost.meta_title */
  @Column({ nullable: true })
  metaTitle: string | null;

  /** Mapped from: BlogPost.meta_description */
  @Column({ nullable: true })
  metaDescription: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
