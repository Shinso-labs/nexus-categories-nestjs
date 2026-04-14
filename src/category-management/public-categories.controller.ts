import { Controller, Get, Query } from '@nestjs/common';
import { CategoryManagementService } from './category-management.service';

/**
 * Public CategoriesController — translated from Laravel.
 * Source: app/Http/Controllers/Api/CategoriesController.php
 *
 * Public read-only endpoints (no auth required).
 */
@Controller('categories')
export class PublicCategoriesController {
  constructor(private readonly service: CategoryManagementService) {}

  /**
   * GET /api/v2/categories
   * List categories, optionally filtered by type.
   * Source: CategoriesController.index() + CategoryService.getByType() / getAll()
   */
  @Get()
  async index(@Query('type') type?: string) {
    // Public categories endpoint does not scope by tenant — returns
    // categories matching the request's tenant context (to be injected
    // via middleware once auth is implemented).
    const tenantId = 1; // TODO: extract from request context
    return this.service.getPublicCategories(tenantId, type);
  }
}
