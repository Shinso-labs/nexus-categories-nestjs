import { Controller, Query, Param, Body, ParseIntPipe, Get, Post, Put, Delete, UseGuards, Request, BadRequestException, ForbiddenException } from '@nestjs/common';
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
   * Get all published blog posts with pagination - ADMIN
   * Source: AdminBlogController.index with admin authentication
   */
  @Get('admin/all')
  async getAllPosts(
    @Request() req: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string
  ) {
    const adminId = this.requireAdmin(req);
    const tenantId = this.getTenantId(req);
    return this.blogModuleService.getAllPosts(page, limit, status, search, tenantId, adminId);
  }

  /**
   * Get single blog post by ID - ADMIN
   * Source: AdminBlogController.show
   */
  @Get('admin/:id')
  async getAdminBlogPost(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const adminId = this.requireAdmin(req);
    const tenantId = this.getTenantId(req);
    return this.blogModuleService.getAdminBlogPost(id, tenantId);
  }

  /**
   * Create new blog post - ADMIN
   * Source: AdminBlogController.store
   */
  @Post('admin')
  async createPost(@Request() req: any, @Body() createBlogDto: CreateBlogModuleDto) {
    const adminId = this.requireAdmin(req);
    const tenantId = this.getTenantId(req);
    return this.blogModuleService.createPost(createBlogDto, adminId, tenantId);
  }

  /**
   * Update blog post - ADMIN
   * Source: AdminBlogController.update
   */
  @Put('admin/:id')
  async updatePost(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBlogDto: UpdateBlogModuleDto
  ) {
    const adminId = this.requireAdmin(req);
    const tenantId = this.getTenantId(req);
    return this.blogModuleService.updatePost(id, updateBlogDto, adminId, tenantId);
  }

  /**
   * Delete blog post - ADMIN
   * Source: AdminBlogController.destroy
   */
  @Delete('admin/:id')
  async deletePost(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const adminId = this.requireAdmin(req);
    const tenantId = this.getTenantId(req);
    return this.blogModuleService.deletePost(id, adminId, tenantId);
  }

  /**
   * Toggle post status - ADMIN
   * Source: AdminBlogController.toggleStatus
   */
  @Post('admin/:id/toggle-status')
  async toggleStatus(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const adminId = this.requireAdmin(req);
    const tenantId = this.getTenantId(req);
    return this.blogModuleService.toggleStatus(id, adminId, tenantId);
  }

  /**
   * Bulk delete posts - ADMIN
   * Source: AdminBlogController.bulkDelete
   */
  @Post('admin/bulk-delete')
  async bulkDelete(@Request() req: any, @Body() bulkDeleteDto: BulkDeleteDto) {
    const adminId = this.requireAdmin(req);
    const tenantId = this.getTenantId(req);
    return this.blogModuleService.bulkDelete(bulkDeleteDto.post_ids, adminId, tenantId);
  }

  /**
   * Bulk publish posts - ADMIN
   * Source: AdminBlogController.bulkPublish
   */
  @Post('admin/bulk-publish')
  async bulkPublish(@Request() req: any, @Body() bulkPublishDto: BulkPublishDto) {
    const adminId = this.requireAdmin(req);
    const tenantId = this.getTenantId(req);
    return this.blogModuleService.bulkPublish(bulkPublishDto.post_ids, adminId, tenantId);
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

  // Admin helper methods
  private requireAdmin(req: any): number {
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    if (!user.isAdmin && user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    return user.id;
  }

  private getTenantId(req: any): number {
    const user = req.user;
    if (!user || !user.tenantId) {
      throw new BadRequestException('Tenant context required');
    }
    return user.tenantId;
  }

  private respondWithPaginatedCollection(data: any[], total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit);
    return {
      data: {
        items: data,
        pagination: {
          current_page: page,
          per_page: limit,
          total: total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1,
        }
      }
    };
  }

  private respondWithData(data: any, message?: string, statusCode = 200) {
    return {
      data,
      message,
      status: statusCode
    };
  }

  private respondWithError(code: string, message: string, field?: string, statusCode = 400) {
    throw new BadRequestException({
      error: {
        code,
        message,
        field
      }
    });
  }
}