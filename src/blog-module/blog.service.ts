import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { BlogPost } from './entities/blog-post.entity';
import { Author } from './entities/author.entity';
import { PostCategory } from './entities/post-category.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class BlogModuleService {
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
    const formatted = items.map(post => this.formatPostSummaryInternal(post, baseUrl.replace(/\/$/, '')));

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

    const formattedCategories = categories.map(cat => ({
      id: cat.category_categorySlug,
      name: cat.category_categoryName,
      slug: cat.category_categorySlug,
      color: 'blue',
      post_count: 0,
    }));

    return { data: formattedCategories };
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

    return {
      data: {
        id: post.id,
        title: post.title || '',
        slug: post.slug || '',
        excerpt: post.excerpt || '',
        content,
        featured_image: this.resolveImageUrlInternal(post.featuredImage, baseUrl),
        published_at: post.publishedAt?.toString() || post.createdAt.toISOString(),
        created_at: post.createdAt.toISOString(),
        updated_at: post.createdAt.toISOString(),
        views: post.viewCount || 0,
        reading_time: readingTime,
        meta_title: post.metaTitle || post.title,
        meta_description: post.metaDescription || post.excerpt,
        author: this.formatAuthorInternal(author, baseUrl),
        category: null, // TODO: resolve category from categoryIds
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
    return { data: this.formatPostSummaryInternal(post, resolvedBaseUrl) };
  }

  /**
   * Format author as summary with resolved avatar URL
   */
  async formatAuthorSummary(baseUrl?: string): Promise<any> {
    // This method seems incomplete in the original Laravel - returning empty implementation
    const resolvedBaseUrl = baseUrl || (process.env.APP_URL || 'https://api.project-nexus.ie').replace(/\/$/, '');
    return { data: { id: 0, name: 'Unknown', avatar: null } };
  }

  /**
   * Get all published blog posts with pagination
   * Source: BlogService.getAll
   */
  async getAllPosts(page?: number | null, perPage?: number | null): Promise<any> {
    const limit = Math.min(perPage || 20, 100);
    const cursor = null; // Using offset pagination here

    const queryBuilder = this.blogPostRepository.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .where('post.status = :status', { status: 'published' })
      .orderBy('post.createdAt', 'DESC')
      .limit(limit + 1);

    const items = await queryBuilder.getMany();
    const hasMore = items.length > limit;
    if (hasMore) {
      items.pop();
    }

    const baseUrl = (process.env.APP_URL || 'https://api.project-nexus.ie').replace(/\/$/, '');
    const formatted = items.map(post => this.formatPostSummaryInternal(post, baseUrl));

    return {
      data: {
        items: formatted,
        cursor: hasMore && items.length > 0 ? Buffer.from(items[items.length - 1].id.toString()).toString('base64') : null,
        has_more: hasMore,
      }
    };
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
    const formatted = items.map(post => this.formatPostSummaryInternal(post, baseUrl));

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

    return {
      data: {
        id: post.id,
        title: post.title || '',
        slug: post.slug || '',
        excerpt: post.excerpt || '',
        content,
        featured_image: this.resolveImageUrlInternal(post.featuredImage, baseUrl),
        published_at: post.publishedAt?.toString() || post.createdAt.toISOString(),
        created_at: post.createdAt.toISOString(),
        updated_at: post.createdAt.toISOString(),
        views: post.viewCount || 0,
        reading_time: readingTime,
        meta_title: post.metaTitle || post.title,
        meta_description: post.metaDescription || post.excerpt,
        author: this.formatAuthorInternal(author, baseUrl),
        category: null, // TODO: resolve category from categoryIds
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

    const formattedCategories = categories.map(cat => ({
      id: cat.category_categorySlug,
      name: cat.category_categoryName,
      slug: cat.category_categorySlug,
      color: 'blue',
      post_count: 0, // TODO: count posts per category
    }));

    return { data: formattedCategories };
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
    return { data: this.formatPostSummaryInternal(post, baseUrl) };
  }

  /**
   * Format author information with resolved avatar URL
   * Source: BlogService.formatAuthor
   */
  async formatAuthorInfo(): Promise<any> {
    // This method needs an author parameter in the original Laravel code
    // Returning generic response for now
    const baseUrl = (process.env.APP_URL || 'https://api.project-nexus.ie').replace(/\/$/, '');
    return { data: { id: 0, name: 'Unknown', avatar: null } };
  }

  /**
   * Resolve relative image path to absolute URL
   * Source: BlogService.resolveImageUrl
   */
  async resolveImageUrl(imagePath?: string): Promise<any> {
    if (!imagePath) {
      return { data: null };
    }

    const baseUrl = (process.env.APP_URL || 'https://api.project-nexus.ie').replace(/\/$/, '');
    return { data: this.resolveImageUrlInternal(imagePath, baseUrl) };
  }

  // Private helper methods

  private formatPostSummaryInternal(post: BlogPost, baseUrl: string): any {
    return {
      id: post.id,
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      featured_image: this.resolveImageUrlInternal(post.featuredImage, baseUrl),
      published_at: post.publishedAt?.toString() || post.createdAt.toISOString(),
      created_at: post.createdAt.toISOString(),
      views: post.viewCount || 0,
      reading_time: 3, // Default reading time
      author: { id: post.authorId, name: 'Unknown', avatar: null }, // TODO: resolve author
      category: null, // TODO: resolve category from categoryIds
    };
  }

  private formatAuthorInternal(author: Author | null, baseUrl: string): any {
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
}