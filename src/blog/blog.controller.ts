import { Controller, Query, Param, Body, ParseIntPipe, Get, Post, Put, Delete, UseGuards } from '@nestjs/common';
import { BlogModuleService } from './blog.service';
import { CreateBlogModuleDto } from './dto/create-blog.dto';
import { UpdateBlogModuleDto } from './dto/update-blog.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { BulkPublishDto } from './dto/bulk-publish.dto';

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
  @Get(':slug/increment-view')
  async incrementViewCount(@Param('slug') slug: string) {
    return this.blogModuleService.incrementViewCount(slug);
  }

  /**
   * Format blog post as summary with resolved URLs
   * Source: 
   */
  @Get(':slug/summary')
  async formatPostSummary(@Param('slug') slug: string, @Query('baseUrl') baseUrl?: string) {
    return this.blogModuleService.formatPostSummary(slug, baseUrl);
  }

  /**
   * Format author as summary with resolved avatar URL
   * Source: 
   */
  @Get('author/summary')
  async formatAuthorSummary(@Query('baseUrl') baseUrl?: string) {
    return this.blogModuleService.formatAuthorSummary(baseUrl);
  }

  /**
   * Get all published blog posts with pagination
   * Source: BlogService.getAll
   */
  @Get('posts/all')
  async getAllPosts(@Query('page') page?: number | null, @Query('perPage') perPage?: number | null) {
    return this.blogModuleService.getAllPosts(page, perPage);
  }

  /**
   * Get filtered blog posts by category with pagination
   * Source: BlogService.getPosts
   */
  @Get('posts/filtered')
  async getPostsFiltered(@Query('category') category?: string | null, @Query('page') page?: number | null, @Query('perPage') perPage?: number | null) {
    return this.blogModuleService.getPostsFiltered(category, page, perPage);
  }

  /**
   * Get single blog post by slug and update view count
   * Source: BlogService.getBySlug
   */
  @Get('posts/:slug')
  async getPostBySlug(@Param('slug') slug: string) {
    return this.blogModuleService.getPostBySlug(slug);
  }

  /**
   * Get all available blog post categories
   * Source: BlogService.getCategories
   */
  @Get('categories/all')
  async getAllCategories() {
    return this.blogModuleService.getAllCategories();
  }

  /**
   * Format blog post as summary with resolved image URLs
   * Source: BlogService.formatPostSummary
   */
  @Get('posts/:slug/format-summary')
  async formatPostWithSummary(@Param('slug') slug: string) {
    return this.blogModuleService.formatPostWithSummary(slug);
  }

  /**
   * Format author information with resolved avatar URL
   * Source: BlogService.formatAuthor
   */
  @Get('author/format')
  async formatAuthorInfo() {
    return this.blogModuleService.formatAuthorInfo();
  }

  /**
   * Resolve relative image path to absolute URL
   * Source: BlogService.resolveImageUrl
   */
  @Get('image/resolve')
  async resolveImageUrl(@Query('imagePath') imagePath?: string) {
    return this.blogModuleService.resolveImageUrl(imagePath);
  }
}

@Controller('admin/blog')
export class AdminBlogController {
  constructor(private readonly blogModuleService: BlogModuleService) {}

  /**
   * GET /admin/blog - Admin blog post listing
   * Source: AdminBlogController.index
   */
  @Get()
  async index(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    return this.blogModuleService.adminIndex(page, limit, status, search);
  }

  /**
   * GET /admin/blog/{id} - Admin single post view
   * Source: AdminBlogController.show
   */
  @Get(':id')
  async show(@Param('id', ParseIntPipe) id: number) {
    return this.blogModuleService.adminShow(id);
  }

  /**
   * POST /admin/blog - Create new blog post
   * Source: AdminBlogController.store
   */
  @Post()
  async store(@Body() createBlogDto: CreateBlogModuleDto) {
    return this.blogModuleService.adminStore(createBlogDto);
  }

  /**
   * PUT /admin/blog/{id} - Update blog post
   * Source: AdminBlogController.update
   */
  @Put(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateBlogDto: UpdateBlogModuleDto) {
    return this.blogModuleService.adminUpdate(id, updateBlogDto);
  }

  /**
   * DELETE /admin/blog/{id} - Delete blog post
   * Source: AdminBlogController.destroy
   */
  @Delete(':id')
  async destroy(@Param('id', ParseIntPipe) id: number) {
    return this.blogModuleService.adminDestroy(id);
  }

  /**
   * POST /admin/blog/{id}/toggle-status - Toggle post status
   * Source: AdminBlogController.toggleStatus
   */
  @Post(':id/toggle-status')
  async toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.blogModuleService.adminToggleStatus(id);
  }

  /**
   * POST /admin/blog/bulk-delete - Bulk delete posts
   * Source: AdminBlogController.bulkDelete
   */
  @Post('bulk-delete')
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteDto) {
    return this.blogModuleService.adminBulkDelete(bulkDeleteDto.post_ids);
  }

  /**
   * POST /admin/blog/bulk-publish - Bulk publish posts
   * Source: AdminBlogController.bulkPublish
   */
  @Post('bulk-publish')
  async bulkPublish(@Body() bulkPublishDto: BulkPublishDto) {
    return this.blogModuleService.adminBulkPublish(bulkPublishDto.post_ids);
  }
}