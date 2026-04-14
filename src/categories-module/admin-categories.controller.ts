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
  HttpStatus,
  HttpException,
  UseGuards
} from '@nestjs/common';
import { AdminCategoriesService } from './admin-categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { AdminGuard } from '../auth/guards/admin.guard';

/**
 * AdminCategoriesController -- Admin category and attribute management.
 *
 * Provides full CRUD for categories and attributes in the admin panel.
 * All endpoints require admin authentication.
 * Source: AdminCategoriesController.php
 */
@Controller('api/v2/admin/categories')
@UseGuards(AdminGuard)
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
  async index(@Query('type') type?: string) {
    return this.adminCategoriesService.getAdminCategories(type);
  }

  /**
   * POST /api/v2/admin/categories
   *
   * Create a new category.
   * Required: name. Optional: color, type.
   * Source: AdminCategoriesController.store
   */
  @Post()
  async store(@Body() createCategoryDto: CreateCategoryDto) {
    return this.adminCategoriesService.createCategory(createCategoryDto);
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
    @Body() updateCategoryDto: UpdateCategoryDto
  ) {
    return this.adminCategoriesService.updateCategory(id, updateCategoryDto);
  }

  /**
   * DELETE /api/v2/admin/categories/{id}
   *
   * Delete a category. Unassigns any listings first.
   * Source: AdminCategoriesController.destroy
   */
  @Delete(':id')
  async destroy(@Param('id', ParseIntPipe) id: number) {
    return this.adminCategoriesService.deleteCategory(id);
  }

  /**
   * GET /api/v2/admin/categories/attributes
   *
   * Lists all attributes for the current tenant.
   * Source: AdminCategoriesController.listAttributes
   */
  @Get('attributes')
  async listAttributes() {
    return this.adminCategoriesService.getAdminAttributes();
  }

  /**
   * POST /api/v2/admin/categories/attributes
   *
   * Create a new attribute.
   * Source: AdminCategoriesController.storeAttribute
   */
  @Post('attributes')
  async storeAttribute(@Body() createAttributeDto: CreateAttributeDto) {
    return this.adminCategoriesService.createAttribute(createAttributeDto);
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
    @Body() updateAttributeDto: UpdateAttributeDto
  ) {
    return this.adminCategoriesService.updateAttribute(id, updateAttributeDto);
  }

  /**
   * DELETE /api/v2/admin/categories/attributes/{id}
   *
   * Delete an attribute.
   * Source: AdminCategoriesController.destroyAttribute
   */
  @Delete('attributes/:id')
  async destroyAttribute(@Param('id', ParseIntPipe) id: number) {
    return this.adminCategoriesService.deleteAttribute(id);
  }
}