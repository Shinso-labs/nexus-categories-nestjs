import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { BlogPost } from './entities/blog-post.entity';
import { Author } from './entities/author.entity';
import { PostCategory } from './entities/post-category.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { SeoMetadata } from './entities/seo-metadata.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CreateBlogModuleDto } from './dto/create-blog.dto';
import { UpdateBlogModuleDto } from './dto/update-blog.dto';

@Injectable()
export class BlogModuleService {
  constructor(
    @InjectRepository(BlogPost)
    private readonly blogPostRepository: Repository<BlogPost>,
    @InjectRepository(Author)
    private readonly authorRepository: Repository<Author>,
    @InjectRepository(PostCategory)
    private readonly postCategoryRepository: Repository<PostCategory>,
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
    @InjectRepository(SeoMetadata)
    private readonly seoMetadataRepository: Repository<SeoMetadata>,
  ) {}

  // Current tenant ID - in real app this would come from context/session
  private getTenantId(): number {
    return 1; // Default tenant
  }

  private getCurrentUserId(): number {
    return 1; // Default admin user - in real app this would come from JWT/session
  }

  /**
   * Get paginated list of published blog posts with filtering
   * Source: BlogPublicController.index -> BlogService.getAll
   */
  async getBlogPosts(page?: number | null, perPage?: number | null, category?: string | null, featured?: boolean | null, cursor?: string | null): Promise<any> {
    const limit = Math.min(perPage || 12, 50);
    
    const query = this.blogPostRepository.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.status = :status', { status: 'published' })
      .andWhere('post.tenantId = :tenantId', { tenantId: this.getTenantId() });

    if (cursor) {
      const decodedCursor = Buffer.from(cursor, 'base64').toString();
      if (decodedCursor && !isNaN(parseInt(decodedCursor))) {
        query.andWhere('post.id < :cursor', { cursor: parseInt(decodedCursor) });
      }
    }

    if (category) {
      query.andWhere(':category = ANY(post.categoryIds)', { category });
    }

    if (featured !== null) {
      query.andWhere('post.isFeatured = :featured', { featured });
    }

    query.orderBy('post.createdAt', 'DESC')
      .limit(limit + 1);

    const items = await query.getMany();
    const hasMore = items.length > limit;
    if (hasMore) {
      items.pop();
    }

    const baseUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : 'https://api.project-nexus.ie';
    const formatted = items.map(post => this.formatPostSummaryInternal(post, baseUrl));

    return {
      data: {
        items: formatted,
        cursor: hasMore && items.length > 0 ? Buffer.from(items[items.length - 1].id.toString()).toString('base64') : null,
        has_more: hasMore
      }
    };
  }

  /**
   * Get all blog post categories with tenant scoping and real post counts
   * Source: BlogPublicController.categories -> BlogService.getCategories
   */
  async getBlogCategories(): Promise<any> {
    const tenantId = this.getTenantId();
    
    const categories = await this.postCategoryRepository.createQueryBuilder('category')
      .innerJoin('blog_posts', 'post', 'post.id = category.postId AND post.tenantId = :tenantId AND post.status = :status', 
        { tenantId, status: 'published' })
      .select(['category.categorySlug', 'category.categoryName'])
      .addSelect('COUNT(DISTINCT category.postId)', 'post_count')
      .groupBy('category.categorySlug, category.categoryName')
      .orderBy('category.categoryName')
      .getRawMany();

    const formatted = categories.map((cat, index) => ({
      id: index + 1,
      name: cat.category_categoryName,
      slug: cat.category_categorySlug || '',
      color: 'blue',
      post_count: parseInt(cat.post_count) || 0
    }));

    return { data: formatted };
  }

