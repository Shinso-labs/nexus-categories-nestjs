import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AdminBlogPost } from './entities/admin-blog-post.entity';
import { SeoMetadata } from './entities/seo-metadata.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BaseApiController } from './base-api.controller';
import { AuditLogService } from './audit-log.service';
import { HtmlSanitizerService } from './html-sanitizer.service';

@Injectable()
export class AdminBlogModuleService {
  constructor(
    @InjectRepository(AdminBlogPost)
    private readonly repository: Repository<AdminBlogPost>,
    @InjectRepository(SeoMetadata)
    private readonly seoRepository: Repository<SeoMetadata>,
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
    private readonly dataSource: DataSource,
    private readonly baseApiController: BaseApiController,
    private readonly auditLogService: AuditLogService,
    private readonly htmlSanitizerService: HtmlSanitizerService,
  ) {}

  private readonly BULK_MAX = 100;

  /**
   * Get paginated list of blog posts for admin dashboard
   * Source: AdminBlogController.index
   */
  async getAdminBlogPosts(page?: number | null, perPage?: number | null, status?: string | null, search?: string | null, req?: any): Promise<any> {
    // Admin authentication and tenant validation
    const adminId = this.baseApiController.requireAdmin(req);
    const tenantId = this.baseApiController.getTenantId(req);

    const currentPage = Math.max(page || 1, 1);
    const limit = Math.min(Math.max(perPage || 20, 1), 100);
    const offset = (currentPage - 1) * limit;

    let queryBuilder = this.dataSource.createQueryBuilder()
      .select([
        'p.id', 'p.title', 'p.slug', 'p.excerpt', 'p.status', 'p.featured_image',
        'p.author_id', 'p.category_id', 'p.created_at', 'p.updated_at',
        'CONCAT(COALESCE(u.first_name, ""), " ", COALESCE(u.last_name, "")) as author_name',
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
      const searchTerm = `%${search}%`;
      queryBuilder.andWhere('(p.title LIKE :searchTerm OR p.content LIKE :searchTerm)', { searchTerm });
    }

    const totalQuery = queryBuilder.clone();
    const total = await totalQuery.getCount();

    const items = await queryBuilder
      .orderBy('p.created_at', 'DESC')
      .limit(limit)
      .offset(offset)
      .getRawMany();

    const formatted = items.map(row => ({
      id: parseInt(row.p_id),
      title: row.p_title || '',
      slug: row.p_slug || '',
      excerpt: row.p_excerpt || '',
      status: row.p_status || 'draft',
      featured_image: row.p_featured_image || null,
      author_id: parseInt(row.p_author_id) || 0,
      author_name: (row.author_name || '').trim(),
      category_id: row.p_category_id ? parseInt(row.p_category_id) : null,
      category_name: row.category_name || null,
      created_at: row.p_created_at,
      updated_at: row.p_updated_at || null,
    }));

    return this.baseApiController.respondWithPaginatedCollection(formatted, total, currentPage, limit);
  }

  /**
   * Get single blog post for admin editing
   * Source: AdminBlogController.show
   */
  async getAdminBlogPost(id: number, req?: any): Promise<any> {
    // Admin authentication and tenant validation
    const adminId = this.baseApiController.requireAdmin(req);
    const tenantId = this.baseApiController.getTenantId(req);

    const post = await this.dataSource.createQueryBuilder()
      .select([
        'p.*',
        'CONCAT(COALESCE(u.first_name, ""), " ", COALESCE(u.last_name, "")) as author_name',
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
    const seo = await this.seoRepository.findOne({
      where: { entityType: 'post', entityId: id, tenantId }
    });

    return this.baseApiController.respondWithData({
      id: parseInt(post.p_id),
      title: post.p_title || '',
      slug: post.p_slug || '',
      content: post.p_content || '',
      excerpt: post.p_excerpt || '',
      status: post.p_status || 'draft',
      featured_image: post.p_featured_image || null,
      author_id: parseInt(post.p_author_id) || 0,
      author_name: (post.author_name || '').trim(),
      category_id: post.p_category_id ? parseInt(post.p_category_id) : null,
      category_name: post.category_name || null,
      meta_title: seo?.metaTitle || null,
      meta_description: seo?.metaDescription || null,
      noindex: !!(seo?.noindex || false),
      created_at: post.p_created_at,
      updated_at: post.p_updated_at || null,
    });
  }

  /**
   * Create new blog post
   * Source: AdminBlogController.store
   */
  async createBlogPost(body: Record<string, any>, req?: any): Promise<any> {
    // Admin authentication and tenant validation
    const adminId = this.baseApiController.requireAdmin(req);
    const tenantId = this.baseApiController.getTenantId(req);

    const title = (body.title || '').trim();

    if (!title) {
      return this.baseApiController.respondWithError('VALIDATION_REQUIRED_FIELD', 'Title is required', 'title', 400);
    }

    // HTML content sanitization
    const content = this.htmlSanitizerService.sanitizeCms(body.content || '');
    
    // Auto-generate slug from title
    let slug = title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');

    // Complex slug uniqueness checking within tenant scope
    const existingSlug = await this.dataSource.createQueryBuilder()
      .select('COUNT(*) as cnt')
      .from('posts', 'p')
      .where('p.slug = :slug AND p.tenant_id = :tenantId', { slug, tenantId })
      .getRawOne();

    if (parseInt(existingSlug.cnt) > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const excerpt = (body.excerpt || '').trim();
    const status = ['draft', 'published'].includes(body.status) ? body.status : 'draft';
    const featuredImage = body.featured_image || null;
    const categoryId = body.category_id ? parseInt(body.category_id) : null;

    // Allow custom slug override
    if (body.slug) {
      const customSlug = body.slug.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
      const existingCustomSlug = await this.dataSource.createQueryBuilder()
        .select('COUNT(*) as cnt')
        .from('posts', 'p')
        .where('p.slug = :slug AND p.tenant_id = :tenantId', { slug: customSlug, tenantId })
        .getRawOne();
      
      if (parseInt(existingCustomSlug.cnt) > 0) {
        slug = `${customSlug}-${Date.now()}`;
      } else {
        slug = customSlug;
      }
    }

    try {
      const result = await this.dataSource.createQueryBuilder()
        .insert()
        .into('posts')
        .values({
          tenant_id: tenantId,
          author_id: adminId,
          title,
          slug,
          content,
          excerpt,
          status,
          featured_image: featuredImage,
          category_id: categoryId,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .execute();

      const newId = result.identifiers[0].id;

      // Separate SEO metadata table insertion with ON DUPLICATE KEY UPDATE
      const metaTitle = (body.meta_title || '').trim();
      const metaDescription = (body.meta_description || '').trim();
      const noindex = !!body.noindex;
      
      if (metaTitle || metaDescription || noindex) {
        await this.dataSource.query(`
          INSERT INTO seo_metadata (entity_type, entity_id, tenant_id, meta_title, meta_description, noindex, created_at, updated_at)
          VALUES ('post', ?, ?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE 
            meta_title = VALUES(meta_title), 
            meta_description = VALUES(meta_description), 
            noindex = VALUES(noindex), 
            updated_at = NOW()
        `, [newId, tenantId, metaTitle || null, metaDescription || null, noindex ? 1 : 0]);
      }

      // Activity logging
      await this.activityLogRepository.save({
        userId: adminId,
        action: 'admin_create_blog_post',
        details: `Created blog post #${newId}: ${title}`,
        createdAt: new Date(),
      });

      return this.baseApiController.respondWithData({
        id: newId,
        title,
        slug,
        status,
      }, null, 201);
    } catch (error) {
      // Proper error response format for validation
      return this.baseApiController.respondWithError('CREATION_FAILED', 'Failed to create blog post', null, 500);
    }
  }

  /**
   * Update existing blog post
   * Source: AdminBlogController.update
   */
  async updateBlogPost(id: number, body: Record<string, any>, req?: any): Promise<any> {
    // Admin authentication and tenant validation
    const adminId = this.baseApiController.requireAdmin(req);
    const tenantId = this.baseApiController.getTenantId(req);

    // Verify post exists and belongs to tenant
    const post = await this.dataSource.createQueryBuilder()
      .select(['id', 'title', 'slug'])
      .from('posts', 'p')
      .where('p.id = :id AND p.tenant_id = :tenantId', { id, tenantId })
      .getRawOne();

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const updates: any = {};

    if (body.title && body.title.trim() !== '') {
      updates.title = body.title.trim();

      // Only auto-generate slug from title if no explicit slug provided
      if (!body.slug) {
        const newSlug = updates.title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');

        if (newSlug !== post.slug) {
          const existing = await this.dataSource.createQueryBuilder()
            .select('COUNT(*) as cnt')
            .from('posts', 'p')
            .where('p.slug = :slug AND p.tenant_id = :tenantId AND p.id != :id', { slug: newSlug, tenantId, id })
            .getRawOne();
          
          if (parseInt(existing.cnt) > 0) {
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
        const existing = await this.dataSource.createQueryBuilder()
          .select('COUNT(*) as cnt')
          .from('posts', 'p')
          .where('p.slug = :slug AND p.tenant_id = :tenantId AND p.id != :id', { slug: newSlug, tenantId, id })
          .getRawOne();

        if (parseInt(existing.cnt) > 0) {
          updates.slug = `${newSlug}-${Date.now()}`;
        } else {
          updates.slug = newSlug;
        }
      }
    }

    if (body.hasOwnProperty('content')) {
      updates.content = this.htmlSanitizerService.sanitizeCms(body.content || '');
    }

    if (body.hasOwnProperty('excerpt')) {
      updates.excerpt = body.excerpt || '';
    }

    if (body.status && ['draft', 'published'].includes(body.status)) {
      updates.status = body.status;
    }

    if (body.hasOwnProperty('featured_image')) {
      updates.featured_image = body.featured_image || null;
    }

    if (body.hasOwnProperty('category_id')) {
      updates.category_id = body.category_id ? parseInt(body.category_id) : null;
    }

    if (Object.keys(updates).length === 0 && !body.hasOwnProperty('meta_title') && !body.hasOwnProperty('meta_description') && !body.hasOwnProperty('noindex')) {
      return this.baseApiController.respondWithError('VALIDATION_NO_FIELDS', 'No fields provided for update', null, 400);
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date();
      await this.dataSource.createQueryBuilder()
        .update('posts')
        .set(updates)
        .where('id = :id AND tenant_id = :tenantId', { id, tenantId })
        .execute();
    }

    // Update SEO metadata if provided
    if (body.hasOwnProperty('meta_title') || body.hasOwnProperty('meta_description') || body.hasOwnProperty('noindex')) {
      const metaTitle = body.hasOwnProperty('meta_title') ? (body.meta_title || '').trim() : null;
      const metaDescription = body.hasOwnProperty('meta_description') ? (body.meta_description || '').trim() : null;
      const noindex = body.hasOwnProperty('noindex') ? (body.noindex ? 1 : 0) : 0;

      await this.dataSource.query(`
        INSERT INTO seo_metadata (entity_type, entity_id, tenant_id, meta_title, meta_description, noindex, created_at, updated_at)
        VALUES ('post', ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
          meta_title = VALUES(meta_title), 
          meta_description = VALUES(meta_description), 
          noindex = VALUES(noindex), 
          updated_at = NOW()
      `, [id, tenantId, metaTitle, metaDescription, noindex]);
    }

    // Activity logging
    await this.activityLogRepository.save({
      userId: adminId,
      action: 'admin_update_blog_post',
      details: `Updated blog post #${id}: ${body.title || post.title}`,
      createdAt: new Date(),
    });

    // Return updated post
    return this.getAdminBlogPost(id, req);
  }

  /**
   * Delete blog post
   * Source: AdminBlogController.destroy
   */
  async deleteBlogPost(id: number, req?: any): Promise<any> {
    // Admin authentication and tenant validation
    const adminId = this.baseApiController.requireAdmin(req);
    const tenantId = this.baseApiController.getTenantId(req);

    const post = await this.dataSource.createQueryBuilder()
      .select(['id', 'title'])
      .from('posts', 'p')
      .where('p.id = :id AND p.tenant_id = :tenantId', { id, tenantId })
      .getRawOne();

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    await this.dataSource.createQueryBuilder()
      .delete()
      .from('posts')
      .where('id = :id AND tenant_id = :tenantId', { id, tenantId })
      .execute();

    // Activity logging
    await this.activityLogRepository.save({
      userId: adminId,
      action: 'admin_delete_blog_post',
      details: `Deleted blog post #${id}: ${post.title}`,
      createdAt: new Date(),
    });

    return this.baseApiController.respondWithData({ deleted: true, id });
  }

  /**
   * Toggle blog post status between published and draft
   * Source: AdminBlogController.toggleStatus
   */
  async togglePostStatus(id: number, req?: any): Promise<any> {
    // Admin authentication and tenant validation
    const adminId = this.baseApiController.requireAdmin(req);
    const tenantId = this.baseApiController.getTenantId(req);

    const post = await this.dataSource.createQueryBuilder()
      .select(['id', 'title', 'status'])
      .from('posts', 'p')
      .where('p.id = :id AND p.tenant_id = :tenantId', { id, tenantId })
      .getRawOne();

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const newStatus = post.status === 'published' ? 'draft' : 'published';

    await this.dataSource.createQueryBuilder()
      .update('posts')
      .set({ 
        status: newStatus, 
        updated_at: new Date(),
        published_at: newStatus === 'published' ? new Date() : post.published_at
      })
      .where('id = :id AND tenant_id = :tenantId', { id, tenantId })
      .execute();

    // Activity logging
    await this.activityLogRepository.save({
      userId: adminId,
      action: 'admin_toggle_blog_status',
      details: `Changed blog post #${id} status: ${post.status} -> ${newStatus}`,
      createdAt: new Date(),
    });

    return this.baseApiController.respondWithData({
      id: parseInt(id.toString()),
      status: newStatus,
    });
  }

  /**
   * Delete multiple blog posts in bulk
   * Source: AdminBlogController.bulkDelete
   */
  async bulkDeletePosts(postIds?: number[], req?: any): Promise<any> {
    // Admin authentication and tenant validation
    const adminId = this.baseApiController.requireAdmin(req);
    const tenantId = this.baseApiController.getTenantId(req);
    
    // Rate limiting
    this.baseApiController.rateLimit(req, 'admin_blog_bulk', 10, 60);

    const [ids, error] = this.parseBulkIds(postIds);
    if (error) throw error;

    // Complex tenant-aware eligibility checking
    const placeholders = ids.map(() => '?').join(',');
    const eligibleRows = await this.dataSource.query(`
      SELECT id FROM posts WHERE tenant_id = ? AND id IN (${placeholders})
    `, [tenantId, ...ids]);

    const eligibleIds = eligibleRows.map((r: any) => parseInt(r.id));
    const skippedIds = ids.filter(id => !eligibleIds.includes(id));

    let success = 0;
    let failed = skippedIds.length;
    let touchedIds: number[] = [];

    if (eligibleIds.length > 0) {
      try {
        const ph = eligibleIds.map(() => '?').join(',');
        const result = await this.dataSource.query(`
          DELETE FROM posts WHERE tenant_id = ? AND id IN (${ph})
        `, [tenantId, ...eligibleIds]);
        
        success = result.affectedRows || 0;
        touchedIds = eligibleIds;
      } catch (e) {
        failed += eligibleIds.length;
        skippedIds.push(...eligibleIds);
      }
    }

    // Activity logging
    await this.activityLogRepository.save({
      userId: adminId,
      action: 'admin_bulk_delete_blog_posts',
      details: `Bulk deleted ${success} blog posts`,
      createdAt: new Date(),
    });

    // AuditLogService integration
    await this.auditLogService.log('admin_bulk_delete_blog_posts', null, adminId, {
      post_ids: touchedIds,
      skipped_ids: skippedIds,
      success,
      failed,
    });

    return this.baseApiController.respondWithData({
      success,
      failed,
      skipped_ids: skippedIds,
    });
  }

  /**
   * Publish multiple blog posts in bulk
   * Source: AdminBlogController.bulkPublish
   */
  async bulkPublishPosts(postIds?: number[], req?: any): Promise<any> {
    // Admin authentication and tenant validation
    const adminId = this.baseApiController.requireAdmin(req);
    const tenantId = this.baseApiController.getTenantId(req);
    
    // Rate limiting
    this.baseApiController.rateLimit(req, 'admin_blog_bulk', 10, 60);

    const [ids, error] = this.parseBulkIds(postIds);
    if (error) throw error;

    const placeholders = ids.map(() => '?').join(',');
    const eligibleRows = await this.dataSource.query(`
      SELECT id, status FROM posts WHERE tenant_id = ? AND id IN (${placeholders})
    `, [tenantId, ...ids]);

    const existingIds = eligibleRows.map((r: any) => parseInt(r.id));
    const skippedIds = ids.filter(id => !existingIds.includes(id));

    const toPublish: number[] = [];
    for (const row of eligibleRows) {
      if (row.status !== 'published') {
        toPublish.push(parseInt(row.id));
      } else {
        skippedIds.push(parseInt(row.id));
      }
    }

    let success = 0;
    const failed = ids.length - existingIds.length;
    let touchedIds: number[] = [];

    if (toPublish.length > 0) {
      try {
        const ph = toPublish.map(() => '?').join(',');
        const result = await this.dataSource.query(`
          UPDATE posts 
          SET status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW()
          WHERE tenant_id = ? AND id IN (${ph})
        `, [tenantId, ...toPublish]);
        
        success = result.affectedRows || 0;
        touchedIds = toPublish;
      } catch (e) {
        failed + toPublish.length;
        skippedIds.push(...toPublish);
      }
    }

    // Activity logging
    await this.activityLogRepository.save({
      userId: adminId,
      action: 'admin_bulk_publish_blog_posts',
      details: `Bulk published ${success} blog posts`,
      createdAt: new Date(),
    });

    // AuditLogService integration
    await this.auditLogService.log('admin_bulk_publish_blog_posts', null, adminId, {
      post_ids: touchedIds,
      skipped_ids: skippedIds,
      success,
      failed,
    });

    return this.baseApiController.respondWithData({
      success,
      failed,
      skipped_ids: skippedIds,
    });
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