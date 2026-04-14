import { Controller, Query, Param, Body, ParseIntPipe, Get, Post, Put, Delete } from '@nestjs/common';
import { AdminCategoriesModuleService } from './admin-categories.service';

@Controller('admin-categories')
export class AdminCategoriesModuleController {
  constructor(private readonly adminCategoriesModuleService: AdminCategoriesModuleService) {}

  /**
   * List all categories with pagination for admin interface
   * Source: AdminCategoriesController.index
   */
  @Get()
  async getAdminCategories(@Query('page') page?: number | null, @Query('perPage') perPage?: number | null) {
    return this.adminCategoriesModuleService.getAdminCategories(page, perPage);
  }

  /**
   * Create a new category in admin interface
   * Source: AdminCategoriesController.store
   */
  @Post()
  async createAdminCategory(@Body() body: Record<string, any>) {
    return this.adminCategoriesModuleService.createAdminCategory(body);
  }

  /**
   * Update existing category in admin interface
   * Source: AdminCategoriesController.update
   */
  @Put(':id')
  async updateAdminCategory(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, any>) {
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
  @Get()
  async getAdminAttributes(@Query('page') page?: number | null, @Query('perPage') perPage?: number | null) {
    return this.adminCategoriesModuleService.getAdminAttributes(page, perPage);
  }

  /**
   * Create a new attribute in admin interface
   * Source: AdminCategoriesController.storeAttribute
   */
  @Post()
  async createAdminAttribute(@Body() body: Record<string, any>) {
    return this.adminCategoriesModuleService.createAdminAttribute(body);
  }

  /**
   * Update existing attribute in admin interface
   * Source: AdminCategoriesController.updateAttribute
   */
  @Put(':id')
  async updateAdminAttribute(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, any>) {
    return this.adminCategoriesModuleService.updateAdminAttribute(id, body);
  }

  /**
   * Delete attribute from admin interface
   * Source: AdminCategoriesController.destroyAttribute
   */
  @Delete(':id')
  async deleteAdminAttribute(@Param('id', ParseIntPipe) id: number) {
    return this.adminCategoriesModuleService.deleteAdminAttribute(id);
  }
}
