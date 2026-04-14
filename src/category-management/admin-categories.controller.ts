import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, ParseIntPipe, HttpCode,
} from '@nestjs/common';
import { CategoryManagementService } from './category-management.service';
// import { AdminGuard } from '../auth/guards/admin.guard';
// import { UseGuards } from '@nestjs/common';
// import { TenantId } from '../common/decorators/tenant-id.decorator';
// import { AdminId } from '../common/decorators/admin-id.decorator';

/**
 * AdminCategoriesController — translated from Laravel.
 * Source: app/Http/Controllers/Api/AdminCategoriesController.php
 *
 * All endpoints require admin authentication.
 * TODO: Uncomment @UseGuards(AdminGuard) and @TenantId()/@AdminId() decorators
 * once the auth module is implemented.
 */
// @UseGuards(AdminGuard)
@Controller('admin')
export class AdminCategoriesController {
  constructor(private readonly service: CategoryManagementService) {}

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
    // @TenantId() tenantId: number,
    @Query('type') type?: string,
  ) {
    const tenantId = 1; // TODO: extract from auth context
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
    // @AdminId() adminId: number,
    // @TenantId() tenantId: number,
    @Body() body: Record<string, any>,
  ) {
    const tenantId = 1; // TODO: extract from auth context
    const adminId = 1;  // TODO: extract from auth context
    return this.service.createCategory(tenantId, adminId, body);
  }

  /**
   * PUT /api/v2/admin/categories/:id
   * Update an existing category.
   * Source: AdminCategoriesController.update()
   */
  @Put('categories/:id')
  async updateCategory(
    // @AdminId() adminId: number,
    // @TenantId() tenantId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, any>,
  ) {
    const tenantId = 1;
    const adminId = 1;
    return this.service.updateCategory(tenantId, adminId, id, body);
  }

  /**
   * DELETE /api/v2/admin/categories/:id
   * Delete a category. Unassigns any listings first.
   * Source: AdminCategoriesController.destroy()
   */
  @Delete('categories/:id')
  async deleteCategory(
    // @AdminId() adminId: number,
    // @TenantId() tenantId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const tenantId = 1;
    const adminId = 1;
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
    // @TenantId() tenantId: number,
  ) {
    const tenantId = 1;
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
    // @AdminId() adminId: number,
    // @TenantId() tenantId: number,
    @Body() body: Record<string, any>,
  ) {
    const tenantId = 1;
    const adminId = 1;
    return this.service.createAttribute(tenantId, adminId, body);
  }

  /**
   * PUT /api/v2/admin/attributes/:id
   * Update an existing attribute.
   * Source: AdminCategoriesController.updateAttribute()
   */
  @Put('attributes/:id')
  async updateAttribute(
    // @AdminId() adminId: number,
    // @TenantId() tenantId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Record<string, any>,
  ) {
    const tenantId = 1;
    const adminId = 1;
    return this.service.updateAttribute(tenantId, adminId, id, body);
  }

  /**
   * DELETE /api/v2/admin/attributes/:id
   * Delete an attribute.
   * Source: AdminCategoriesController.destroyAttribute()
   */
  @Delete('attributes/:id')
  async deleteAttribute(
    // @AdminId() adminId: number,
    // @TenantId() tenantId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const tenantId = 1;
    const adminId = 1;
    return this.service.deleteAttribute(tenantId, adminId, id);
  }
}
