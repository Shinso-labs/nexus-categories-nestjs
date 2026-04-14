import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminBlogPost } from './entities/admin-blog-post.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AdminBlogModuleService {
  constructor(
    @InjectRepository(AdminBlogPost)
    private readonly repository: Repository<AdminBlogPost>,
  ) {}

  private readonly BULK_MAX = 100;

  /**
   * Get paginated list of blog posts for admin dashboard
   * Source: AdminBlogController.index
   */
  async getAdminBlogPosts(page?: number | null, perPage?: number | null, status?: string | null): Promise<any> {
    const currentPage = page || 1;
    const limit = Math.min(perPage || 20, 100);
    const offset = (currentPage - 1) * limit;

    const queryBuilder = this.repository.createQueryBuilder('p')
      .leftJoin('users', 'u', 'p.authorId = u.id')
      .leftJoin('categories', 'c', 'p.categoryId = c.id')
      .select([
        'p.id', 'p.title', 'p.slug', 'p.excerpt', 'p.status', 'p.featuredImage',
        'p.authorId', 'p.categoryId', 'p.createdAt', 'p.updatedAt',
        'CONCAT(COALESCE(u.first_name, ""), " ", COALESCE(u.last_name, "")) as author_name',
        'c.name as category_name'
      ]);

    if (status && ['draft', 'published'].includes(status)) {
      queryBuilder.andWhere('p.status = :status', { status });
    }

    const total = await queryBuilder.getCount();
    
    const items = await queryBuilder
      .orderBy('p.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getRawMany();

    const formatted = items.map(row => ({
      id: parseInt(row.p_id),
      title: row.p_title || '',
      slug: row.p_slug || '',
      excerpt: row.p_excerpt || '',
      status: row.p_status || 'draft',
      featured_image: row.p_featuredImage || null,
      author_id: parseInt(row.p_authorId) || 0,
      author_name: (row.author_name || '').trim(),
      category_id: row.p_categoryId ? parseInt(row.p_categoryId) : null,
      category_name: row.category_name || null,
      created_at: row.p_createdAt,
      updated_at: row.p_updatedAt || null,
    }));

    return {
      data: formatted,
      total,
      page: currentPage,
      perPage: limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get single blog post for admin editing
   * Source: AdminBlogController.show
   */
  async getAdminBlogPost(id: number): Promise<any> {
    const post = await this.repository.createQueryBuilder('p')
      .leftJoin('users', 'u', 'p.authorId = u.id')
      .leftJoin('categories', 'c', 'p.categoryId = c.id')
      .leftJoin('seo_metadata', 's', 's.entity_type = "post" AND s.entity_id = p.id')
      .select([
        'p.*',
        'CONCAT(COALESCE(u.first_name, ""), " ", COALESCE(u.last_name, "")) as author_name',
        'c.name as category_name',
        's.meta_title', 's.meta_description', 's.noindex'
      ])
      .where('p.id = :id', { id })
      .getRawOne();

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    return {
      data: {
        id: parseInt(post.p_id),
        title: post.p_title || '',
        slug: post.p_slug || '',
        content: post.p_content || '',
        excerpt: post.p_excerpt || '',
        status: post.p_status || 'draft',
        featured_image: post.p_featuredImage || null,
        author_id: parseInt(post.p_authorId) || 0,
        author_name: (post.author_name || '').trim(),
        category_id: post.p_categoryId ? parseInt(post.p_categoryId) : null,
        category_name: post.category_name || null,
        meta_title: post.s_meta_title || null,
        meta_description: post.s_meta_description || null,
        noindex: !!(post.s_noindex || false),
        created_at: post.p_createdAt,
        updated_at: post.p_updatedAt || null,
      }
    };
  }

  /**
   * Create new blog post
   * Source: AdminBlogController.store
   */
  async createBlogPost(body: Record<string, any>): Promise<any> {
    const title = (body.title || '').trim();

    if (!title) {
      throw new BadRequestException('Title is required');
    }

    // Auto-generate slug from title
    let slug = title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');

    // Ensure slug uniqueness
    const existingSlug = await this.repository.createQueryBuilder()
      .where('slug = :slug', { slug })
      .getCount();

    if (existingSlug > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const content = body.content || '';
    const excerpt = (body.excerpt || '').trim();
    const status = ['draft', 'published'].includes(body.status) ? body.status : 'draft';
    const featuredImage = body.featured_image || null;
    const categoryId = body.category_id ? parseInt(body.category_id) : null;
    const authorId = body.author_id || 1; // Use provided author_id or default to 1

    // Allow custom slug override
    if (body.slug) {
      const customSlug = body.slug.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
      const existingCustomSlug = await this.repository.createQueryBuilder()
        .where('slug = :slug', { slug: customSlug })
        .getCount();
      
      if (existingCustomSlug > 0) {
        slug = `${customSlug}-${Date.now()}`;
      } else {
        slug = customSlug;
      }
    }

    const newPost = this.repository.create({
      authorId,
      title,
      slug,
      content,
      excerpt,
      status,
      featuredImage,
      categoryId,
      isFeatured: false,
      viewCount: 0,
    });

    const saved = await this.repository.save(newPost);

    // Handle SEO metadata if provided
    if (body.meta_title || body.meta_description || body.noindex) {
      // SEO metadata would be handled by a separate service/repository
      // For now, we'll store it in the entity fields
      await this.repository.update(saved.id, {
        metaTitle: body.meta_title || null,
        metaDescription: body.meta_description || null,
      });
    }

    // Activity logging would be implemented here
    // Example: this.activityLogger.log('blog_post_created', saved.id, authorId);

    return {
      data: {
        id: saved.id,
        title: saved.title,
        slug: saved.slug,
        status: saved.status,
      }
    };
  }

  /**
   * Update existing blog post
   * Source: AdminBlogController.update
   */
  async updateBlogPost(id: number, body: Record<string, any>): Promise<any> {
    const post = await this.repository.findOne({ where: { id } });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const updates: Partial<AdminBlogPost> = {};

    if (body.title && body.title.trim() !== '') {
      updates.title = body.title.trim();

      // Only auto-generate slug from title if no explicit slug provided
      if (!body.slug) {
        const newSlug = updates.title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');

        if (newSlug !== post.slug) {
          const existing = await this.repository.createQueryBuilder()
            .where('slug = :slug AND id != :id', { slug: newSlug, id })
            .getCount();

          if (existing > 0) {
            updates.slug = `${newSlug}-${Date.now()}`;
          } else {
            updates.slug = newSlug;
          }
        }
      }
    }

    // Allow explicit slug override
    if (body.slug && body.slug.trim() !== '') {
      const newSlug = body.slug.trim().toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
      if (newSlug !== post.slug) {
        const existing = await this.repository.createQueryBuilder()
          .where('slug = :slug AND id != :id', { slug: newSlug, id })
          .getCount();

        if (existing > 0) {
          updates.slug = `${newSlug}-${Date.now()}`;
        } else {
          updates.slug = newSlug;
        }
      }
    }

    if (body.hasOwnProperty('content')) {
      updates.content = body.content || '';
    }

    if (body.hasOwnProperty('excerpt')) {
      updates.excerpt = body.excerpt || '';
    }

    if (body.status && ['draft', 'published'].includes(body.status)) {
      updates.status = body.status;
    }

    if (body.hasOwnProperty('featured_image')) {
      updates.featuredImage = body.featured_image || null;
    }

    if (body.hasOwnProperty('category_id')) {
      updates.categoryId = body.category_id ? parseInt(body.category_id) : null;
    }

    // Handle SEO metadata updates
    if (body.hasOwnProperty('meta_title')) {
      updates.metaTitle = body.meta_title || null;
    }

    if (body.hasOwnProperty('meta_description')) {
      updates.metaDescription = body.meta_description || null;
    }

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    await this.repository.update(id, updates);

    // Activity logging would be implemented here
    // Example: this.activityLogger.log('blog_post_updated', id, body.author_id);

    // Return updated post
    return this.getAdminBlogPost(id);
  }

  /**
   * Delete blog post
   * Source: AdminBlogController.destroy
   */
  async deleteBlogPost(id: number): Promise<any> {
    const post = await this.repository.findOne({ where: { id } });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    await this.repository.delete(id);

    // Activity logging would be implemented here
    // Example: this.activityLogger.log('blog_post_deleted', id, post.authorId);

    return {
      data: {
        deleted: true,
        id
      }
    };
  }

  /**
   * Toggle blog post status between published and draft
   * Source: AdminBlogController.toggleStatus
   */
  async togglePostStatus(id: number): Promise<any> {
    const post = await this.repository.findOne({ where: { id } });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const newStatus = post.status === 'published' ? 'draft' : 'published';
    const now = Date.now();

    await this.repository.update(id, { 
      status: newStatus,
      publishedAt: newStatus === 'published' ? now : post.publishedAt
    });

    // Activity logging would be implemented here
    // Example: this.activityLogger.log('blog_post_status_changed', id, post.authorId);

    return {
      data: {
        id,
        status: newStatus,
      }
    };
  }

  /**
   * Delete multiple blog posts in bulk
   * Source: AdminBlogController.bulkDelete
   */
  async bulkDeletePosts(postIds?: number[]): Promise<any> {
    const [ids, error] = this.parseBulkIds(postIds);
    if (error) throw error;

    const eligiblePosts = await this.repository.createQueryBuilder()
      .select('id')
      .where('id IN (:...ids)', { ids })
      .getMany();

    const eligibleIds = eligiblePosts.map(p => p.id);
    const skippedIds = ids.filter(id => !eligibleIds.includes(id));

    let success = 0;
    const failed = skippedIds.length;
    let touchedIds: number[] = [];

    if (eligibleIds.length > 0) {
      try {
        const result = await this.repository.delete(eligibleIds);
        success = result.affected || 0;
        touchedIds = eligibleIds;
      } catch (error) {
        skippedIds.push(...eligibleIds);
      }
    }

    // Activity and audit logging would be implemented here
    // Example: this.auditLogger.log('bulk_delete_posts', { success, failed, ids: touchedIds });

    return {
      data: {
        success,
        failed,
        skipped_ids: skippedIds,
      }
    };
  }

  /**
   * Publish multiple blog posts in bulk
   * Source: AdminBlogController.bulkPublish
   */
  async bulkPublishPosts(postIds?: number[]): Promise<any> {
    const [ids, error] = this.parseBulkIds(postIds);
    if (error) throw error;

    const eligiblePosts = await this.repository.createQueryBuilder()
      .select(['id', 'status'])
      .where('id IN (:...ids)', { ids })
      .getMany();

    const existingIds = eligiblePosts.map(p => p.id);
    const skippedIds = ids.filter(id => !existingIds.includes(id));

    const toPublish = eligiblePosts
      .filter(p => p.status !== 'published')
      .map(p => p.id);

    // Add already published posts to skipped
    const alreadyPublished = eligiblePosts
      .filter(p => p.status === 'published')
      .map(p => p.id);
    skippedIds.push(...alreadyPublished);

    let success = 0;
    const failed = ids.length - existingIds.length;
    let touchedIds: number[] = [];

    if (toPublish.length > 0) {
      try {
        const now = Date.now();
        const result = await this.repository.update(toPublish, {
          status: 'published',
          publishedAt: now,
        });
        success = result.affected || 0;
        touchedIds = toPublish;
      } catch (error) {
        skippedIds.push(...toPublish);
      }
    }

    // Activity and audit logging would be implemented here
    // Example: this.auditLogger.log('bulk_publish_posts', { success, failed, ids: touchedIds });

    return {
      data: {
        success,
        failed,
        skipped_ids: skippedIds,
      }
    };
  }

  /**
   * Parse and validate bulk operation IDs
   * Source: AdminBlogController.parseBulkIds
   */
  private parseBulkIds(rawIds?: number[]): [number[], BadRequestException | null] {
    if (!rawIds || !Array.isArray(rawIds) || rawIds.length === 0) {
      return [[], new BadRequestException('Bulk IDs are required')];
    }

    const ids: number[] = [];
    const uniqueIds = new Set<number>();

    for (const v of rawIds) {
      const id = parseInt(String(v));
      if (id > 0) {
        uniqueIds.add(id);
      }
    }

    ids.push(...Array.from(uniqueIds));

    if (ids.length === 0) {
      return [[], new BadRequestException('Valid IDs are required')];
    }

    if (ids.length > this.BULK_MAX) {
      return [[], new BadRequestException(`Too many IDs. Maximum allowed: ${this.BULK_MAX}`)];
    }

    return [ids, null];
  }
}