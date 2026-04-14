import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * AdminBlogPost entity.
 * Source: Laravel Post model with admin-specific fields
 */
@Entity('admin_blog_posts')
export class AdminBlogPost {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mapped from: Post.tenant_id */
  @Column()
  tenantId: number;

  /** Mapped from: Post.title */
  @Column()
  title: string;

  /** Mapped from: Post.slug */
  @Column()
  slug: string;

  /** Mapped from: Post.content */
  @Column('text')
  content: string;

  /** Mapped from: Post.excerpt */
  @Column('text')
  excerpt: string;

  /** Mapped from: Post.featured_image */
  @Column({ nullable: true })
  featuredImage: string | null;

  /** Mapped from: Post.status */
  @Column({ default: 'draft' })
  status: string;

  /** Mapped from: Post.published_at */
  @Column({ nullable: true })
  publishedAt: number | null;

  /** Mapped from: Post.author_id */
  @Column()
  authorId: number;

  /** Mapped from: Post.category_id */
  @Column({ nullable: true })
  categoryId: number | null;

  /** Mapped from: Post.meta_title */
  @Column({ nullable: true })
  metaTitle: string | null;

  /** Mapped from: Post.meta_description */
  @Column({ nullable: true })
  metaDescription: string | null;

  /** Mapped from: Post.is_featured */
  @Column({ default: false })
  isFeatured: boolean;

  /** Mapped from: Post.view_count */
  @Column({ default: 0 })
  viewCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}