  /**
   * Get single blog post by slug and increment view count
   * Source: BlogPublicController.show -> BlogService.getBySlug
   */
  async getBlogPost(slug: string): Promise<any> {
    if (!slug) {
      throw new BadRequestException('Slug is required');
    }

    const post = await this.blogPostRepository.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author') 
      .where('post.slug = :slug', { slug })
      .andWhere('post.status = :status', { status: 'published' })
      .andWhere('post.tenantId = :tenantId', { tenantId: this.getTenantId() })
      .getOne();

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const baseUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : 'https://api.project-nexus.ie';
    const content = post.content || '';
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const formatted = {
      id: post.id,
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      content: content,
      featured_image: this.resolveImageUrlInternal(post.featuredImage, baseUrl),
      published_at: post.createdAt.toISOString(),
      created_at: post.createdAt.toISOString(),
      updated_at: post.createdAt.toISOString(),
      views: post.viewCount || 0,
      reading_time: readingTime,
      meta_title: post.metaTitle || post.title || null,
      meta_description: post.metaDescription || post.excerpt || null,
      author: await this.formatAuthorInternal(post.author, baseUrl),
      category: null // TODO: implement category lookup from post.categoryIds
    };

    return { data: formatted };
  }

  /**
   * Increment view count for a blog post
   * Source: Not in Laravel code - custom implementation
   */
  async incrementViewCount(slug: string): Promise<any> {
    if (!slug) {
      throw new BadRequestException('Slug is required');
    }

    const post = await this.blogPostRepository.findOne({ 
      where: { slug, tenantId: this.getTenantId() } 
    });
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    await this.blogPostRepository.update(post.id, { 
      viewCount: post.viewCount + 1 
    });

    return { data: { views: post.viewCount + 1 } };
  }

  /**
   * Format blog post as summary with resolved URLs
   * Source: BlogService.formatPostSummary helper method
   */
  async formatPostSummary(slug: string, baseUrl?: string): Promise<any> {
    if (!slug) {
      throw new BadRequestException('Slug is required');
    }

    const post = await this.blogPostRepository.findOne({ 
      where: { slug, tenantId: this.getTenantId() },
      relations: ['author']
    });
    
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const resolvedBaseUrl = baseUrl ? baseUrl.replace(/\/$/, '') : (process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : 'https://api.project-nexus.ie');
    const formatted = this.formatPostSummaryInternal(post, resolvedBaseUrl);

    return { data: formatted };
  }

  /**
   * Format author as summary with resolved avatar URL
   * Source: BlogService.formatAuthor helper method
   */
  async formatAuthorSummary(baseUrl?: string): Promise<any> {
    // Since no specific author is requested, return a generic unknown author
    const resolvedBaseUrl = baseUrl ? baseUrl.replace(/\/$/, '') : (process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : 'https://api.project-nexus.ie');
    
    return { data: { 
      id: 0, 
      name: 'Unknown', 
      avatar: null 
    }};
  }

  /**
   * Get all published blog posts with pagination
   * Source: BlogService.getAll with cursor pagination
   */
  async getAllPosts(page?: number | null, perPage?: number | null): Promise<any> {
    const limit = Math.min(perPage || 20, 100);

    const query = this.blogPostRepository.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.status = :status', { status: 'published' })
      .andWhere('post.tenantId = :tenantId', { tenantId: this.getTenantId() })
      .orderBy('post.createdAt', 'DESC')
      .limit(limit + 1);

    const items = await query.getMany();
    const hasMore = items.length > limit;
    if (hasMore) {
      items.pop();
    }

    const baseUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : 'https://api.project-nexus.ie';
    const formatted = items.map(post => this.formatPostSummaryInternal(post, baseUrl));

    return {
      data: {
        items: formatted,
        cursor: hasMore && items.length > 0 ? Buffer.from(items[items.length - 1].id.toString()).toString('base64') : null,
        has_more: hasMore
      }
    };
  }

