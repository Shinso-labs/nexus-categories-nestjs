import { Controller, Query, Param, Body, ParseIntPipe, Get } from '@nestjs/common';
import { CategoriesModuleService } from './categories.service';

@Controller('categories')
export class CategoriesModuleController {
  constructor(private readonly categoriesModuleService: CategoriesModuleService) {}

  /**
   * GET /api/v2/categories
   * List categories, optionally filtered by type (listing, event, blog, resource, volunteering)
   * Source: CategoriesController.index
   */
  @Get()
  async index(@Query('type') type?: string) {
    if (type) {
      return this.categoriesModuleService.getCategoriesByType(type, false);
    } else {
      return this.categoriesModuleService.getAllCategoriesService(false, 'type');
    }
  }

  /**
   * Get all public categories with optional parent filtering
   * Source: CategoriesController.index
   */
  @Get('all')
  async getCategories(@Query('includeInactive') includeInactive?: boolean) {
    return this.categoriesModuleService.getCategories(includeInactive);
  }

  /**
   * Get a specific category by ID
   */
  @Get(':id')
  async getCategoryById(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesModuleService.getCategoryById(id);
  }

  /**
   * Get a specific category by slug
   */
  @Get('by-slug/:slug')
  async getCategoryBySlug(@Param('slug') slug: string) {
    return this.categoriesModuleService.getCategoryBySlug(slug);
  }

  /**
   * Get hierarchical category tree structure
   */
  @Get('tree')
  async getCategoryTree() {
    return this.categoriesModuleService.getCategoryTree();
  }

  /**
   * Format category data for API response
   */
  @Get('summary')
  async formatCategorySummary(@Query('includePostCount') includePostCount?: boolean) {
    return this.categoriesModuleService.formatCategorySummary(includePostCount);
  }
}