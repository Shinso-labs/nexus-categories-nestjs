import { Controller, Get, Query, Request } from '@nestjs/common';
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

  private extractTenantId(req: any): number {
    // Extract tenant ID from request context (headers, subdomain, etc.)
    return req.tenantId || req.headers['x-tenant-id'] || req.subdomains?.[0] || 1;
  }

  /**
   * GET /api/v2/categories
   * List categories, optionally filtered by type.
   * Source: CategoriesController.index() + CategoryService.getByType() / getAll()
   */
  @Get()
  async index(
    @Request() req: any,
    @Query('type') type?: string,
  ) {
    // Extract tenant context from request
    const tenantId = this.extractTenantId(req);
    return this.service.getPublicCategories(tenantId, type);
  }
}