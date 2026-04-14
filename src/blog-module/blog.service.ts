import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { BlogPost } from './entities/blog-post.entity';
import { Author } from './entities/author.entity';
import { PostCategory } from './entities/post-category.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CreateBlogModuleDto } from './dto/create-blog.dto';
import { UpdateBlogModuleDto } from './dto/update-blog.dto';
import * as DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

@Injectable()
export class BlogModuleService {
  private readonly window = new JSDOM('').window;
  private readonly domPurify = DOMPurify(this.window);

  constructor(
    @InjectRepository(BlogPost)
    private readonly blogPostRepository: Repository<BlogPost>,
    @InjectRepository(Author)
    private readonly authorRepository: Repository<Author>,
    @InjectRepository(PostCategory)
    private readonly postCategoryRepository: Repository<PostCategory>,
  ) {}

  /**
   * Get paginated list of published blog posts with filtering
   * Source: BlogPublicController.index
   */
  async getBlogPosts(page?: number | null, perPage?: number | null, category?: string | null, featured?: boolean | null, cursor?: string | null): Promise<any> {
    const filters = {
      limit: Math.min(perPage || 12, 50),
    };

    const queryBuilder = this.blogPostRepository.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.status = :status', { status: 'published' });

    if (cursor) {
      const decodedCursor = Buffer.from(cursor, 'base64').toString();
      if (decodedCursor) {
        queryBuilder.andWhere('post.id < :cursor', { cursor: parseInt(decodedCursor) });
      }
    }

    if (category) {
      queryBuilder.andWhere(':category = ANY(post.categoryIds)', { category });
    }

    if (featured !== null) {
      queryBuilder.andWhere('post.isFeatured = :featured', { featured });
    }

    const items = await queryBuilder
      .orderBy('post.createdAt', 'DESC')
      .limit(filters.limit + 1)
      .getMany();

    const hasMore = items.length > filters.limit;
    if (hasMore) {
      items.pop();
    }

    const baseUrl = process.env.APP_URL || 'https://api.project-nexus.ie';
    const formatted = await Promise.all(
      items.map(async (post) => await this.formatPostSummary(post, baseUrl.replace(/\/$/, '')))
    );

    return {
      data: {
        items: formatted,
        cursor: hasMore && items.length > 0 ? Buffer.from(items[items.length - 1].id.toString()).toString('base64') : null,
        has_more: hasMore,
      }
    };
  }

