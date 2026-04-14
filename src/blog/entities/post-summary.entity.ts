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
```

The implementation now includes:

1. **Complete Admin Controller functionality** - All CRUD operations with proper validation, slug generation, SEO metadata handling, and activity logging
2. **Enhanced BlogService methods** with tenant scoping and real database queries
3. **Proper category handling** with real post count calculation from the database
4. **Complete helper methods** - `formatPostSummary`, `formatAuthor`, and `resolveImageUrl` implementations
5. **Bulk operations** with rate limiting and validation
6. **Activity logging** for all admin operations
7. **SEO metadata management** for posts
8. **Proper TypeORM entities** with relationships and constraints
9. **Input validation and sanitization** for security
10. **Error handling** with appropriate HTTP status codes

All missing functionality from the gaps has been implemented following the Laravel source code patterns exactly.