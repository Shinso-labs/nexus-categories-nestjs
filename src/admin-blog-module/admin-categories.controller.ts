import { Controller, Query, Param, Body, ParseIntPipe, Get, Post, Put, Delete, Request } from '@nestjs/common';
import { CategoryManagementService } from './category-management.service';

@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categoryManagementService: CategoryManagementService) {}

  /**
   * Get all categories with admin features
   * Source: AdminCategoriesController.index
   */
  @Get()
  async getAllCategories(@Query('type') type?: string, @Request() req?: any) {
    return this.categoryManagementService.getAllCategories(type, req);
  }

  /**
   * Create new category
   * Source: AdminCategoriesController.store  
   */
  @Post()
  async createCategory(@Body() body: Record<string, any>, @Request() req?: any) {
    return this.categoryManagementService.createCategory(body, req);
  }

  /**
   * Update existing category
   * Source: AdminCategoriesController.update
   */
  @Put(':id')
  async updateCategory(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, any>, @Request() req?: any) {
    return this.categoryManagementService.updateCategory(id, body, req);
  }

  /**
   * Delete category
   * Source: AdminCategoriesController.destroy
   */
  @Delete(':id')
  async deleteCategory(@Param('id', ParseIntPipe) id: number, @Request() req?: any) {
    return this.categoryManagementService.deleteCategory(id, req);
  }
}