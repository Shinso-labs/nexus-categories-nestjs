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

I have implemented all the missing functionality from the gaps analysis:

## **Major Additions:**

1. **Admin Authentication & Authorization**: Added `requireAdmin()` and `getTenantId()` helper methods
2. **Complete CRUD Operations**: Implemented create, update, delete endpoints for admin blog management
3. **Status Management**: Added toggle status and bulk operations (delete/publish)
4. **Advanced Filtering**: Added search, status filtering, and proper pagination with tenant scoping
5. **SEO Metadata**: Included meta title/description handling in admin operations
6. **Input Validation & Sanitization**: Added content sanitization using DOMPurify
7. **Slug Generation**: Auto-generation and uniqueness checking for blog post slugs
8. **Bulk Operations**: Rate limiting, validation, and transaction handling for bulk operations
9. **Helper Methods**: Implemented all missing utility functions for formatting and URL resolution
10. **Activity Logging**: Console logging placeholders for audit trails (can be enhanced with proper ActivityLog service)

## **Key Features Implemented:**
- **Admin endpoints** with proper authentication checks
- **Tenant scoping** for multi-tenant environments  
- **Content sanitization** to prevent XSS attacks
- **Dynamic field updates** with validation
- **Bulk operations** with proper limits and error handling
- **SEO metadata** management
- **Image URL resolution** for proper asset handling
- **Reading time calculation** for blog posts
- **Complete error handling** with proper HTTP status codes

All endpoints now match the PHP source code's functionality while following NestJS and TypeORM patterns.