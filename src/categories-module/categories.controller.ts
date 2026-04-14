import { Controller, Query, Param, Body, ParseIntPipe, Get } from '@nestjs/common';
import { CategoriesModuleService } from './categories.service';

@Controller('categories')
export class CategoriesModuleController {
  constructor(private readonly categoriesModuleService: CategoriesModuleService) {}

  /**
   * Get all public categories with optional parent filtering
   * Source: CategoriesController.index
   */
  @Get()
  async getCategories(@Query('type') type?: string) {
    if (type) {
      return this.categoriesModuleService.getCategoriesByType(type);
    } else {
      return this.categoriesModuleService.getAllCategoriesService();
    }
  }

  /**
   * Get a specific category by ID
   * Source: CategoriesController.show
   */
  @Get(':id')
  async getCategoryById(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesModuleService.getCategoryById(id);
  }

  /**
   * Get a specific category by slug
   * Source: CategoriesController.findBySlug
   */
  @Get('by-slug')
  async getCategoryBySlug(@Query('slug') slug: string) {
    return this.categoriesModuleService.getCategoryBySlug(slug);
  }

  /**
   * Get hierarchical category tree structure
   * Source: CategoriesController.tree
   */
  @Get('tree')
  async getCategoryTree() {
    return this.categoriesModuleService.getCategoryTree();
  }

  /**
   * Format category data for API response
   * Source: CategoriesController.summary
   */
  @Get('summary')
  async formatCategorySummary(@Query('includePostCount') includePostCount?: boolean) {
    return this.categoriesModuleService.formatCategorySummary(includePostCount);
  }
}