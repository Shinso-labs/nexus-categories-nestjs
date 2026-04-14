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

  /**
   * Get paginated list of blog posts for admin dashboard
   * Source: AdminBlogController.index
   */
  async getAdminBlogPosts(page?: number | null, perPage?: number | null, status?: string | null, search?: string | null): Promise<any> {
    const currentPage = page && page >= 1 ? page : 1;
    const limit = perPage && perPage >= 1 && perPage <= 100 ? perPage : 20;
    const offset = (currentPage - 1) * limit;

    const queryBuilder = this.repository.createQueryBuilder('p')
      .leftJoin('users', 'u', 'p.authorId = u.id')
      .leftJoin('categories', 'c', 'p.categoryId = c.id')
      .select([
        'p.id',
        'p.title',
        'p.slug',
        'p.excerpt',
        'p.status',
        'p.featuredImage',
        'p.authorId',
        'p.categoryId',
        'p.createdAt',
        'p.updatedAt',
        "CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as author_name",
        'c.name as category_name'
      ]);

    if (status && ['draft', 'published'].includes(status)) {
      queryBuilder.andWhere('p.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere('(p.title LIKE :search OR p.content LIKE :search)', { 
        search: `%${search}%` 
      });
    }

    const [items, total] = await Promise.all([
      queryBuilder
        .orderBy('p.createdAt', 'DESC')
        .limit(limit)
        .offset(offset)
        .getRawMany(),
      queryBuilder.getCount()
    ]);

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
      pagination: {
        total,
        page: currentPage,
        perPage: limit,
        totalPages: Math.ceil(total / limit)
      }
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
      .leftJoin('seo_metadata', 's', "s.entity_type = 'post' AND s.entity_id = p.id")
      .select([
        'p.*',
        "CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as author_name",
        'c.name as category_name',
        's.meta_title',
        's.meta_description',
        's.noindex'
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

    // Allow custom slug override
    if (body.slug && body.slug.trim()) {
      slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
      const existingCustomSlug = await this.repository.createQueryBuilder()
        .where('slug = :slug', { slug })
        .getCount();
      if (existingCustomSlug > 0) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    const content = body.content || ''; // TODO: implement HtmlSanitizer.sanitizeCms
    const excerpt = (body.excerpt || '').trim();
    const status = ['draft', 'published'].includes(body.status) ? body.status : 'draft';
    const featuredImage = body.featured_image || null;
    const categoryId = body.category_id ? parseInt(body.category_id) : null;
    const authorId = body.author_id || 1; // TODO: get from authenticated admin

    const post = this.repository.create({
      authorId,
      title,
      slug,
      content,
      excerpt,
      status,
      featuredImage,
      categoryId,
      isFeatured: false,
      viewCount: 0
    });

    const savedPost = await this.repository.save(post);

    // TODO: Save SEO metadata if provided
    const metaTitle = (body.meta_title || '').trim();
    const metaDescription = (body.meta_description || '').trim();
    const noindex = !!body.noindex;
    if (metaTitle || metaDescription || noindex) {
      // TODO: implement SEO metadata save
    }

    // TODO: add activity logging
    // ActivityLog::create(['user_id' => $adminId, 'action' => 'admin_create_blog_post', 'details' => "Created blog post #{$newId}: {$title}"]);

    return {
      data: {
        id: savedPost.id,
        title: savedPost.title,
        slug: savedPost.slug,
        status: savedPost.status,
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

    if (body.title && body.title.trim()) {
      updates.title = body.title.trim();

      // Auto-generate slug from title if no explicit slug provided
      if (!body.slug) {
        const newSlug = body.title.trim().toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
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
    if (body.slug && body.slug.trim()) {
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
      updates.content = body.content || ''; // TODO: implement HtmlSanitizer.sanitizeCms
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

    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    await this.repository.update(id, updates);

    // TODO: Update SEO metadata if provided
    if (body.hasOwnProperty('meta_title') || body.hasOwnProperty('meta_description') || body.hasOwnProperty('noindex')) {
      // TODO: implement SEO metadata update
    }

    // TODO: add activity logging
    // ActivityLog::create(['user_id' => $adminId, 'action' => 'admin_update_blog_post', 'details' => "Updated blog post #{$id}: " . ($data['title'] ?? $post->title)]);

    // Return updated post
    return this.getAdminBlogPost(id);
  }

  /**
   * Delete blog post
   * Source: AdminBlogController.destroy
   */
  async deleteBlogPost(id: number): Promise<any> {
    const post = await this.repository.findOne({ 
      where: { id },
      select: ['id', 'title']
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    await this.repository.delete(id);

    // TODO: add activity logging
    // ActivityLog::create(['user_id' => $adminId, 'action' => 'admin_delete_blog_post', 'details' => "Deleted blog post #{$id}: {$post->title}"]);

    return {
      data: {
        deleted: true,
        id: id
      }
    };
  }

  /**
   * Toggle blog post status between published and draft
   * Source: AdminBlogController.toggleStatus
   */
  async togglePostStatus(id: number): Promise<any> {
    const post = await this.repository.findOne({ 
      where: { id },
      select: ['id', 'title', 'status']
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const newStatus = post.status === 'published' ? 'draft' : 'published';

    await this.repository.update(id, { 
      status: newStatus,
      publishedAt: newStatus === 'published' ? Date.now() : post.publishedAt
    });

    // TODO: add activity logging
    // ActivityLog::create(['user_id' => $adminId, 'action' => 'admin_toggle_blog_status', 'details' => "Changed blog post #{$id} status: {$post->status} -> {$newStatus}"]);

    return {
      data: {
        id: id,
        status: newStatus,
      }
    };
  }

  /**
   * Delete multiple blog posts in bulk
   * Source: AdminBlogController.bulkDelete
   */
  async bulkDeletePosts(postIds?: number[]): Promise<any> {
    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      throw new BadRequestException('Bulk post IDs are required');
    }

    const uniqueIds = [...new Set(postIds.filter(id => parseInt(id.toString()) > 0))];
    
    if (uniqueIds.length === 0) {
      throw new BadRequestException('Valid post IDs are required');
    }

    if (uniqueIds.length > 100) {
      throw new BadRequestException('Too many posts selected. Maximum 100 allowed.');
    }

    // Get eligible posts
    const eligiblePosts = await this.repository.createQueryBuilder()
      .select(['id'])
      .where('id IN (:...ids)', { ids: uniqueIds })
      .getRawMany();

    const eligibleIds = eligiblePosts.map(p => parseInt(p.id));
    const skippedIds = uniqueIds.filter(id => !eligibleIds.includes(id));

    let success = 0;
    let failed = skippedIds.length;
    let touchedIds: number[] = [];

    if (eligibleIds.length > 0) {
      try {
        const result = await this.repository.delete(eligibleIds);
        success = result.affected || 0;
        touchedIds = eligibleIds;
      } catch (error) {
        failed += eligibleIds.length;
        skippedIds.push(...eligibleIds);
      }
    }

    // TODO: add activity logging
    // ActivityLog::create(['user_id' => $adminId, 'action' => 'admin_bulk_delete_blog_posts', 'details' => "Bulk deleted {$success} blog posts"]);

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
    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      throw new BadRequestException('Bulk post IDs are required');
    }

    const uniqueIds = [...new Set(postIds.filter(id => parseInt(id.toString()) > 0))];
    
    if (uniqueIds.length === 0) {
      throw new BadRequestException('Valid post IDs are required');
    }

    if (uniqueIds.length > 100) {
      throw new BadRequestException('Too many posts selected. Maximum 100 allowed.');
    }

    // Get eligible posts
    const eligiblePosts = await this.repository.createQueryBuilder()
      .select(['id', 'status'])
      .where('id IN (:...ids)', { ids: uniqueIds })
      .getRawMany();

    const existingIds = eligiblePosts.map(p => parseInt(p.id));
    let skippedIds = uniqueIds.filter(id => !existingIds.includes(id));

    const toPublish = eligiblePosts
      .filter(p => p.status !== 'published')
      .map(p => parseInt(p.id));

    // Add already published posts to skipped
    eligiblePosts
      .filter(p => p.status === 'published')
      .forEach(p => skippedIds.push(parseInt(p.id)));

    let success = 0;
    let failed = uniqueIds.length - existingIds.length;
    let touchedIds: number[] = [];

    if (toPublish.length > 0) {
      try {
        const result = await this.repository.createQueryBuilder()
          .update()
          .set({ 
            status: 'published',
            publishedAt: () => 'COALESCE(published_at, EXTRACT(EPOCH FROM NOW()) * 1000)'
          })
          .where('id IN (:...ids)', { ids: toPublish })
          .execute();
        
        success = result.affected || 0;
        touchedIds = toPublish;
      } catch (error) {
        failed += toPublish.length;
        skippedIds.push(...toPublish);
      }
    }

    // TODO: add activity logging
    // ActivityLog::create(['user_id' => $adminId, 'action' => 'admin_bulk_publish_blog_posts', 'details' => "Bulk published {$success} blog posts"]);

    return {
      data: {
        success,
        failed,
        skipped_ids: skippedIds,
      }
    };
  }
}