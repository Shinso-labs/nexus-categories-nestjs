import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, ParseIntPipe, HttpCode,
  UseGuards, Request,
} from '@nestjs/common';
import { CategoryManagementService } from './category-management.service';
import { CreateCategoryDto, UpdateCategoryDto, CreateAttributeDto, UpdateAttributeDto } from './dto/create-category-management.dto';

/**
 * AdminCategoriesController — translated from Laravel.
 * Source: app/Http/Controllers/Api/AdminCategoriesController.php
 *
 * All endpoints require admin authentication.
 * For now, tenant and admin IDs are extracted from request context.
 */
@Controller('admin')
export class AdminCategoriesController {
  constructor(private readonly service: CategoryManagementService) {}

  private extractTenantId(req: any): number {
    // Extract tenant ID from request context (headers, JWT, subdomain, etc.)
    return req.tenantId || req.user?.tenantId || Number(req.headers['x-tenant-id']) || 1;
  }

  private extractAdminId(req: any): number {
    // Extract admin ID from request context (JWT payload, user object, etc.)
    return req.user?.id || req.adminId || Number(req.headers['x-admin-id']) || 1;
  }

  // =========================================================================
  // Categories CRUD
  // Source: AdminCategoriesController lines 30-198
  // =========================================================================

  /**
   * GET /api/v2/admin/categories
   * Lists all categories for the current tenant, ordered by type then name.
   * Source: AdminCategoriesController.index()
   */
  @Get('categories')
  async listCategories(
    @Request() req: any,
    @Query('type') type?: string,
  ) {
    const tenantId = this.extractTenantId(req);
    return this.service.listCategories(tenantId, type);
  }

  /**
   * POST /api/v2/admin/categories
   * Create a new category.
   * Source: AdminCategoriesController.store()
   */
  @Post('categories')
  @HttpCode(201)
  async createCategory(
    @Request() req: any,
    @Body() body: CreateCategoryDto,
  ) {
    const tenantId = this.extractTenantId(req);
    const adminId = this.extractAdminId(req);
    return this.service.createCategory(tenantId, adminId, body);
  }

  /**
   * PUT /api/v2/admin/categories/:id
   * Update an existing category.
   * Source: AdminCategoriesController.update()
   */
  @Put('categories/:id')
  async updateCategory(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCategoryDto,
  ) {
    const tenantId = this.extractTenantId(req);
    const adminId = this.extractAdminId(req);
    return this.service.updateCategory(tenantId, adminId, id, body);
  }

  /**
   * DELETE /api/v2/admin/categories/:id
   * Delete a category. Unassigns any listings first.
   * Source: AdminCategoriesController.destroy()
   */
  @Delete('categories/:id')
  async deleteCategory(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const tenantId = this.extractTenantId(req);
    const adminId = this.extractAdminId(req);
    return this.service.deleteCategory(tenantId, adminId, id);
  }

  // =========================================================================
  // Attributes CRUD
  // Source: AdminCategoriesController lines 200-340
  // Route: /api/v2/admin/attributes (NOT /admin/categories/attributes)
  // =========================================================================

  /**
   * GET /api/v2/admin/attributes
   * Lists all attributes for the current tenant.
   * Source: AdminCategoriesController.listAttributes()
   */
  @Get('attributes')
  async listAttributes(
    @Request() req: any,
  ) {
    const tenantId = this.extractTenantId(req);
    return this.service.listAttributes(tenantId);
  }

  /**
   * POST /api/v2/admin/attributes
   * Create a new attribute.
   * Source: AdminCategoriesController.storeAttribute()
   */
  @Post('attributes')
  @HttpCode(201)
  async createAttribute(
    @Request() req: any,
    @Body() body: CreateAttributeDto,
  ) {
    const tenantId = this.extractTenantId(req);
    const adminId = this.extractAdminId(req);
    return this.service.createAttribute(tenantId, adminId, body);
  }

  /**
   * PUT /api/v2/admin/attributes/:id
   * Update an existing attribute.
   * Source: AdminCategoriesController.updateAttribute()
   */
  @Put('attributes/:id')
  async updateAttribute(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAttributeDto,
  ) {
    const tenantId = this.extractTenantId(req);
    const adminId = this.extractAdminId(req);
    return this.service.updateAttribute(tenantId, adminId, id, body);
  }

  /**
   * DELETE /api/v2/admin/attributes/:id
   * Delete an attribute.
   * Source: AdminCategoriesController.destroyAttribute()
   */
  @Delete('attributes/:id')
  async deleteAttribute(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const tenantId = this.extractTenantId(req);
    const adminId = this.extractAdminId(req);
    return this.service.deleteAttribute(tenantId, adminId, id);
  }
}