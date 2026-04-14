import { Controller, Query, Param, Body, ParseIntPipe, Get, Post, Put, Delete, BadRequestException, NotFoundException, ConflictException, UseGuards, Req } from '@nestjs/common';
import { AdminBlogService } from './admin-blog.service';
import { AdminGuard } from '../guards/admin.guard';
import { Request } from 'express';
import { CreateBlogPostDto, UpdateBlogPostDto, BulkOperationDto } from './dto/blog.dto';

@Controller('admin/blog')
@UseGuards(AdminGuard)
export class AdminBlogController {
  constructor(private readonly adminBlogService: AdminBlogService) {}

  /**
   * GET /api/v2/admin/blog
   * Query params: page, limit, status (draft|published), search
   */
  @Get()
  async index(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Req() req: Request
  ) {
    const adminId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    if (!adminId || !tenantId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminBlogService.index({
      page: page || 1,
      limit: Math.min(limit || 20, 100),
      status,
      search,
      adminId,
      tenantId
    });
  }

  /**
   * GET /api/v2/admin/blog/{id}
   */
  @Get(':id')
  async show(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const adminId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    if (!adminId || !tenantId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminBlogService.show(id, tenantId);
  }

  /**
   * POST /api/v2/admin/blog
   */
  @Post()
  async store(@Body() body: CreateBlogPostDto, @Req() req: Request) {
    const adminId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    if (!adminId || !tenantId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminBlogService.store(body, adminId, tenantId);
  }

  /**
   * PUT /api/v2/admin/blog/{id}
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() body: UpdateBlogPostDto, 
    @Req() req: Request
  ) {
    const adminId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    if (!adminId || !tenantId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminBlogService.update(id, body, adminId, tenantId);
  }

  /**
   * DELETE /api/v2/admin/blog/{id}
   */
  @Delete(':id')
  async destroy(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const adminId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    if (!adminId || !tenantId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminBlogService.destroy(id, adminId, tenantId);
  }

  /**
   * POST /api/v2/admin/blog/{id}/toggle-status
   */
  @Post(':id/toggle-status')
  async toggleStatus(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const adminId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    if (!adminId || !tenantId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminBlogService.toggleStatus(id, adminId, tenantId);
  }

  /**
   * POST /api/v2/admin/blog/bulk-delete
   */
  @Post('bulk-delete')
  async bulkDelete(@Body() body: BulkOperationDto, @Req() req: Request) {
    const adminId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    if (!adminId || !tenantId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminBlogService.bulkDelete(body.post_ids || [], adminId, tenantId);
  }

  /**
   * POST /api/v2/admin/blog/bulk-publish
   */
  @Post('bulk-publish')
  async bulkPublish(@Body() body: BulkOperationDto, @Req() req: Request) {
    const adminId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    if (!adminId || !tenantId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminBlogService.bulkPublish(body.post_ids || [], adminId, tenantId);
  }
}