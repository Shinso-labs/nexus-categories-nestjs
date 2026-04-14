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
  async getCategories(@Query('includeInactive') includeInactive?: boolean) {
    return this.categoriesModuleService.getCategories(includeInactive);
  }

  /**
   * Get a specific category by ID
   * Source: 
   */
  @Get()
  async getCategoryById() {
    return this.categoriesModuleService.getCategoryById();
  }

  /**
   * Get a specific category by slug
   * Source: 
   */
  @Get()
  async getCategoryBySlug(@Query('slug') slug?: string) {
    return this.categoriesModuleService.getCategoryBySlug(slug);
  }

  /**
   * Get hierarchical category tree structure
   * Source: 
   */
  @Get()
  async getCategoryTree() {
    return this.categoriesModuleService.getCategoryTree();
  }

  /**
   * Format category data for API response
   * Source: 
   */
  @Get()
  async formatCategorySummary(@Query('includePostCount') includePostCount?: boolean) {
    return this.categoriesModuleService.formatCategorySummary(includePostCount);
  }

  /**
   * Get categories filtered by type
   * Source: CategoryService.getByType
   */
  @Get()
  async getCategoriesByType(@Query('categoryType') categoryType?: string, @Query('includeInactive') includeInactive?: boolean) {
    return this.categoriesModuleService.getCategoriesByType(categoryType, includeInactive);
  }

  /**
   * Get all categories with optional hierarchy and sorting
   * Source: CategoryService.getAll
   */
  @Get()
  async getAllCategoriesService(@Query('includeHierarchy') includeHierarchy?: boolean, @Query('sortBy') sortBy?: string | null) {
    return this.categoriesModuleService.getAllCategoriesService(includeHierarchy, sortBy);
  }
}
