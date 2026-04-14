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
    const formatted = await Promise.all(
      items.map(async (post) => await this.formatPostSummaryInternal(post, baseUrl.replace(/\/$/, '')))
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
        featured_image: this.resolveImageUrlInternal(post.featuredImage, baseUrl),
        published_at: post.publishedAt?.toString() || post.createdAt.toISOString(),
        created_at: post.createdAt.toISOString(),
        updated_at: post.createdAt.toISOString(),
        views: post.viewCount || 0,
        reading_time: readingTime,
        meta_title: post.metaTitle || post.title,
        meta_description: post.metaDescription || post.excerpt,
        author: this.formatAuthorInternal(author, baseUrl),
        category: category,
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
    return { data: await this.formatPostSummaryInternal(post, resolvedBaseUrl) };
  }

  /**
   * Format author as summary with resolved avatar URL
   */
  async formatAuthorSummary(baseUrl?: string): Promise<any> {
    // Return a default author since no specific author is provided
    const resolvedBaseUrl = baseUrl || (process.env.APP_URL || 'https://api.project-nexus.ie').replace(/\/$/, '');
    return { data: { id: 0, name: 'Unknown', avatar: null } };
  }

  /**
   * Get all published blog posts with pagination
   * Source: BlogService.getAll
   */
  async getAllPosts(page?: number | null, perPage?: number | null): Promise<any> {
    const limit = Math.min(perPage || 20, 100);

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
    const formatted = await Promise.all(
      items.map(async (post) => await this.formatPostSummaryInternal(post, baseUrl))
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
        featured_image: this.resolveImageUrlInternal(post.featuredImage, baseUrl),
        published_at: post.publishedAt?.toString() || post.createdAt.toISOString(),
        created_at: post.createdAt.toISOString(),
        updated_at: post.createdAt.toISOString(),
        views: post.viewCount || 0,
        reading_time: readingTime,
        meta_title: post.metaTitle || post.title,
        meta_description: post.metaDescription || post.excerpt,
        author: this.formatAuthorInternal(author, baseUrl),
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
      author: this.formatAuthorInternal(author, baseUrl),
      category: category,
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
}