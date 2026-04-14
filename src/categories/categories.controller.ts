import { Controller, Query, Param, Body, ParseIntPipe, Get, UseGuards, Request } from '@nestjs/common';
import { CategoriesModuleService } from './categories.service';
import { TenantGuard } from '../auth/guards/tenant.guard';

/**
 * CategoriesController -- Tenant-scoped listing and service categories.
 * 
 * Uses TypeORM via CategoriesModuleService with automatic tenant scoping.
 * Source: CategoriesController
 */
@Controller('categories')
@UseGuards(TenantGuard)
export class CategoriesModuleController {
  constructor(private readonly categoriesModuleService: CategoriesModuleService) {}

  /**
   * GET /api/v2/categories
   * List categories, optionally filtered by type (listing, event, blog, resource, volunteering)
   * Source: CategoriesController.index
   */
  @Get()
  async index(@Query('type') type?: string, @Request() req?: any) {
    const tenantId = req.tenantId;
    
    if (type) {
      return this.categoriesModuleService.getCategoriesByType(type, tenantId);
    } else {
      return this.categoriesModuleService.getAllCategoriesService(tenantId);
    }
  }

  /**
   * Get all public categories with optional parent filtering
   * Enhanced to match Laravel patterns with tenant scoping
   */
  @Get('all')
  async getCategories(@Query('includeInactive') includeInactive?: boolean, @Request() req?: any) {
    const tenantId = req.tenantId;
    return this.categoriesModuleService.getCategories(includeInactive, tenantId);
  }

  /**
   * Get a specific category by ID
   * Enhanced with tenant scoping
   */
  @Get(':id')
  async getCategoryById(@Param('id', ParseIntPipe) id: number, @Request() req?: any) {
    const tenantId = req.tenantId;
    return this.categoriesModuleService.getCategoryById(id, tenantId);
  }

  /**
   * Get a specific category by slug
   * Enhanced with tenant scoping
   */
  @Get('by-slug/:slug')
  async getCategoryBySlug(@Param('slug') slug: string, @Request() req?: any) {
    const tenantId = req.tenantId;
    return this.categoriesModuleService.getCategoryBySlug(slug, tenantId);
  }

  /**
   * Get hierarchical category tree structure
   * Enhanced with tenant scoping
   */
  @Get('tree')
  async getCategoryTree(@Request() req?: any) {
    const tenantId = req.tenantId;
    return this.categoriesModuleService.getCategoryTree(tenantId);
  }

  /**
   * Format category data for API response
   * Enhanced with tenant scoping
   */
  @Get('summary')
  async formatCategorySummary(
    @Query('includePostCount') includePostCount?: boolean,
    @Request() req?: any
  ) {
    const tenantId = req.tenantId;
    return this.categoriesModuleService.formatCategorySummary(includePostCount, tenantId);
  }
}