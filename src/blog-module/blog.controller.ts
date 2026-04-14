import { Controller, Query, Param, Body, ParseIntPipe, Get } from '@nestjs/common';
import { BlogModuleService } from './blog.service';

@Controller('blog')
export class BlogModuleController {
  constructor(private readonly blogModuleService: BlogModuleService) {}

  /**
   * Get paginated list of published blog posts with filtering
   * Source: BlogPublicController.index
   */
  @Get()
  async getBlogPosts(@Query('page') page?: number | null, @Query('perPage') perPage?: number | null, @Query('category') category?: string | null, @Query('featured') featured?: boolean | null, @Query('cursor') cursor?: string | null) {
    return this.blogModuleService.getBlogPosts(page, perPage, category, featured, cursor);
  }

  /**
   * Get all blog post categories
   * Source: BlogPublicController.categories
   */
  @Get('categories')
  async getBlogCategories() {
    return this.blogModuleService.getBlogCategories();
  }

  /**
   * Get single blog post by slug and increment view count
   * Source: BlogPublicController.show
   */
  @Get(':slug')
  async getBlogPost(@Param('slug') slug: string) {
    return this.blogModuleService.getBlogPost(slug);
  }

  /**
   * Increment view count for a blog post
   * Source: 
   */
  @Get('increment-view/:slug')
  async incrementViewCount(@Param('slug') slug: string) {
    return this.blogModuleService.incrementViewCount(slug);
  }

  /**
   * Format blog post as summary with resolved URLs
   * Source: 
   */
  @Get('format-summary/:slug')
  async formatPostSummary(@Param('slug') slug: string, @Query('baseUrl') baseUrl?: string) {
    return this.blogModuleService.formatPostSummary(slug, baseUrl);
  }

  /**
   * Format author as summary with resolved avatar URL
   * Source: 
   */
  @Get('format-author')
  async formatAuthorSummary(@Query('baseUrl') baseUrl?: string) {
    return this.blogModuleService.formatAuthorSummary(baseUrl);
  }

  /**
   * Get all published blog posts with pagination
   * Source: BlogService.getAll
   */
  @Get('all')
  async getAllPosts(@Query('page') page?: number | null, @Query('perPage') perPage?: number | null) {
    return this.blogModuleService.getAllPosts(page, perPage);
  }

  /**
   * Get filtered blog posts by category with pagination
   * Source: BlogService.getPosts
   */
  @Get('filtered')
  async getPostsFiltered(@Query('category') category?: string | null, @Query('page') page?: number | null, @Query('perPage') perPage?: number | null) {
    return this.blogModuleService.getPostsFiltered(category, page, perPage);
  }

  /**
   * Get single blog post by slug and update view count
   * Source: BlogService.getBySlug
   */
  @Get('by-slug/:slug')
  async getPostBySlug(@Param('slug') slug: string) {
    return this.blogModuleService.getPostBySlug(slug);
  }

  /**
   * Get all available blog post categories
   * Source: BlogService.getCategories
   */
  @Get('all-categories')
  async getAllCategories() {
    return this.blogModuleService.getAllCategories();
  }

  /**
   * Format blog post as summary with resolved image URLs
   * Source: BlogService.formatPostSummary
   */
  @Get('format-post/:slug')
  async formatPostWithSummary(@Param('slug') slug: string) {
    return this.blogModuleService.formatPostWithSummary(slug);
  }

  /**
   * Format author information with resolved avatar URL
   * Source: BlogService.formatAuthor
   */
  @Get('format-author-info')
  async formatAuthorInfo() {
    return this.blogModuleService.formatAuthorInfo();
  }

  /**
   * Resolve relative image path to absolute URL
   * Source: BlogService.resolveImageUrl
   */
  @Get('resolve-image')
  async resolveImageUrl(@Query('imagePath') imagePath?: string) {
    return this.blogModuleService.resolveImageUrl(imagePath);
  }
}