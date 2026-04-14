import { Controller, Query, Param, Body, ParseIntPipe, Get, Post, Put, Delete, UseGuards } from '@nestjs/common';
import { AdminCategoriesModuleService } from './admin-categories.service';
import { CreateAdminCategoriesModuleDto } from './dto/create-admin-categories.dto';
import { UpdateAdminCategoriesModuleDto } from './dto/update-admin-categories.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { ReorderAttributesDto } from './dto/reorder-attributes.dto';

@Controller('admin-categories')
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
    @Query('type') type?: string
  ) {
    return this.adminCategoriesModuleService.getAdminCategories(page, perPage, type);
  }

  /**
   * Get single category details for admin interface
   * Source: AdminCategoriesController.show
   */
  @Get(':id')
  async show(@Param('id', ParseIntPipe) id: number) {
    return this.adminCategoriesModuleService.show(id);
  }

  /**
   * Create a new category in admin interface
   * Source: AdminCategoriesController.store
   */
  @Post()
  async createAdminCategory(@Body() body: CreateAdminCategoriesModuleDto) {
    return this.adminCategoriesModuleService.createAdminCategory(body);
  }

  /**
   * Update existing category in admin interface
   * Source: AdminCategoriesController.update
   */
  @Put(':id')
  async updateAdminCategory(
    @Param('id', ParseIntPipe) id: number, 
    @Body() body: UpdateAdminCategoriesModuleDto
  ) {
    return this.adminCategoriesModuleService.updateAdminCategory(id, body);
  }

  /**
   * Delete category from admin interface
   * Source: AdminCategoriesController.destroy
   */
  @Delete(':id')
  async deleteAdminCategory(@Param('id', ParseIntPipe) id: number) {
    return this.adminCategoriesModuleService.deleteAdminCategory(id);
  }

  /**
   * List all attributes with pagination for admin interface
   * Source: AdminCategoriesController.listAttributes
   */
  @Get('attributes')
  async getAdminAttributes(
    @Query('page') page?: number | null, 
    @Query('perPage') perPage?: number | null,
    @Query('category_id') categoryId?: number,
    @Query('target_type') targetType?: string
  ) {
    return this.adminCategoriesModuleService.getAdminAttributes(page, perPage, categoryId, targetType);
  }

  /**
   * Create a new attribute in admin interface
   * Source: AdminCategoriesController.storeAttribute
   */
  @Post('attributes')
  async createAdminAttribute(@Body() body: Record<string, any>) {
    return this.adminCategoriesModuleService.createAdminAttribute(body);
  }

  /**
   * Update existing attribute in admin interface
   * Source: AdminCategoriesController.updateAttribute
   */
  @Put('attributes/:id')
  async updateAdminAttribute(
    @Param('id', ParseIntPipe) id: number, 
    @Body() body: Record<string, any>
  ) {
    return this.adminCategoriesModuleService.updateAdminAttribute(id, body);
  }

  /**
   * Delete attribute from admin interface
   * Source: AdminCategoriesController.destroyAttribute
   */
  @Delete('attributes/:id')
  async deleteAdminAttribute(@Param('id', ParseIntPipe) id: number) {
    return this.adminCategoriesModuleService.deleteAdminAttribute(id);
  }

  /**
   * Bulk delete attributes
   * Source: AdminCategoriesController.bulkDeleteAttributes
   */
  @Post('attributes/bulk-delete')
  async bulkDeleteAttributes(@Body() bulkDeleteDto: BulkDeleteDto) {
    return this.adminCategoriesModuleService.bulkDeleteAttributes(bulkDeleteDto);
  }

  /**
   * Reorder attributes
   * Source: AdminCategoriesController.reorderAttributes
   */
  @Post('attributes/reorder')
  async reorderAttributes(@Body() reorderDto: ReorderAttributesDto) {
    return this.adminCategoriesModuleService.reorderAttributes(reorderDto);
  }

  /**
   * Parse bulk IDs utility method
   */
  private parseBulkIds(ids: number[]): number[] {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('Bulk IDs required');
    }
    const validIds = [...new Set(ids.filter(id => Number.isInteger(id) && id > 0))];
    if (validIds.length === 0) {
      throw new BadRequestException('Valid IDs required');
    }
    return validIds;
  }
}