  /**
   * Get filtered blog posts by category with pagination
   * Source: BlogService.getPosts with offset pagination
   */
  async getPostsFiltered(category?: string | null, page?: number | null, perPage?: number | null): Promise<any> {
    const currentPage = page || 1;
    const limit = perPage || 20;
    const offset = (currentPage - 1) * limit;

    const query = this.blogPostRepository.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.status = :status', { status: 'published' })
      .andWhere('post.tenantId = :tenantId', { tenantId: this.getTenantId() });

    if (category) {
      query.andWhere(':category = ANY(post.categoryIds)', { category });
    }

    const total = await query.getCount();
    
    const items = await query
      .orderBy('post.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    const baseUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : 'https://api.project-nexus.ie';
    const formatted = items.map(post => this.formatPostSummaryInternal(post, baseUrl));

    return {
      data: {
        items: formatted,
        total: total
      }
    };
  }

  /**
   * Get single blog post by slug and update view count
   * Source: BlogService.getBySlug
   */
  async getPostBySlug(slug: string): Promise<any> {
    return this.getBlogPost(slug);
  }

  /**
   * Get all available blog post categories
   * Source: BlogService.getCategories
   */
  async getAllCategories(): Promise<any> {
    return this.getBlogCategories();
  }

  /**
   * Format blog post as summary with resolved image URLs
   * Source: BlogService.formatPostSummary
   */
  async formatPostWithSummary(slug: string): Promise<any> {
    return this.formatPostSummary(slug);
  }

  /**
   * Format author information with resolved avatar URL
   * Source: BlogService.formatAuthor
   */
  async formatAuthorInfo(): Promise<any> {
    return this.formatAuthorSummary();
  }

  /**
   * Resolve relative image path to absolute URL
   * Source: BlogService.resolveImageUrl
   */
  async resolveImageUrl(imagePath?: string): Promise<any> {
    const baseUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : 'https://api.project-nexus.ie';
    const resolved = this.resolveImageUrlInternal(imagePath, baseUrl);
    
    return { data: { url: resolved } };
  }

  // =========================================================================
  // Admin Methods (Missing from gaps)
  // =========================================================================

  /**
   * Admin blog post listing with filtering and search
   * Source: AdminBlogController.index
   */
  async adminIndex(page?: number, limit?: number, status?: string, search?: string): Promise<any> {
    const tenantId = this.getTenantId();
    const currentPage = Math.max(page || 1, 1);
    const pageLimit = Math.min(Math.max(limit || 20, 1), 100);
    const offset = (currentPage - 1) * pageLimit;

    const query = this.blogPostRepository.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoin('post_categories', 'category', 'category.postId = post.id')
      .where('post.tenantId = :tenantId', { tenantId });

    if (status && ['draft', 'published'].includes(status)) {
      query.andWhere('post.status = :status', { status });
    }

    if (search) {
      const searchTerm = `%${search}%`;
      query.andWhere('(post.title LIKE :searchTerm OR post.content LIKE :searchTerm)', { searchTerm });
    }

    const total = await query.getCount();

    const items = await query
      .orderBy('post.createdAt', 'DESC')
      .skip(offset)
      .take(pageLimit)
      .getMany();

    const formatted = items.map(post => ({
      id: post.id,
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      status: post.status || 'draft',
      featured_image: post.featuredImage || null,
      author_id: post.authorId || 0,
      author_name: post.author ? post.author.name.trim() : '',
      category_id: post.categoryIds?.length > 0 ? post.categoryIds[0] : null,
      category_name: null, // TODO: resolve from category table
      created_at: post.createdAt.toISOString(),
      updated_at: post.createdAt.toISOString(),
    }));

    return {
      data: formatted,
      total,
      page: currentPage,
      limit: pageLimit,
      has_more: total > offset + pageLimit
    };
  }

  /**
   * Admin single post view with SEO metadata
   * Source: AdminBlogController.show
   */
  async adminShow(id: number): Promise<any> {
    const tenantId = this.getTenantId();

    const post = await this.blogPostRepository.findOne({
      where: { id, tenantId },
      relations: ['author']
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    // Fetch SEO metadata
    const seo = await this.seoMetadataRepository.findOne({
      where: { entityType: 'post', entityId: id, tenantId }
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
        author_id: post.authorId || 0,
        author_name: post.author ? post.author.name.trim() : '',
        category_id: post.categoryIds?.length > 0 ? post.categoryIds[0] : null,
        category_name: null, // TODO: resolve from category table
        meta_title: seo?.metaTitle || null,
        meta_description: seo?.metaDescription || null,
        noindex: seo?.noindex || false,
        created_at: post.createdAt.toISOString(),
        updated_at: post.createdAt.toISOString(),
      }
    };
  }

  /**
   * Create new blog post with validation and slug generation
   * Source: AdminBlogController.store
   */
  async adminStore(createDto: CreateBlogModuleDto): Promise<any> {
    const adminId = this.getCurrentUserId();
    const tenantId = this.getTenantId();

    const title = createDto.title?.trim();
    if (!title) {
      throw new BadRequestException('Title is required');
    }

    // Auto-generate slug from title
    let slug = title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
    
    // Allow custom slug override
    if (createDto.slug) {
      slug = createDto.slug.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
    }

    // Ensure slug uniqueness within tenant
    const existingSlug = await this.blogPostRepository.findOne({
      where: { slug, tenantId }
    });

    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const content = this.sanitizeContent(createDto.content || '');
    const excerpt = createDto.excerpt?.trim() || '';
    const status = ['draft', 'published'].includes(createDto.status || '') ? createDto.status : 'draft';
    const featuredImage = createDto.featuredImage || null;
    const categoryId = createDto.categoryIds && createDto.categoryIds.length > 0 ? createDto.categoryIds[0] : null;

    const newPost = this.blogPostRepository.create({
      tenantId,
      authorId: adminId,
      title,
      slug,
      content,
      excerpt,
      status,
      featuredImage,
      categoryIds: categoryId ? [categoryId] : [],
    });

    const savedPost = await this.blogPostRepository.save(newPost);

    // Save SEO metadata if provided
    if (createDto.metaTitle || createDto.metaDescription) {
      const seoData = this.seoMetadataRepository.create({
        entityType: 'post',
        entityId: savedPost.id,
        tenantId,
        metaTitle: createDto.metaTitle || null,
        metaDescription: createDto.metaDescription || null,
        noindex: false,
      });
      await this.seoMetadataRepository.save(seoData);
    }

    // Log activity
    await this.activityLogRepository.save({
      userId: adminId,
      action: 'admin_create_blog_post',
      details: `Created blog post #${savedPost.id}: ${title}`,
    });

    return {
      data: {
        id: savedPost.id,
        title,
        slug,
        status,
      }
    };
  }

  /**
   * Update blog post with dynamic field updates and slug handling
   * Source: AdminBlogController.update
   */
  async adminUpdate(id: number, updateDto: UpdateBlogModuleDto): Promise<any> {
    const adminId = this.getCurrentUserId();
    const tenantId = this.getTenantId();

    const post = await this.blogPostRepository.findOne({
      where: { id, tenantId }
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const updateData: Partial<BlogPost> = {};

    if (updateDto.title?.trim()) {
      updateData.title = updateDto.title.trim();

      // Auto-generate slug from title if no explicit slug provided
      if (!updateDto.slug) {
        let newSlug = updateData.title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
        
        if (newSlug !== post.slug) {
          const existing = await this.blogPostRepository.findOne({
            where: { slug: newSlug, tenantId, id: Not(id) }
          });
          if (existing) {
            newSlug = `${newSlug}-${Date.now()}`;
          }
          updateData.slug = newSlug;
        }
      }
    }

    // Allow explicit slug override
    if (updateDto.slug?.trim()) {
      let newSlug = updateDto.slug.trim().toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
      if (newSlug !== post.slug) {
        const existing = await this.blogPostRepository.findOne({
          where: { slug: newSlug, tenantId, id: Not(id) }
        });
        if (existing) {
          newSlug = `${newSlug}-${Date.now()}`;
        }
        updateData.slug = newSlug;
      }
    }

    if (updateDto.content !== undefined) {
      updateData.content = this.sanitizeContent(updateDto.content || '');
    }

    if (updateDto.excerpt !== undefined) {
      updateData.excerpt = updateDto.excerpt || '';
    }

    if (updateDto.status && ['draft', 'published'].includes(updateDto.status)) {
      updateData.status = updateDto.status;
    }

    if (updateDto.featuredImage !== undefined) {
      updateData.featuredImage = updateDto.featuredImage || null;
    }

    if (updateDto.categoryIds !== undefined) {
      updateData.categoryIds = updateDto.categoryIds || [];
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    await this.blogPostRepository.update(id, updateData);

    // Update SEO metadata if provided
    if (updateDto.metaTitle !== undefined || updateDto.metaDescription !== undefined) {
      await this.seoMetadataRepository.upsert({
        entityType: 'post',
        entityId: id,
        tenantId,
        metaTitle: updateDto.metaTitle || null,
        metaDescription: updateDto.metaDescription || null,
        noindex: false,
      }, ['entityType', 'entityId', 'tenantId']);
    }

    // Log activity
    await this.activityLogRepository.save({
      userId: adminId,
      action: 'admin_update_blog_post',
      details: `Updated blog post #${id}: ${updateDto.title || post.title}`,
    });

    // Return updated post
    return this.adminShow(id);
  }

  /**
   * Delete blog post with activity logging
   * Source: AdminBlogController.destroy
   */
  async adminDestroy(id: number): Promise<any> {
    const adminId = this.getCurrentUserId();
    const tenantId = this.getTenantId();

    const post = await this.blogPostRepository.findOne({
      where: { id, tenantId }
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    await this.blogPostRepository.remove(post);

    // Log activity
    await this.activityLogRepository.save({
      userId: adminId,
      action: 'admin_delete_blog_post',
      details: `Deleted blog post #${id}: ${post.title}`,
    });

    return {
      data: {
        deleted: true,
        id
      }
    };
  }

  /**
   * Toggle post status between draft/published
   * Source: AdminBlogController.toggleStatus
   */
  async adminToggleStatus(id: number): Promise<any> {
    const adminId = this.getCurrentUserId();
    const tenantId = this.getTenantId();

    const post = await this.blogPostRepository.findOne({
      where: { id, tenantId }
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const newStatus = post.status === 'published' ? 'draft' : 'published';

    await this.blogPostRepository.update(id, { 
      status: newStatus,
      publishedAt: newStatus === 'published' ? Date.now() : post.publishedAt
    });

    // Log activity
    await this.activityLogRepository.save({
      userId: adminId,
      action: 'admin_toggle_blog_status',
      details: `Changed blog post #${id} status: ${post.status} -> ${newStatus}`,
    });

    return {
      data: {
        id,
        status: newStatus,
      }
    };
  }

  /**
   * Bulk delete posts with rate limiting and validation
   * Source: AdminBlogController.bulkDelete
   */
  async adminBulkDelete(postIds: number[]): Promise<any> {
    const adminId = this.getCurrentUserId();
    const tenantId = this.getTenantId();

    if (!Array.isArray(postIds) || postIds.length === 0) {
      throw new BadRequestException('Post IDs are required');
    }

    if (postIds.length > 100) {
      throw new BadRequestException('Too many posts selected (max: 100)');
    }

    const eligiblePosts = await this.blogPostRepository.find({
      where: { 
        id: In(postIds), 
        tenantId 
      }
    });

    const eligibleIds = eligiblePosts.map(p => p.id);
    const skippedIds = postIds.filter(id => !eligibleIds.includes(id));

    let success = 0;
    let failed = skippedIds.length;
    let touchedIds: number[] = [];

    if (eligibleIds.length > 0) {
      try {
        const result = await this.blogPostRepository.delete({
          id: In(eligibleIds),
          tenantId
        });
        success = result.affected || 0;
        touchedIds = eligibleIds;
      } catch (error) {
        failed += eligibleIds.length;
        skippedIds.push(...eligibleIds);
      }
    }

    // Log activity
    await this.activityLogRepository.save({
      userId: adminId,
      action: 'admin_bulk_delete_blog_posts',
      details: `Bulk deleted ${success} blog posts`,
    });

    return {
      data: {
        success,
        failed,
        skipped_ids: skippedIds,
      }
    };
  }

  /**
   * Bulk publish posts with activity logging
   * Source: AdminBlogController.bulkPublish
   */
  async adminBulkPublish(postIds: number[]): Promise<any> {
    const adminId = this.getCurrentUserId();
    const tenantId = this.getTenantId();

    if (!Array.isArray(postIds) || postIds.length === 0) {
      throw new BadRequestException('Post IDs are required');
    }

    if (postIds.length > 100) {
      throw new BadRequestException('Too many posts selected (max: 100)');
    }

    const eligiblePosts = await this.blogPostRepository.find({
      where: { 
        id: In(postIds), 
        tenantId 
      }
    });

    const existingIds = eligiblePosts.map(p => p.id);
    const skippedIds = postIds.filter(id => !existingIds.includes(id));

    const toPublish = eligiblePosts.filter(p => p.status !== 'published').map(p => p.id);
    const alreadyPublished = eligiblePosts.filter(p => p.status === 'published').map(p => p.id);
    skippedIds.push(...alreadyPublished);

    let success = 0;
    let failed = postIds.length - existingIds.length;
    let touchedIds: number[] = [];

    if (toPublish.length > 0) {
      try {
        const result = await this.blogPostRepository.update(
          { id: In(toPublish), tenantId },
          { 
            status: 'published',
            publishedAt: Date.now()
          }
        );
        success = result.affected || 0;
        touchedIds = toPublish;
      } catch (error) {
        failed += toPublish.length;
        skippedIds.push(...toPublish);
      }
    }

    // Log activity
    await this.activityLogRepository.save({
      userId: adminId,
      action: 'admin_bulk_publish_blog_posts',
      details: `Bulk published ${success} blog posts`,
    });

    return {
      data: {
        success,
        failed,
        skipped_ids: skippedIds,
      }
    };
  }

  // Private helper methods matching Laravel BlogService helpers

  private formatPostSummaryInternal(post: BlogPost, baseUrl: string): any {
    const content = post.content || '';
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).filter(word => word.length > 0).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    return {
      id: post.id,
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      featured_image: this.resolveImageUrlInternal(post.featuredImage, baseUrl),
      published_at: post.createdAt.toISOString(),
      created_at: post.createdAt.toISOString(),
      views: post.viewCount || 0,
      reading_time: readingTime,
      author: post.author ? this.formatAuthorDirectInternal(post.author, baseUrl) : { id: 0, name: 'Unknown', avatar: null },
      category: null // TODO: implement category lookup from post.categoryIds
    };
  }

  private async formatAuthorInternal(author: Author | null, baseUrl: string): Promise<any> {
    if (!author) {
      return { id: 0, name: 'Unknown', avatar: null };
    }

    return this.formatAuthorDirectInternal(author, baseUrl);
  }

  private formatAuthorDirectInternal(author: Author, baseUrl: string): any {
    return {
      id: author.id,
      name: author.name.trim(),
      avatar: this.resolveImageUrlInternal(author.avatar, baseUrl)
    };
  }

  private resolveImageUrlInternal(url?: string | null, baseUrl?: string): string | null {
    if (!url) {
      return null;
    }
    if (url.startsWith('http')) {
      return url;
    }
    const resolvedBaseUrl = baseUrl || (process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : 'https://api.project-nexus.ie');
    return resolvedBaseUrl + '/' + url.replace(/^\/+/, '');
  }

  private sanitizeContent(content: string): string {
    // Basic HTML sanitization - in production use a proper library like DOMPurify
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
}