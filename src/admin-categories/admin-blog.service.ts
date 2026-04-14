import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { BlogPost } from './entities/blog-post.entity';
import { SeoMetadata } from './entities/seo-metadata.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { HtmlSanitizer } from '../utils/html-sanitizer';
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/blog.dto';

export interface IndexParams {
  page: number;
  limit: number;
  status?: string;
  search?: string;
  adminId: number;
  tenantId: number;
}

@Injectable()
export class AdminBlogService {
  constructor(
    @InjectRepository(BlogPost)
    private readonly blogPostRepository: Repository<BlogPost>,
    @InjectRepository(SeoMetadata)
    private readonly seoMetadataRepository: Repository<SeoMetadata>,
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async index(params: IndexParams) {
    const { page, limit, status, search, tenantId } = params;
    const offset = (page - 1) * limit;

    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select([
        'p.id',
        'p.title',
        'p.slug', 
        'p.excerpt',
        'p.status',
        'p.featured_image',
        'p.author_id',
        'p.category_id',
        'p.created_at',
        'p.updated_at',
        `CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as author_name`,
        'c.name as category_name'
      ])
      .from('posts', 'p')
      .leftJoin('users', 'u', 'p.author_id = u.id')
      .leftJoin('categories', 'c', 'p.category_id = c.id')
      .where('p.tenant_id = :tenantId', { tenantId });

    if (status && ['draft', 'published'].includes(status)) {
      queryBuilder.andWhere('p.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere('(p.title LIKE :search OR p.content LIKE :search)', { 
        search: `%${search}%` 
      });
    }

    const totalQuery = queryBuilder.clone();
    const total = await totalQuery.getCount();

    const items = await queryBuilder
      .orderBy('p.created_at', 'DESC')
      .limit(limit)
      .offset(offset)
      .getRawMany();

    const formatted = items.map(row => ({
      id: parseInt(row.id),
      title: row.title || '',
      slug: row.slug || '',
      excerpt: row.excerpt || '',
      status: row.status || 'draft',
      featured_image: row.featured_image || null,
      author_id: parseInt(row.author_id || '0'),
      author_name: (row.author_name || '').trim(),
      category_id: row.category_id ? parseInt(row.category_id) : null,
      category_name: row.category_name || null,
      created_at: row.created_at,
      updated_at: row.updated_at || null,
    }));

    return {
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async show(id: number, tenantId: number) {
    const post = await this.dataSource
      .createQueryBuilder()
      .select([
        'p.*',
        `CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) as author_name`,
        'c.name as category_name'
      ])
      .from('posts', 'p')
      .leftJoin('users', 'u', 'p.author_id = u.id')
      .leftJoin('categories', 'c', 'p.category_id = c.id')
      .where('p.id = :id AND p.tenant_id = :tenantId', { id, tenantId })
      .getRawOne();

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    // Fetch SEO metadata
    const seo = await this.seoMetadataRepository.findOne({
      where: { 
        entityType: 'post', 
        entityId: id, 
        tenantId 
      }
    });

    return {
      data: {
        id: parseInt(post.id),
        title: post.title || '',
        slug: post.slug || '',
        content: post.content || '',
        excerpt: post.excerpt || '',
        status: post.status || 'draft',
        featured_image: post.featured_image || null,
        author_id: parseInt(post.author_id || '0'),
        author_name: (post.author_name || '').trim(),
        category_id: post.category_id ? parseInt(post.category_id) : null,
        category_name: post.category_name || null,
        meta_title: seo?.metaTitle || null,
        meta_description: seo?.metaDescription || null,
        noindex: seo?.noindex || false,
        created_at: post.created_at,
        updated_at: post.updated_at || null,
      }
    };
  }

  async store(data: CreateBlogPostDto, adminId: number, tenantId: number) {
    const title = (data.title || '').trim();
    
    if (!title) {
      throw new BadRequestException('Title is required');
    }

    // Auto-generate slug from title
    let slug = this.generateSlug(title);
    
    // Ensure slug uniqueness within tenant
    const existingSlug = await this.blogPostRepository.count({
      where: { slug, tenantId }
    });

    if (existingSlug > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    // Allow custom slug override
    if (data.slug) {
      const customSlug = this.generateSlug(data.slug);
      const existingCustomSlug = await this.blogPostRepository.count({
        where: { slug: customSlug, tenantId }
      });
      
      if (existingCustomSlug > 0) {
        slug = `${customSlug}-${Date.now()}`;
      } else {
        slug = customSlug;
      }
    }

    const content = HtmlSanitizer.sanitizeCms(data.content || '');
    const excerpt = (data.excerpt || '').trim();
    const status = ['draft', 'published'].includes(data.status || '') ? data.status : 'draft';

    const newPost = this.blogPostRepository.create({
      tenantId,
      authorId: adminId,
      title,
      slug,
      content,
      excerpt,
      status,
      featuredImage: data.featured_image || null,
      categoryId: data.category_id || null,
    });

    const saved = await this.blogPostRepository.save(newPost);

    // Save SEO metadata if provided
    if (data.meta_title || data.meta_description || data.noindex) {
      const seoData = this.seoMetadataRepository.create({
        entityType: 'post',
        entityId: saved.id,
        tenantId,
        metaTitle: data.meta_title || null,
        metaDescription: data.meta_description || null,
        noindex: data.noindex || false,
      });
      
      await this.seoMetadataRepository.save(seoData);
    }

    // Activity logging
    await this.logActivity(adminId, 'admin_create_blog_post', `Created blog post #${saved.id}: ${title}`);

    return {
      data: {
        id: saved.id,
        title: saved.title,
        slug: saved.slug,
        status: saved.status,
      }
    };
  }

  async update(id: number, data: UpdateBlogPostDto, adminId: number, tenantId: number) {
    // Verify post exists and belongs to tenant
    const post = await this.blogPostRepository.findOne({
      where: { id, tenantId }
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const updateData: Partial<BlogPost> = {};
    let hasChanges = false;

    if (data.title && data.title.trim() !== '') {
      updateData.title = data.title.trim();
      hasChanges = true;

      // Only auto-generate slug from title if no explicit slug provided
      if (!data.slug) {
        const newSlug = this.generateSlug(data.title);
        if (newSlug !== post.slug) {
          const existing = await this.blogPostRepository.count({
            where: { slug: newSlug, tenantId, id: In([id]) }
          });
          if (existing === 0) {
            const conflicting = await this.blogPostRepository.count({
              where: { slug: newSlug, tenantId }
            });
            updateData.slug = conflicting > 0 ? `${newSlug}-${Date.now()}` : newSlug;
          }
        }
      }
    }

    // Allow explicit slug override
    if (data.slug && data.slug.trim() !== '') {
      const newSlug = this.generateSlug(data.slug);
      if (newSlug !== post.slug) {
        const existing = await this.blogPostRepository.count({
          where: { slug: newSlug, tenantId, id: In([id]) }
        });
        if (existing === 0) {
          const conflicting = await this.blogPostRepository.count({
            where: { slug: newSlug, tenantId }
          });
          updateData.slug = conflicting > 0 ? `${newSlug}-${Date.now()}` : newSlug;
          hasChanges = true;
        }
      }
    }

    if ('content' in data) {
      updateData.content = HtmlSanitizer.sanitizeCms(data.content || '');
      hasChanges = true;
    }

    if ('excerpt' in data) {
      updateData.excerpt = data.excerpt || '';
      hasChanges = true;
    }

    if (data.status && ['draft', 'published'].includes(data.status)) {
      updateData.status = data.status;
      hasChanges = true;
    }

    if ('featured_image' in data) {
      updateData.featuredImage = data.featured_image || null;
      hasChanges = true;
    }

    if ('category_id' in data) {
      updateData.categoryId = data.category_id || null;
      hasChanges = true;
    }

    if (!hasChanges) {
      throw new BadRequestException('No fields provided for update');
    }

    await this.blogPostRepository.update(id, updateData);

    // Update SEO metadata if provided
    if ('meta_title' in data || 'meta_description' in data || 'noindex' in data) {
      await this.dataSource.query(`
        INSERT INTO seo_metadata (entity_type, entity_id, tenant_id, meta_title, meta_description, noindex, created_at, updated_at)
        VALUES ('post', ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
          meta_title = VALUES(meta_title), 
          meta_description = VALUES(meta_description), 
          noindex = VALUES(noindex), 
          updated_at = NOW()
      `, [
        id, 
        tenantId, 
        data.meta_title || null, 
        data.meta_description || null, 
        data.noindex ? 1 : 0
      ]);
    }

    await this.logActivity(adminId, 'admin_update_blog_post', `Updated blog post #${id}: ${data.title || post.title}`);

    // Return updated post
    return this.show(id, tenantId);
  }

  async destroy(id: number, adminId: number, tenantId: number) {
    const post = await this.blogPostRepository.findOne({
      where: { id, tenantId }
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    await this.blogPostRepository.delete({ id, tenantId });

    await this.logActivity(adminId, 'admin_delete_blog_post', `Deleted blog post #${id}: ${post.title}`);

    return {
      data: {
        deleted: true,
        id
      }
    };
  }

  async toggleStatus(id: number, adminId: number, tenantId: number) {
    const post = await this.blogPostRepository.findOne({
      where: { id, tenantId }
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const newStatus = post.status === 'published' ? 'draft' : 'published';
    
    await this.blogPostRepository.update(id, { 
      status: newStatus,
      publishedAt: newStatus === 'published' ? new Date() : post.publishedAt
    });

    await this.logActivity(adminId, 'admin_toggle_blog_status', `Changed blog post #${id} status: ${post.status} -> ${newStatus}`);

    return {
      data: {
        id,
        status: newStatus,
      }
    };
  }

  async bulkDelete(postIds: number[], adminId: number, tenantId: number): Promise<any> {
    if (!Array.isArray(postIds) || postIds.length === 0) {
      throw new BadRequestException('Post IDs are required');
    }

    const ids = [...new Set(postIds.filter(id => Number.isInteger(id) && id > 0))];
    
    if (ids.length === 0) {
      throw new BadRequestException('Valid post IDs are required');
    }

    if (ids.length > 100) {
      throw new BadRequestException('Too many IDs provided (max 100)');
    }

    // Get eligible posts
    const eligiblePosts = await this.blogPostRepository.find({
      where: { id: In(ids), tenantId },
      select: ['id']
    });

    const eligibleIds = eligiblePosts.map(p => p.id);
    const skippedIds = ids.filter(id => !eligibleIds.includes(id));

    let success = 0;
    const failed = skippedIds.length;

    if (eligibleIds.length > 0) {
      const deleteResult = await this.blogPostRepository.delete({ 
        id: In(eligibleIds), 
        tenantId 
      });
      success = deleteResult.affected || 0;
    }

    await this.logActivity(adminId, 'admin_bulk_delete_blog_posts', `Bulk deleted ${success} blog posts`);

    return {
      data: {
        success,
        failed,
        skipped_ids: skippedIds,
      }
    };
  }

  async bulkPublish(postIds: number[], adminId: number, tenantId: number): Promise<any> {
    if (!Array.isArray(postIds) || postIds.length === 0) {
      throw new BadRequestException('Post IDs are required');
    }

    const ids = [...new Set(postIds.filter(id => Number.isInteger(id) && id > 0))];
    
    if (ids.length === 0) {
      throw new BadRequestException('Valid post IDs are required');
    }

    if (ids.length > 100) {
      throw new BadRequestException('Too many IDs provided (max 100)');
    }

    // Get posts that exist and are not already published
    const posts = await this.blogPostRepository.find({
      where: { id: In(ids), tenantId },
      select: ['id', 'status']
    });

    const existingIds = posts.map(p => p.id);
    const toPublish = posts.filter(p => p.status !== 'published').map(p => p.id);
    const alreadyPublished = posts.filter(p => p.status === 'published').map(p => p.id);
    const skippedIds = [...ids.filter(id => !existingIds.includes(id)), ...alreadyPublished];

    let success = 0;
    const failed = ids.length - existingIds.length;

    if (toPublish.length > 0) {
      const updateResult = await this.blogPostRepository.update(
        { id: In(toPublish), tenantId }, 
        { 
          status: 'published', 
          publishedAt: () => 'COALESCE(published_at, NOW())' 
        }
      );
      success = updateResult.affected || 0;
    }

    await this.logActivity(adminId, 'admin_bulk_publish_blog_posts', `Bulk published ${success} blog posts`);

    return {
      data: {
        success,
        failed,
        skipped_ids: skippedIds,
      }
    };
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async logActivity(userId: number, action: string, details: string) {
    const activity = this.activityLogRepository.create({
      userId,
      action,
      details
    });
    await this.activityLogRepository.save(activity);
  }
}