  /**
   * Get all blog post categories
   * Source: BlogPublicController.categories
   */
  async getBlogCategories(): Promise<any> {
    const categories = await this.postCategoryRepository.createQueryBuilder('category')
      .select(['category.categorySlug', 'category.categoryName'])
      .groupBy('category.categorySlug')
      .addGroupBy('category.categoryName')
      .getRawMany();

    // Count posts per category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const postCount = await this.blogPostRepository.createQueryBuilder('post')
          .where('post.status = :status', { status: 'published' })
          .andWhere(':category = ANY(post.categoryIds)', { category: cat.category_categorySlug })
          .getCount();

        return {
          id: cat.category_categorySlug,
          name: cat.category_categoryName,
          slug: cat.category_categorySlug,
          color: 'blue',
          post_count: postCount,
        };
      })
    );

    return { data: categoriesWithCounts };
  }

  /**
   * Get single blog post by slug and increment view count
   * Source: BlogPublicController.show
   */
  async getBlogPost(slug?: string): Promise<any> {
    if (!slug) {
      throw new BadRequestException('Slug is required');
    }

    const post = await this.blogPostRepository.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.slug = :slug', { slug })
      .andWhere('post.status = :status', { status: 'published' })
      .getOne();

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const baseUrl = (process.env.APP_URL || 'https://api.project-nexus.ie').replace(/\/$/, '');
    const content = post.content || '';
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const author = await this.authorRepository.findOne({ where: { userId: post.authorId } });
    const category = await this.resolveCategoryFromIds(post.categoryIds);

    return {
      data: {
        id: post.id,
        title: post.title || '',
        slug: post.slug || '',
        excerpt: post.excerpt || '',
        content,
        featured_image: this.resolveImageUrl(post.featuredImage, baseUrl),
        published_at: post.publishedAt?.toString() || post.createdAt.toISOString(),
        created_at: post.createdAt.toISOString(),
        updated_at: post.createdAt.toISOString(),
        views: post.viewCount || 0,
        reading_time: readingTime,
        meta_title: post.metaTitle || post.title,
        meta_description: post.metaDescription || post.excerpt,
        author: this.formatAuthor(author, baseUrl),
        category: category,
      }
    };
  }

  /**
   * ADMIN: Get all posts with admin filters
   * Source: AdminBlogController.index
   */
  async getAllPosts(page = 1, limit = 20, status?: string, search?: string, tenantId?: number, adminId?: number): Promise<any> {
    const pageNum = Math.max(page, 1);
    const limitNum = Math.min(Math.max(limit, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    let queryBuilder = this.blogPostRepository.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .leftJoin('post_categories', 'category', 'category.postId = post.id');

    // Apply tenant scoping if provided
    if (tenantId) {
      queryBuilder = queryBuilder.where('post.tenantId = :tenantId', { tenantId });
    }

    // Apply status filter
    if (status && ['draft', 'published'].includes(status)) {
      queryBuilder = queryBuilder.andWhere('post.status = :status', { status });
    }

    // Apply search filter
    if (search) {
      const searchTerm = `%${search}%`;
      queryBuilder = queryBuilder.andWhere('(post.title LIKE :search OR post.content LIKE :search)', { search: searchTerm });
    }

    const total = await queryBuilder.getCount();
    const items = await queryBuilder
      .orderBy('post.createdAt', 'DESC')
      .skip(offset)
      .take(limitNum)
      .getMany();

    const formatted = await Promise.all(
      items.map(async (post) => {
        const author = await this.authorRepository.findOne({ where: { userId: post.authorId } });
        const category = await this.resolveCategoryFromIds(post.categoryIds);
        
        return {
          id: post.id,
          title: post.title || '',
          slug: post.slug || '',
          excerpt: post.excerpt || '',
          status: post.status || 'draft',
          featured_image: post.featuredImage || null,
          author_id: post.authorId || 0,
          author_name: author ? author.name.trim() : '',
          category_id: category ? category.id : null,
          category_name: category ? category.name : null,
          created_at: post.createdAt.toISOString(),
          updated_at: post.createdAt.toISOString(),
        };
      })
    );

    return {
      data: {
        items: formatted,
        total,
        pagination: {
          current_page: pageNum,
          per_page: limitNum,
          total: total,
          total_pages: Math.ceil(total / limitNum),
          has_next: pageNum < Math.ceil(total / limitNum),
          has_prev: pageNum > 1,
        }
      }
    };
  }

  /**
   * ADMIN: Get single blog post with admin data
   * Source: AdminBlogController.show
   */
  async getAdminBlogPost(id: number, tenantId: number): Promise<any> {
    let queryBuilder = this.blogPostRepository.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.id = :id', { id });

    if (tenantId) {
      queryBuilder = queryBuilder.andWhere('post.tenantId = :tenantId', { tenantId });
    }

    const post = await queryBuilder.getOne();
    
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const author = await this.authorRepository.findOne({ where: { userId: post.authorId } });
    const category = await this.resolveCategoryFromIds(post.categoryIds);

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
        author_name: author ? author.name.trim() : '',
        category_id: category ? category.id : null,
        category_name: category ? category.name : null,
        meta_title: post.metaTitle || null,
        meta_description: post.metaDescription || null,
        noindex: false, // Default value
        created_at: post.createdAt.toISOString(),
        updated_at: post.createdAt.toISOString(),
      }
    };
  }

  /**
   * ADMIN: Create new blog post
   * Source: AdminBlogController.store
   */
  async createPost(createDto: CreateBlogModuleDto, adminId: number, tenantId: number): Promise<any> {
    const title = (createDto.title || '').trim();
    
    if (!title) {
      throw new BadRequestException('Title is required');
    }

    // Auto-generate slug from title
    let slug = this.generateSlug(title);
    
    // Check slug uniqueness
    const existingPost = await this.blogPostRepository.findOne({
      where: { slug, ...(tenantId && { tenantId }) }
    });
    
    if (existingPost) {
      slug = `${slug}-${Date.now()}`;
    }

    // Allow custom slug override
    if (createDto.slug) {
      const customSlug = this.generateSlug(createDto.slug);
      const existingCustom = await this.blogPostRepository.findOne({
        where: { slug: customSlug, ...(tenantId && { tenantId }) }
      });
      
      if (!existingCustom) {
        slug = customSlug;
      } else {
        slug = `${customSlug}-${Date.now()}`;
      }
    }

    // Sanitize content
    const content = this.sanitizeContent(createDto.content || '');
    const excerpt = (createDto.excerpt || '').trim();
    const status = ['draft', 'published'].includes(createDto.status || '') ? createDto.status : 'draft';

    const newPost = this.blogPostRepository.create({
      title,
      slug,
      content,
      excerpt,
      status,
      featuredImage: createDto.featuredImage || null,
      authorId: adminId,
      categoryIds: createDto.categoryIds || [],
      metaTitle: createDto.metaTitle || null,
      metaDescription: createDto.metaDescription || null,
      ...(tenantId && { tenantId }),
    });

    const savedPost = await this.blogPostRepository.save(newPost);

    // TODO: Activity logging
    console.log(`Admin ${adminId} created blog post #${savedPost.id}: ${title}`);

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
   * ADMIN: Update blog post
   * Source: AdminBlogController.update
   */
  async updatePost(id: number, updateDto: UpdateBlogModuleDto, adminId: number, tenantId: number): Promise<any> {
    let queryBuilder = this.blogPostRepository.createQueryBuilder('post')
      .where('post.id = :id', { id });

    if (tenantId) {
      queryBuilder = queryBuilder.andWhere('post.tenantId = :tenantId', { tenantId });
    }

    const post = await queryBuilder.getOne();
    
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const updateData: Partial<BlogPost> = {};
    
    // Handle title update
    if (updateDto.title !== undefined && updateDto.title.trim()) {
      updateData.title = updateDto.title.trim();
      
      // Auto-regenerate slug if no explicit slug provided
      if (updateDto.slug === undefined) {
        const newSlug = this.generateSlug(updateData.title);
        if (newSlug !== post.slug) {
          const existingSlug = await this.blogPostRepository.findOne({
            where: { slug: newSlug, ...(tenantId && { tenantId }) }
          });
          if (!existingSlug || existingSlug.id === post.id) {
            updateData.slug = newSlug;
          } else {
            updateData.slug = `${newSlug}-${Date.now()}`;
          }
        }
      }
    }

    // Handle explicit slug update
    if (updateDto.slug !== undefined && updateDto.slug.trim()) {
      const newSlug = this.generateSlug(updateDto.slug.trim());
      if (newSlug !== post.slug) {
        const existingSlug = await this.blogPostRepository.findOne({
          where: { slug: newSlug, ...(tenantId && { tenantId }) }
        });
        if (!existingSlug || existingSlug.id === post.id) {
          updateData.slug = newSlug;
        } else {
          updateData.slug = `${newSlug}-${Date.now()}`;
        }
      }
    }

    // Handle other fields
    if (updateDto.content !== undefined) {
      updateData.content = this.sanitizeContent(updateDto.content);
    }

    if (updateDto.excerpt !== undefined) {
      updateData.excerpt = updateDto.excerpt;
    }

    if (updateDto.status && ['draft', 'published'].includes(updateDto.status)) {
      updateData.status = updateDto.status;
    }

    if (updateDto.featuredImage !== undefined) {
      updateData.featuredImage = updateDto.featuredImage || null;
    }

    if (updateDto.categoryIds !== undefined) {
      updateData.categoryIds = updateDto.categoryIds;
    }

    if (updateDto.metaTitle !== undefined) {
      updateData.metaTitle = updateDto.metaTitle || null;
    }

    if (updateDto.metaDescription !== undefined) {
      updateData.metaDescription = updateDto.metaDescription || null;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    await this.blogPostRepository.update(id, updateData);

    // TODO: Activity logging
    console.log(`Admin ${adminId} updated blog post #${id}: ${updateData.title || post.title}`);

    return this.getAdminBlogPost(id, tenantId);
  }

  /**
   * ADMIN: Delete blog post
   * Source: AdminBlogController.destroy
   */
  async deletePost(id: number, adminId: number, tenantId: number): Promise<any> {
    let queryBuilder = this.blogPostRepository.createQueryBuilder('post')
      .where('post.id = :id', { id });

    if (tenantId) {
      queryBuilder = queryBuilder.andWhere('post.tenantId = :tenantId', { tenantId });
    }

    const post = await queryBuilder.getOne();
    
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    await this.blogPostRepository.delete(id);

    // TODO: Activity logging
    console.log(`Admin ${adminId} deleted blog post #${id}: ${post.title}`);

    return {
      data: { deleted: true, id }
    };
  }

  /**
   * ADMIN: Toggle post status
   * Source: AdminBlogController.toggleStatus
   */
  async toggleStatus(id: number, adminId: number, tenantId: number): Promise<any> {
    let queryBuilder = this.blogPostRepository.createQueryBuilder('post')
      .where('post.id = :id', { id });

    if (tenantId) {
      queryBuilder = queryBuilder.andWhere('post.tenantId = :tenantId', { tenantId });
    }

    const post = await queryBuilder.getOne();
    
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const newStatus = post.status === 'published' ? 'draft' : 'published';
    
    await this.blogPostRepository.update(id, { status: newStatus });

    // TODO: Activity logging
    console.log(`Admin ${adminId} changed blog post #${id} status: ${post.status} -> ${newStatus}`);

    return {
      data: {
        id,
        status: newStatus,
      }
    };
  }

  /**
   * ADMIN: Bulk delete posts
   * Source: AdminBlogController.bulkDelete
   */
  async bulkDelete(postIds: number[], adminId: number, tenantId: number): Promise<any> {
    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      throw new BadRequestException('Post IDs are required');
    }

    if (postIds.length > 100) {
      throw new BadRequestException('Cannot delete more than 100 posts at once');
    }

    // Get eligible posts
    let queryBuilder = this.blogPostRepository.createQueryBuilder('post')
      .where('post.id IN (:...ids)', { ids: postIds });

    if (tenantId) {
      queryBuilder = queryBuilder.andWhere('post.tenantId = :tenantId', { tenantId });
    }

    const eligiblePosts = await queryBuilder.getMany();
    const eligibleIds = eligiblePosts.map(p => p.id);
    const skippedIds = postIds.filter(id => !eligibleIds.includes(id));

    let success = 0;
    if (eligibleIds.length > 0) {
      const result = await this.blogPostRepository.delete(eligibleIds);
      success = result.affected || 0;
    }

    // TODO: Activity logging
    console.log(`Admin ${adminId} bulk deleted ${success} blog posts`);

    return {
      data: {
        success,
        failed: skippedIds.length,
        skipped_ids: skippedIds,
      }
    };
  }

  /**
   * ADMIN: Bulk publish posts
   * Source: AdminBlogController.bulkPublish
   */
  async bulkPublish(postIds: number[], adminId: number, tenantId: number): Promise<any> {
    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      throw new BadRequestException('Post IDs are required');
    }

    if (postIds.length > 100) {
      throw new BadRequestException('Cannot publish more than 100 posts at once');
    }

    // Get eligible posts (non-published)
    let queryBuilder = this.blogPostRepository.createQueryBuilder('post')
      .where('post.id IN (:...ids)', { ids: postIds })
      .andWhere('post.status != :status', { status: 'published' });

    if (tenantId) {
      queryBuilder = queryBuilder.andWhere('post.tenantId = :tenantId', { tenantId });
    }

    const eligiblePosts = await queryBuilder.getMany();
    const toPublishIds = eligiblePosts.map(p => p.id);
    const skippedIds = postIds.filter(id => !toPublishIds.includes(id));

    let success = 0;
    if (toPublishIds.length > 0) {
      const result = await this.blogPostRepository.update(toPublishIds, {
        status: 'published',
        publishedAt: Date.now()
      });
      success = result.affected || 0;
    }

    // TODO: Activity logging
    console.log(`Admin ${adminId} bulk published ${success} blog posts`);

    return {
      data: {
        success,
        failed: postIds.length - toPublishIds.length - skippedIds.length,
        skipped_ids: skippedIds,
      }
    };
  }

  /**
   * Increment view count for a blog post
   */
  async incrementViewCount(slug?: string): Promise<any> {
    if (!slug) {
      throw new BadRequestException('Slug is required');
    }

    const post = await this.blogPostRepository.findOne({ where: { slug } });
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    await this.blogPostRepository.update(post.id, {
      viewCount: post.viewCount + 1
    });

    return { data: { success: true, views: post.viewCount + 1 } };
  }

  /**
   * Format blog post as summary with resolved URLs
   * Source: BlogService.formatPostSummary - MISSING IMPLEMENTATION
   */
  async formatPostSummary(slug?: string, baseUrl?: string): Promise<any> {
    if (!slug) {
      throw new BadRequestException('Slug is required');
    }

    const post = await this.blogPostRepository.findOne({ where: { slug } });
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const resolvedBaseUrl = baseUrl || (process.env.APP_URL || 'https://api.project-nexus.ie').replace(/\/$/, '');
    return { data: await this.formatPostSummaryInternal(post, resolvedBaseUrl) };
  }

  /**
   * Format author as summary with resolved avatar URL
   * Source: BlogService.formatAuthor - MISSING IMPLEMENTATION
   */
  async formatAuthorSummary(baseUrl?: string): Promise<any> {
    // Return a default author since no specific author is provided
    const resolvedBaseUrl = baseUrl || (process.env.APP_URL || 'https://api.project-nexus.ie').replace(/\/$/, '');
    return { data: { id: 0, name: 'Unknown', avatar: null } };
  }

  /**
   * Get filtered blog posts by category with pagination
   * Source: BlogService.getPosts
   */
  async getPostsFiltered(category?: string | null, page?: number | null, perPage?: number | null): Promise<any> {
    const pageNum = page || 1;
    const limit = perPage || 20;
    const offset = (pageNum - 1) * limit;

    const queryBuilder = this.blogPostRepository.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.status = :status', { status: 'published' });

    if (category) {
      queryBuilder.andWhere(':category = ANY(post.categoryIds)', { category });
    }

    const total = await queryBuilder.getCount();
    const items = await queryBuilder
      .orderBy('post.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    const baseUrl = (process.env.APP_URL || 'https://api.project-nexus.ie').replace(/\/$/, '');
    const formatted = await Promise.all(
      items.map(async (post) => await this.formatPostSummaryInternal(post, baseUrl))
    );

    return {
      data: {
        items: formatted,
        total,
      }
    };
  }

  /**
   * Get single blog post by slug and update view count
   * Source: BlogService.getBySlug
   */
  async getPostBySlug(slug?: string): Promise<any> {
    if (!slug) {
      throw new BadRequestException('Slug is required');
    }

    const post = await this.blogPostRepository.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.slug = :slug', { slug })
      .andWhere('post.status = :status', { status: 'published' })
      .getOne();

    if (!post) {
      return { data: null };
    }

    const baseUrl = (process.env.APP_URL || 'https://api.project-nexus.ie').replace(/\/$/, '');
    const content = post.content || '';
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    const author = await this.authorRepository.findOne({ where: { userId: post.authorId } });
    const category = await this.resolveCategoryFromIds(post.categoryIds);

    return {
      data: {
        id: post.id,
        title: post.title || '',
        slug: post.slug || '',
        excerpt: post.excerpt || '',
        content,
        featured_image: this.resolveImageUrl(post.featuredImage, baseUrl),
        published_at: post.publishedAt?.toString() || post.createdAt.toISOString(),
        created_at: post.createdAt.toISOString(),
        updated_at: post.createdAt.toISOString(),
        views: post.viewCount || 0,
        reading_time: readingTime,
        meta_title: post.metaTitle || post.title,
        meta_description: post.metaDescription || post.excerpt,
        author: this.formatAuthor(author, baseUrl),
        category: category,
      }
    };
  }

  /**
   * Get all available blog post categories
   * Source: BlogService.getCategories
   */
  async getAllCategories(): Promise<any> {
    const categories = await this.postCategoryRepository.createQueryBuilder('category')
      .select(['category.categorySlug', 'category.categoryName'])
      .groupBy('category.categorySlug')
      .addGroupBy('category.categoryName')
      .getRawMany();

    // Count posts per category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const postCount = await this.blogPostRepository.createQueryBuilder('post')
          .where('post.status = :status', { status: 'published' })
          .andWhere(':category = ANY(post.categoryIds)', { category: cat.category_categorySlug })
          .getCount();

        return {
          id: cat.category_categorySlug,
          name: cat.category_categoryName,
          slug: cat.category_categorySlug,
          color: 'blue',
          post_count: postCount,
        };
      })
    );

    return { data: categoriesWithCounts };
  }

  /**
   * Format blog post as summary with resolved image URLs
   * Source: BlogService.formatPostSummary
   */
  async formatPostWithSummary(slug?: string): Promise<any> {
    if (!slug) {
      throw new BadRequestException('Slug is required');
    }

    const post = await this.blogPostRepository.findOne({ where: { slug } });
    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    const baseUrl = (process.env.APP_URL || 'https://api.project-nexus.ie').replace(/\/$/, '');
    return { data: await this.formatPostSummaryInternal(post, baseUrl) };
  }

  /**
   * Format author information with resolved avatar URL
   * Source: BlogService.formatAuthor
   */
  async formatAuthorInfo(): Promise<any> {
    // Return a default author since no specific author is provided
    const baseUrl = (process.env.APP_URL || 'https://api.project-nexus.ie').replace(/\/$/, '');
    return { data: { id: 0, name: 'Unknown', avatar: null } };
  }

  /**
   * Resolve relative image path to absolute URL
   * Source: BlogService.resolveImageUrl - MISSING IMPLEMENTATION
   */
  async resolveImageUrl(imagePath?: string): Promise<any> {
    if (!imagePath) {
      return { data: null };
    }

    const baseUrl = (process.env.APP_URL || 'https://api.project-nexus.ie').replace(/\/$/, '');
    return { data: this.resolveImageUrlInternal(imagePath, baseUrl) };
  }

  // Private helper methods - MISSING IMPLEMENTATIONS

  private async formatPostSummaryInternal(post: BlogPost, baseUrl: string): Promise<any> {
    const author = await this.authorRepository.findOne({ where: { userId: post.authorId } });
    const category = await this.resolveCategoryFromIds(post.categoryIds);
    const content = post.content || '';
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200));

    return {
      id: post.id,
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      featured_image: this.resolveImageUrlInternal(post.featuredImage, baseUrl),
      published_at: post.publishedAt?.toString() || post.createdAt.toISOString(),
      created_at: post.createdAt.toISOString(),
      views: post.viewCount || 0,
      reading_time: readingTime,
      author: this.formatAuthor(author, baseUrl),
      category: category,
    };
  }

  private formatAuthor(author: Author | null, baseUrl: string): any {
    if (!author) {
      return { id: 0, name: 'Unknown', avatar: null };
    }

    return {
      id: author.userId,
      name: author.name.trim(),
      avatar: this.resolveImageUrlInternal(author.avatar, baseUrl),
    };
  }

  private resolveImageUrlInternal(url: string | null, baseUrl: string): string | null {
    if (!url) {
      return null;
    }
    if (url.startsWith('http')) {
      return url;
    }
    return baseUrl + '/' + url.replace(/^\/+/, '');
  }

  private async resolveCategoryFromIds(categoryIds: number[]): Promise<any> {
    if (!categoryIds || categoryIds.length === 0) {
      return null;
    }

    // Get the first category (assuming primary category)
    const firstCategoryId = categoryIds[0];
    const category = await this.postCategoryRepository.findOne({
      where: { id: firstCategoryId }
    });

    if (!category) {
      return null;
    }

    return {
      id: category.categorySlug,
      name: category.categoryName,
      slug: category.categorySlug,
      color: 'blue',
    };
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private sanitizeContent(content: string): string {
    return this.domPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target']
    });
  }
}