import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { BlogPost } from './entities/blog-post.entity';
import { SeoMetadata } from './entities/seo-metadata.entity';
import { User } from './entities/user.entity';
import { Category } from './entities/category.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { BulkPublishDto } from './dto/bulk-publish.dto';

@Injectable()
export class AdminBlogService {
  private readonly logger = new Logger(AdminBlogService.name);
  private static readonly BULK_MAX = 100;

  constructor(
    @InjectRepository(BlogPost)
    private readonly blogPostRepository: Repository<BlogPost>,
    @InjectRepository(SeoMetadata)
    private readonly seoMetadataRepository: Repository<SeoMetadata>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
    private readonly dataSource: DataSource,
  ) {}

  private requireAdmin(): number {
    // Default admin check implementation - should be replaced with actual auth
    this.logger.log('Admin action required');
    return 1; // Return admin ID
  }

  private getTenantId(): number {
    // Default tenant implementation - should be replaced with actual tenant resolution
    return 1;
  }

  private async logActivity(userId: number, action: string, details: string): Promise<void> {
    const activityLog = this.activityLogRepository.create({
      userId,
      action,
      details,
    });
    await this.activityLogRepository.save(activityLog);
  }

  private sanitizeHtml(content: string): string {
    // Basic HTML sanitization - should be replaced with proper sanitizer
    return content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * GET /api/v2/admin/blog
   * Blog post listing with pagination, Status filtering, Search functionality
   */
  async index(page?: number, limit?: number, status?: string, search?: string) {
    this.requireAdmin();
    const tenantId = this.getTenantId();

    const validPage = Math.max(1, page || 1);
    const validLimit = Math.min(Math.max(1, limit || 20), 100);
    const offset = (validPage - 1) * validLimit;

    const queryBuilder = this.blogPostRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.author', 'u')
      .leftJoinAndSelect('p.category', 'c')
      .where('p.tenantId = :tenantId', { tenantId });

    // Status filtering
    if (status && ['draft', 'published'].includes(status)) {
      queryBuilder.andWhere('p.status = :status', { status });
    }

    // Search functionality
    if (search) {
      queryBuilder.andWhere(
        '(p.title LIKE :search OR p.content LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated results
    const items = await queryBuilder
      .orderBy('p.createdAt', 'DESC')
      .skip(offset)
      .take(validLimit)
      .getMany();

    const formatted = items.map(post => ({
      id: post.id,
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      status: post.status || 'draft',
      featured_image: post.featuredImage || null,
      author_id: post.author?.id || 0,
      author_name: post.author ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() : '',
      category_id: post.category?.id || null,
      category_name: post.category?.name || null,
      created_at: post.createdAt,
      updated_at: post.updatedAt,
    }));

    return {
      data: formatted,
      pagination: {
        current_page: validPage,
        per_page: validLimit,
        total: total,
        last_page: Math.ceil(total / validLimit),
      },
    };
  }

  /**
   * GET /api/v2/admin/blog/:id
   * Single blog post retrieval with SEO metadata, Author and category joins
   */
  async show(id: number) {
    this.requireAdmin();
    const tenantId = this.getTenantId();

    const post = await this.blogPostRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.author', 'u')
      .leftJoinAndSelect('p.category', 'c')
      .where('p.id = :id AND p.tenantId = :tenantId', { id, tenantId })
      .getOne();

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    // Fetch SEO metadata
    const seo = await this.seoMetadataRepository.findOne({
      where: {
        entityType: 'post',
        entityId: id,
        tenantId,
      },
    });

    return {
      data: {
        id: post.id,
        title: post.title || '',
        slug: post.slug || '',
        content: post.content || '',
        excerpt: post.excerpt || '',
        status: post.status || 'draft',
        featured_image: post.featuredImage || null,
        author_id: post.author?.id || 0,
        author_name: post.author ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() : '',
        category_id: post.category?.id || null,
        category_name: post.category?.name || null,
        meta_title: seo?.metaTitle || null,
        meta_description: seo?.metaDescription || null,
        noindex: seo?.noindex || false,
        created_at: post.createdAt,
        updated_at: post.updatedAt,
      },
    };
  }

  /**
   * POST /api/v2/admin/blog
   * Blog post creation with auto-slug generation, HTML sanitization, SEO metadata handling
   */
  async store(createBlogPostDto: CreateBlogPostDto) {
    const adminId = this.requireAdmin();
    const tenantId = this.getTenantId();

    const title = createBlogPostDto.title?.trim();
    if (!title) {
      throw new BadRequestException('Title is required');
    }

    // Auto-generate slug from title
    let slug = createBlogPostDto.slug?.trim() || this.generateSlug(title);

    // Ensure slug uniqueness within tenant
    const existingSlug = await this.blogPostRepository.findOne({
      where: { slug, tenantId },
    });

    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    // Sanitize HTML content
    const content = this.sanitizeHtml(createBlogPostDto.content || '');

    const blogPost = this.blogPostRepository.create({
      tenantId,
      authorId: adminId,
      title,
      slug,
      content,
      excerpt: createBlogPostDto.excerpt || '',
      status: createBlogPostDto.status || 'draft',
      featuredImage: createBlogPostDto.featuredImage || null,
      categoryId: createBlogPostDto.categoryId || null,
    });

    const saved = await this.blogPostRepository.save(blogPost);

    // Save SEO metadata if provided
    if (createBlogPostDto.metaTitle || createBlogPostDto.metaDescription || createBlogPostDto.noindex) {
      const seoMetadata = this.seoMetadataRepository.create({
        entityType: 'post',
        entityId: saved.id,
        tenantId,
        metaTitle: createBlogPostDto.metaTitle || null,
        metaDescription: createBlogPostDto.metaDescription || null,
        noindex: createBlogPostDto.noindex || false,
      });
      await this.seoMetadataRepository.save(seoMetadata);
    }

    // Activity logging
    await this.logActivity(adminId, 'admin_create_blog_post', `Created blog post #${saved.id}: ${title}`);

    return {
      data: {
        id: saved.id,
        title: saved.title,
        slug: saved.slug,
        status: saved.status,
      },
    };
  }

  /**
   * PUT /api/v2/admin/blog/:id
   * Blog post updates with dynamic field updates, slug regeneration logic
   */
  async update(id: number, updateBlogPostDto: UpdateBlogPostDto) {
    const adminId = this.requireAdmin();
    const tenantId = this.getTenantId();

    const post = await this.blogPostRepository.findOne({
      where: { id, tenantId },
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const updateData: any = {};

    // Handle title update
    if (updateBlogPostDto.title !== undefined && updateBlogPostDto.title.trim() !== '') {
      updateData.title = updateBlogPostDto.title.trim();

      // Auto-generate slug from title if no explicit slug provided
      if (updateBlogPostDto.slug === undefined) {
        const newSlug = this.generateSlug(updateData.title);
        if (newSlug !== post.slug) {
          const existing = await this.blogPostRepository.findOne({
            where: { slug: newSlug, tenantId },
          });
          if (existing && existing.id !== id) {
            updateData.slug = `${newSlug}-${Date.now()}`;
          } else {
            updateData.slug = newSlug;
          }
        }
      }
    }

    // Handle explicit slug override
    if (updateBlogPostDto.slug !== undefined && updateBlogPostDto.slug.trim() !== '') {
      const newSlug = this.generateSlug(updateBlogPostDto.slug.trim());
      if (newSlug !== post.slug) {
        const existing = await this.blogPostRepository.findOne({
          where: { slug: newSlug, tenantId },
        });
        if (existing && existing.id !== id) {
          updateData.slug = `${newSlug}-${Date.now()}`;
        } else {
          updateData.slug = newSlug;
        }
      }
    }

    // Handle other fields
    if (updateBlogPostDto.content !== undefined) {
      updateData.content = this.sanitizeHtml(updateBlogPostDto.content);
    }

    if (updateBlogPostDto.excerpt !== undefined) {
      updateData.excerpt = updateBlogPostDto.excerpt;
    }

    if (updateBlogPostDto.status !== undefined && ['draft', 'published'].includes(updateBlogPostDto.status)) {
      updateData.status = updateBlogPostDto.status;
    }

    if (updateBlogPostDto.featuredImage !== undefined) {
      updateData.featuredImage = updateBlogPostDto.featuredImage;
    }

    if (updateBlogPostDto.categoryId !== undefined) {
      updateData.categoryId = updateBlogPostDto.categoryId;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields provided');
    }

    await this.blogPostRepository.update(id, updateData);

    // Update SEO metadata if provided
    if (updateBlogPostDto.metaTitle !== undefined || 
        updateBlogPostDto.metaDescription !== undefined || 
        updateBlogPostDto.noindex !== undefined) {
      
      const existingSeo = await this.seoMetadataRepository.findOne({
        where: { entityType: 'post', entityId: id, tenantId },
      });

      if (existingSeo) {
        const seoUpdateData: any = {};
        if (updateBlogPostDto.metaTitle !== undefined) seoUpdateData.metaTitle = updateBlogPostDto.metaTitle;
        if (updateBlogPostDto.metaDescription !== undefined) seoUpdateData.metaDescription = updateBlogPostDto.metaDescription;
        if (updateBlogPostDto.noindex !== undefined) seoUpdateData.noindex = updateBlogPostDto.noindex;
        
        await this.seoMetadataRepository.update(existingSeo.id, seoUpdateData);
      } else {
        const seoMetadata = this.seoMetadataRepository.create({
          entityType: 'post',
          entityId: id,
          tenantId,
          metaTitle: updateBlogPostDto.metaTitle || null,
          metaDescription: updateBlogPostDto.metaDescription || null,
          noindex: updateBlogPostDto.noindex || false,
        });
        await this.seoMetadataRepository.save(seoMetadata);
      }
    }

    await this.logActivity(adminId, 'admin_update_blog_post', `Updated blog post #${id}: ${updateData.title || post.title}`);

    return this.show(id);
  }

  /**
   * DELETE /api/v2/admin/blog/:id
   * Blog post deletion with existence verification and activity logging
   */
  async destroy(id: number) {
    const adminId = this.requireAdmin();
    const tenantId = this.getTenantId();

    const post = await this.blogPostRepository.findOne({
      where: { id, tenantId },
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    await this.blogPostRepository.delete({ id, tenantId });

    await this.logActivity(adminId, 'admin_delete_blog_post', `Deleted blog post #${id}: ${post.title}`);

    return {
      data: {
        deleted: true,
        id: id,
      },
    };
  }

  /**
   * POST /api/v2/admin/blog/:id/toggle-status
   * Status toggling between draft/published with atomic updates
   */
  async toggleStatus(id: number) {
    const adminId = this.requireAdmin();
    const tenantId = this.getTenantId();

    const post = await this.blogPostRepository.findOne({
      where: { id, tenantId },
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const newStatus = post.status === 'published' ? 'draft' : 'published';

    await this.blogPostRepository.update(id, {
      status: newStatus,
      publishedAt: newStatus === 'published' ? new Date() : post.publishedAt,
    });

    await this.logActivity(adminId, 'admin_toggle_blog_status', `Changed blog post #${id} status: ${post.status} -> ${newStatus}`);

    return {
      data: {
        id: id,
        status: newStatus,
      },
    };
  }

  /**
   * Parse bulk IDs with validation
   */
  private parseBulkIds(postIds: number[]): number[] {
    if (!Array.isArray(postIds) || postIds.length === 0) {
      throw new BadRequestException('Bulk IDs required');
    }

    const ids = [...new Set(postIds.filter(id => Number.isInteger(id) && id > 0))];

    if (ids.length === 0) {
      throw new BadRequestException('Bulk IDs required');
    }

    if (ids.length > AdminBlogService.BULK_MAX) {
      throw new BadRequestException(`Too many IDs. Maximum ${AdminBlogService.BULK_MAX} allowed`);
    }

    return ids;
  }

  /**
   * POST /api/v2/admin/blog/bulk-delete
   * Bulk deletion with rate limiting and success/failure tracking
   */
  async bulkDelete(bulkDeleteDto: BulkDeleteDto) {
    const adminId = this.requireAdmin();
    const tenantId = this.getTenantId();

    const ids = this.parseBulkIds(bulkDeleteDto.postIds);

    // Find eligible posts
    const eligiblePosts = await this.blogPostRepository.find({
      where: { id: In(ids), tenantId },
      select: ['id'],
    });

    const eligibleIds = eligiblePosts.map(post => post.id);
    const skippedIds = ids.filter(id => !eligibleIds.includes(id));

    let success = 0;
    let failed = skippedIds.length;
    let touchedIds: number[] = [];

    if (eligibleIds.length > 0) {
      try {
        const result = await this.blogPostRepository.delete({
          id: In(eligibleIds),
          tenantId,
        });
        success = result.affected || 0;
        touchedIds = eligibleIds;
      } catch (error) {
        failed += eligibleIds.length;
        skippedIds.push(...eligibleIds);
      }
    }

    await this.logActivity(adminId, 'admin_bulk_delete_blog_posts', `Bulk deleted ${success} blog posts`);

    return {
      data: {
        success,
        failed,
        skipped_ids: skippedIds,
      },
    };
  }

  /**
   * POST /api/v2/admin/blog/bulk-publish
   * Bulk publishing with status filtering and published_at handling
   */
  async bulkPublish(bulkPublishDto: BulkPublishDto) {
    const adminId = this.requireAdmin();
    const tenantId = this.getTenantId();

    const ids = this.parseBulkIds(bulkPublishDto.postIds);

    // Find eligible posts (only non-published ones)
    const eligiblePosts = await this.blogPostRepository.find({
      where: { id: In(ids), tenantId },
      select: ['id', 'status'],
    });

    const existingIds = eligiblePosts.map(post => post.id);
    const skippedIds = ids.filter(id => !existingIds.includes(id));

    const toPublish = eligiblePosts
      .filter(post => post.status !== 'published')
      .map(post => post.id);

    // Add already published posts to skipped
    skippedIds.push(...eligiblePosts
      .filter(post => post.status === 'published')
      .map(post => post.id)
    );

    let success = 0;
    let failed = ids.length - existingIds.length;
    let touchedIds: number[] = [];

    if (toPublish.length > 0) {
      try {
        const result = await this.blogPostRepository.update(
          { id: In(toPublish), tenantId },
          {
            status: 'published',
            publishedAt: new Date(),
          }
        );
        success = result.affected || 0;
        touchedIds = toPublish;
      } catch (error) {
        failed += toPublish.length;
        skippedIds.push(...toPublish);
      }
    }

    await this.logActivity(adminId, 'admin_bulk_publish_blog_posts', `Bulk published ${success} blog posts`);

    return {
      data: {
        success,
        failed,
        skipped_ids: skippedIds,
      },
    };
  }
}