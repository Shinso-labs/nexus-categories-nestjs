import { Controller, Query, Param, Body, ParseIntPipe, Get, Post, Put, Delete } from '@nestjs/common';
import { AdminBlogModuleService } from './admin-blog.service';

@Controller('admin-blog')
export class AdminBlogModuleController {
  constructor(private readonly adminBlogModuleService: AdminBlogModuleService) {}

  /**
   * Get paginated list of blog posts for admin dashboard
   * Source: AdminBlogController.index
   */
  @Get()
  async getAdminBlogPosts(@Query('page') page?: number | null, @Query('perPage') perPage?: number | null, @Query('status') status?: string | null) {
    return this.adminBlogModuleService.getAdminBlogPosts(page, perPage, status);
  }

  /**
   * Get single blog post for admin editing
   * Source: AdminBlogController.show
   */
  @Get()
  async getAdminBlogPost() {
    return this.adminBlogModuleService.getAdminBlogPost();
  }

  /**
   * Create new blog post
   * Source: AdminBlogController.store
   */
  @Post()
  async createBlogPost(@Body() body: Record<string, any>) {
    return this.adminBlogModuleService.createBlogPost(body);
  }

  /**
   * Update existing blog post
   * Source: AdminBlogController.update
   */
  @Put(':id')
  async updateBlogPost(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, any>) {
    return this.adminBlogModuleService.updateBlogPost(id, body);
  }

  /**
   * Delete blog post
   * Source: AdminBlogController.destroy
   */
  @Delete(':id')
  async deleteBlogPost(@Param('id', ParseIntPipe) id: number) {
    return this.adminBlogModuleService.deleteBlogPost(id);
  }

  /**
   * Toggle blog post status between published and draft
   * Source: AdminBlogController.toggleStatus
   */
  @Get()
  async togglePostStatus() {
    return this.adminBlogModuleService.togglePostStatus();
  }

  /**
   * Delete multiple blog posts in bulk
   * Source: AdminBlogController.bulkDelete
   */
  @Get()
  async bulkDeletePosts(@Query('postIds') postIds?: number[]) {
    return this.adminBlogModuleService.bulkDeletePosts(postIds);
  }

  /**
   * Publish multiple blog posts in bulk
   * Source: AdminBlogController.bulkPublish
   */
  @Get()
  async bulkPublishPosts(@Query('postIds') postIds?: number[]) {
    return this.adminBlogModuleService.bulkPublishPosts(postIds);
  }
}
