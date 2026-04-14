import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Query, 
  Param, 
  Body, 
  ParseIntPipe, 
  UseGuards,
  BadRequestException,
  NotFoundException,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { AdminBlogService } from './admin-blog.service';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { BulkPublishDto } from './dto/bulk-publish.dto';

@Controller('api/v2/admin/blog')
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
    @Query('search') search?: string
  ) {
    return this.adminBlogService.index(page, limit, status, search);
  }

  /**
   * GET /api/v2/admin/blog/:id
   */
  @Get(':id')
  async show(@Param('id', ParseIntPipe) id: number) {
    return this.adminBlogService.show(id);
  }

  /**
   * POST /api/v2/admin/blog
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async store(@Body() createBlogPostDto: CreateBlogPostDto) {
    return this.adminBlogService.store(createBlogPostDto);
  }

  /**
   * PUT /api/v2/admin/blog/:id
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBlogPostDto: UpdateBlogPostDto
  ) {
    return this.adminBlogService.update(id, updateBlogPostDto);
  }

  /**
   * DELETE /api/v2/admin/blog/:id
   */
  @Delete(':id')
  async destroy(@Param('id', ParseIntPipe) id: number) {
    return this.adminBlogService.destroy(id);
  }

  /**
   * POST /api/v2/admin/blog/:id/toggle-status
   */
  @Post(':id/toggle-status')
  async toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.adminBlogService.toggleStatus(id);
  }

  /**
   * POST /api/v2/admin/blog/bulk-delete
   */
  @Post('bulk-delete')
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteDto) {
    return this.adminBlogService.bulkDelete(bulkDeleteDto);
  }

  /**
   * POST /api/v2/admin/blog/bulk-publish
   */
  @Post('bulk-publish')
  async bulkPublish(@Body() bulkPublishDto: BulkPublishDto) {
    return this.adminBlogService.bulkPublish(bulkPublishDto);
  }
}