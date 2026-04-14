import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  ParseIntPipe, 
  UseGuards,
  Request,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  ConflictException
} from '@nestjs/common';
import { AdminCategoriesService } from './admin-categories.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';

/**
 * AdminCategoriesController -- Admin category and attribute management.
 * 
 * Provides full CRUD for categories and attributes in the admin panel.
 * All endpoints require admin authentication.
 * Source: AdminCategoriesController
 */
@Controller('admin/categories')
@UseGuards(AdminGuard, TenantGuard)
export class AdminCategoriesController {
  constructor(private readonly adminCategoriesService: AdminCategoriesService) {}

  /**
   * GET /api/v2/admin/categories
   * 
   * Lists all categories for the current tenant, ordered by type then name.
   * Query params: type (filter by category type)
   * Source: AdminCategoriesController.index
   */
  @Get()
  async index(@Query('type') type?: string, @Request() req?: any) {
    const tenantId = req.tenantId;
    return this.adminCategoriesService.getAllCategories(tenantId, type);
  }

  /**
   * POST /api/v2/admin/categories
   * 
   * Create a new category.
   * Required: name. Optional: color, type.
   * Source: AdminCategoriesController.store
   */
  @Post()
  async store(@Body() createCategoryDto: CreateCategoryDto, @Request() req?: any) {
    const adminId = req.user?.id;
    const tenantId = req.tenantId;
    
    if (!adminId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminCategoriesService.createCategory(createCategoryDto, adminId, tenantId);
  }

  /**
   * PUT /api/v2/admin/categories/{id}
   * 
   * Update an existing category.
   * Optional: name, color, type.
   * Source: AdminCategoriesController.update
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Request() req?: any
  ) {
    const adminId = req.user?.id;
    const tenantId = req.tenantId;

    if (!adminId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminCategoriesService.updateCategory(id, updateCategoryDto, adminId, tenantId);
  }

  /**
   * DELETE /api/v2/admin/categories/{id}
   * 
   * Delete a category. Unassigns any listings first.
   * Source: AdminCategoriesController.destroy
   */
  @Delete(':id')
  async destroy(@Param('id', ParseIntPipe) id: number, @Request() req?: any) {
    const adminId = req.user?.id;
    const tenantId = req.tenantId;

    if (!adminId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminCategoriesService.deleteCategory(id, adminId, tenantId);
  }

  // ========================================
  // Attributes CRUD
  // ========================================

  /**
   * GET /api/v2/admin/categories/attributes
   * 
   * Lists all attributes for the current tenant.
   * Source: AdminCategoriesController.listAttributes
   */
  @Get('attributes')
  async listAttributes(@Request() req?: any) {
    const tenantId = req.tenantId;
    return this.adminCategoriesService.getAllAttributes(tenantId);
  }

  /**
   * POST /api/v2/admin/categories/attributes
   * 
   * Create a new attribute.
   * Source: AdminCategoriesController.storeAttribute
   */
  @Post('attributes')
  async storeAttribute(@Body() createAttributeDto: CreateAttributeDto, @Request() req?: any) {
    const adminId = req.user?.id;
    const tenantId = req.tenantId;

    if (!adminId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminCategoriesService.createAttribute(createAttributeDto, adminId, tenantId);
  }

  /**
   * PUT /api/v2/admin/categories/attributes/{id}
   * 
   * Update an existing attribute.
   * Source: AdminCategoriesController.updateAttribute
   */
  @Put('attributes/:id')
  async updateAttribute(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAttributeDto: UpdateAttributeDto,
    @Request() req?: any
  ) {
    const adminId = req.user?.id;
    const tenantId = req.tenantId;

    if (!adminId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminCategoriesService.updateAttribute(id, updateAttributeDto, adminId, tenantId);
  }

  /**
   * DELETE /api/v2/admin/categories/attributes/{id}
   * 
   * Delete an attribute.
   * Source: AdminCategoriesController.destroyAttribute
   */
  @Delete('attributes/:id')
  async destroyAttribute(@Param('id', ParseIntPipe) id: number, @Request() req?: any) {
    const adminId = req.user?.id;
    const tenantId = req.tenantId;

    if (!adminId) {
      throw new BadRequestException('Admin authentication required');
    }

    return this.adminCategoriesService.deleteAttribute(id, adminId, tenantId);
  }
}