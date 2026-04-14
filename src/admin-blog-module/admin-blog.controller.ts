import { Controller, Query, Param, Body, ParseIntPipe, Get, Post, Put, Delete, BadRequestException, Request, UseGuards, ForbiddenException } from '@nestjs/common';
import { AdminBlogModuleService } from './admin-blog.service';
import { AdminCategoriesController } from './admin-categories.controller';

@Controller('admin-blog')
export class AdminBlogModuleController {
  constructor(private readonly adminBlogModuleService: AdminBlogModuleService) {}

  /**
   * Get paginated list of blog posts for admin dashboard
   * Source: AdminBlogController.index
   */
  @Get()
  async getAdminBlogPosts(@Query('page') page?: number | null, @Query('perPage') perPage?: number | null, @Query('status') status?: string | null, @Query('search') search?: string | null, @Request() req?: any) {
    return this.adminBlogModuleService.getAdminBlogPosts(page, perPage, status, search, req);
  }

  /**
   * Get single blog post for admin editing
   * Source: AdminBlogController.show
   */
  @Get(':id')
  async getAdminBlogPost(@Param('id', ParseIntPipe) id: number, @Request() req?: any) {
    return this.adminBlogModuleService.getAdminBlogPost(id, req);
  }

  /**
   * Create new blog post
   * Source: AdminBlogController.store
   */
  @Post()
  async createBlogPost(@Body() body: Record<string, any>, @Request() req?: any) {
    return this.adminBlogModuleService.createBlogPost(body, req);
  }

  /**
   * Update existing blog post
   * Source: AdminBlogController.update
   */
  @Put(':id')
  async updateBlogPost(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, any>, @Request() req?: any) {
    return this.adminBlogModuleService.updateBlogPost(id, body, req);
  }

  /**
   * Delete blog post
   * Source: AdminBlogController.destroy
   */
  @Delete(':id')
  async deleteBlogPost(@Param('id', ParseIntPipe) id: number, @Request() req?: any) {
    return this.adminBlogModuleService.deleteBlogPost(id, req);
  }

  /**
   * Toggle blog post status between published and draft
   * Source: AdminBlogController.toggleStatus
   */
  @Post(':id/toggle-status')
  async togglePostStatus(@Param('id', ParseIntPipe) id: number, @Request() req?: any) {
    return this.adminBlogModuleService.togglePostStatus(id, req);
  }

  /**
   * Delete multiple blog posts in bulk
   * Source: AdminBlogController.bulkDelete
   */
  @Post('bulk-delete')
  async bulkDeletePosts(@Body('post_ids') postIds: number[], @Request() req?: any) {
    return this.adminBlogModuleService.bulkDeletePosts(postIds, req);
  }

  /**
   * Publish multiple blog posts in bulk
   * Source: AdminBlogController.bulkPublish
   */
  @Post('bulk-publish')
  async bulkPublishPosts(@Body('post_ids') postIds: number[], @Request() req?: any) {
    return this.adminBlogModuleService.bulkPublishPosts(postIds, req);
  }
}