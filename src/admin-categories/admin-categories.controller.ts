import { Controller, Query, Param, Body, ParseIntPipe, Get, Post, Put, Delete, BadRequestException, NotFoundException, ConflictException, UseGuards, Req } from '@nestjs/common';
import { AdminCategoriesModuleService } from './admin-categories.service';
import { AdminGuard } from '../guards/admin.guard';
import { Request } from 'express';

@Controller('admin-categories')
@UseGuards(AdminGuard)
export class AdminCategoriesModuleController {
  constructor(private readonly adminCategoriesModuleService: AdminCategoriesModuleService) {}

  /**
   * List all categories with pagination for admin interface
   * Source: AdminCategoriesController.index
   */
  @Get()
  async getAdminCategories(
    @Query('page') page?: number | null, 
    @Query('perPage') perPage?: number | null, 
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Req() req: Request
  ) {
    const adminId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    if (!adminId || !tenantId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminCategoriesModuleService.getAdminCategories(
      page, 
      perPage, 
      type, 
      status, 
      search, 
      tenantId
    );
  }

  /**
   * Create a new category in admin interface
   * Source: AdminCategoriesController.store
   */
  @Post()
  async createAdminCategory(@Body() body: Record<string, any>, @Req() req: Request) {
    const adminId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    if (!adminId || !tenantId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminCategoriesModuleService.createAdminCategory(body, adminId, tenantId);
  }

  /**
   * Update existing category in admin interface
   * Source: AdminCategoriesController.update
   */
  @Put(':id')
  async updateAdminCategory(
    @Param('id', ParseIntPipe) id: number, 
    @Body() body: Record<string, any>,
    @Req() req: Request
  ) {
    const adminId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    if (!adminId || !tenantId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminCategoriesModuleService.updateAdminCategory(id, body, adminId, tenantId);
  }

  /**
   * Delete category from admin interface
   * Source: AdminCategoriesController.destroy
   */
  @Delete(':id')
  async deleteAdminCategory(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const adminId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    if (!adminId || !tenantId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminCategoriesModuleService.deleteAdminCategory(id, adminId, tenantId);
  }

  /**
   * List all attributes with pagination for admin interface
   * Source: AdminCategoriesController.listAttributes
   * Note: This should be on a separate route like /admin-categories/attributes
   */
  @Get('attributes')
  async getAdminAttributes(
    @Query('page') page?: number | null, 
    @Query('perPage') perPage?: number | null,
    @Query('search') search?: string,
    @Req() req: Request
  ) {
    const adminId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    if (!adminId || !tenantId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminCategoriesModuleService.getAdminAttributes(page, perPage, search, tenantId);
  }

  /**
   * Create a new attribute in admin interface
   * Source: AdminCategoriesController.storeAttribute
   * Note: This should be on a separate route like /admin-categories/attributes
   */
  @Post('attributes')
  async createAdminAttribute(@Body() body: Record<string, any>, @Req() req: Request) {
    const adminId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    if (!adminId || !tenantId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminCategoriesModuleService.createAdminAttribute(body, adminId, tenantId);
  }

  /**
   * Update existing attribute in admin interface
   * Source: AdminCategoriesController.updateAttribute
   * Note: This should be on a separate route like /admin-categories/attributes/:id
   */
  @Put('attributes/:id')
  async updateAdminAttribute(
    @Param('id', ParseIntPipe) id: number, 
    @Body() body: Record<string, any>,
    @Req() req: Request
  ) {
    const adminId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    if (!adminId || !tenantId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminCategoriesModuleService.updateAdminAttribute(id, body, adminId, tenantId);
  }

  /**
   * Delete attribute from admin interface
   * Source: AdminCategoriesController.destroyAttribute
   * Note: This should be on a separate route like /admin-categories/attributes/:id
   */
  @Delete('attributes/:id')
  async deleteAdminAttribute(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const adminId = req.user?.id;
    const tenantId = req.user?.tenantId;
    
    if (!adminId || !tenantId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminCategoriesModuleService.deleteAdminAttribute(id, adminId, tenantId);
  }
}