import {
  Injectable, NotFoundException, BadRequestException, ConflictException, HttpException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { Attribute } from './entities/category-attribute.entity';

/**
 * CategoryManagementService — translated from Laravel.
 *
 * Source: app/Services/CategoryService.php
 *         app/Http/Controllers/Api/AdminCategoriesController.php
 *
 * All methods are tenant-scoped, matching Laravel's HasTenantScope trait.
 */
@Injectable()
export class CategoryManagementService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Attribute)
    private readonly attributeRepo: Repository<Attribute>,
  ) {}

  // =========================================================================
  // Activity logging helper
  // =========================================================================

  private async logActivity(adminId: number, action: string, message: string) {
    // Simple logging implementation for now
    // TODO: Replace with proper ActivityLogService when available
    console.log(`[ACTIVITY] Admin ${adminId} - ${action}: ${message}`);
    
    // Store in database if needed
    // Implementation would depend on activity log table structure
  }

  // =========================================================================
  // Error helpers — match Laravel BaseApiController response format
  // =========================================================================

  private respondWithData(data: any, meta?: any, statusCode = 200) {
    // Laravel's respondWithData wraps in { data, meta }
    const response: any = { data };
    if (meta) response.meta = meta;
    return response;
  }

  private respondWithError(
    code: string, message: string, field: string | null, statusCode: number,
  ): never {
    // Laravel's respondWithError returns { errors: [{ code, message, field? }] }
    throw new HttpException(
      { errors: [{ code, message, ...(field ? { field } : {}) }] },
      statusCode,
    );
  }

  // =========================================================================
  // Admin: Categories CRUD
  // Source: AdminCategoriesController.php
  // =========================================================================

  /**
   * GET /api/v2/admin/categories
   * Source: AdminCategoriesController.index()
   */
  async listCategories(tenantId: number, type?: string) {
    const qb = this.categoryRepo
      .createQueryBuilder('c')
      .select([
        'c.id', 'c.name', 'c.slug', 'c.color', 'c.type', 'c.created_at',
      ])
      .addSelect(
        '(SELECT COUNT(*) FROM listings l WHERE l.category_id = c.id)',
        'listing_count',
      )
      .where('c.tenant_id = :tenantId', { tenantId })
      .orderBy('c.type', 'ASC')
      .addOrderBy('c.name', 'ASC')
      .limit(500);

    if (type && type !== 'all') {
      qb.andWhere('c.type = :type', { type });
    }

    const items = await qb.getRawMany();

    return this.respondWithData(
      items.map((row) => ({
        id: Number(row.c_id),
        name: row.c_name ?? '',
        slug: row.c_slug ?? '',
        color: row.c_color ?? 'blue',
        type: row.c_type ?? 'listing',
        listing_count: Number(row.listing_count ?? 0),
        created_at: row.c_created_at,
      })),
    );
  }

  /**
   * POST /api/v2/admin/categories
   * Source: AdminCategoriesController.store()
   */
  async createCategory(tenantId: number, adminId: number, body: Record<string, any>) {
    const name = (body.name || '').trim();
    if (!name) {
      this.respondWithError('VALIDATION_ERROR', 'Category name is required', 'name', 422);
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const color = (body.color || 'blue').trim();
    const type = (body.type || 'listing').trim();

    const allowedTypes = ['listing', 'event', 'blog', 'resource', 'vol_opportunity'];
    if (!allowedTypes.includes(type)) {
      this.respondWithError(
        'VALIDATION_INVALID_VALUE',
        `Invalid category type. Allowed: ${allowedTypes.join(', ')}`,
        'type', 422,
      );
    }

    // Check name uniqueness within tenant
    const existing = await this.categoryRepo.findOne({
      where: { name, tenantId },
    });
    if (existing) {
      this.respondWithError('VALIDATION_DUPLICATE', 'Category name already exists', 'name', 409);
    }

    const category = await this.categoryRepo.save(
      this.categoryRepo.create({ tenantId, name, slug, color, type }),
    );

    // Activity log
    await this.logActivity(adminId, 'admin_create_category', 
      `Created category #${category.id}: ${name} (type: ${type})`);

    return this.respondWithData({
      id: category.id,
      name: category.name,
      slug: category.slug,
      color: category.color,
      type: category.type,
      listing_count: 0,
      created_at: category.createdAt,
    });
  }

  /**
   * PUT /api/v2/admin/categories/:id
   * Source: AdminCategoriesController.update()
   */
  async updateCategory(tenantId: number, adminId: number, id: number, body: Record<string, any>) {
    const category = await this.categoryRepo.findOne({
      where: { id, tenantId },
    });
    if (!category) {
      this.respondWithError('RESOURCE_NOT_FOUND', 'Category not found', null, 404);
    }

    const name = body.name?.trim() || category!.name;
    const color = body.color?.trim() || category!.color;
    const type = body.type?.trim() || category!.type;

    const allowedTypes = ['listing', 'event', 'blog', 'resource', 'vol_opportunity'];
    if (!allowedTypes.includes(type)) {
      this.respondWithError(
        'VALIDATION_INVALID_VALUE',
        `Invalid category type. Allowed: ${allowedTypes.join(', ')}`,
        'type', 422,
      );
    }

    // Check name uniqueness if changed
    if (name !== category!.name) {
      const existing = await this.categoryRepo.findOne({
        where: { name, tenantId },
      });
      if (existing && existing.id !== id) {
        this.respondWithError('VALIDATION_DUPLICATE', 'Category name already exists', 'name', 409);
      }
    }

    const slug = name !== category!.name
      ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : category!.slug;

    await this.categoryRepo.update(id, { name, slug, color, type });

    // Activity log
    await this.logActivity(adminId, 'admin_update_category', `Updated category #${id}: ${name}`);

    const updated = await this.categoryRepo
      .createQueryBuilder('c')
      .addSelect(
        '(SELECT COUNT(*) FROM listings l WHERE l.category_id = c.id)',
        'listing_count',
      )
      .where('c.id = :id AND c.tenant_id = :tenantId', { id, tenantId })
      .getRawOne();

    return this.respondWithData({
      id: Number(updated.c_id),
      name: updated.c_name,
      slug: updated.c_slug,
      color: updated.c_color,
      type: updated.c_type,
      listing_count: Number(updated.listing_count ?? 0),
      created_at: updated.c_created_at,
    });
  }

  /**
   * DELETE /api/v2/admin/categories/:id
   * Source: AdminCategoriesController.destroy()
   */
  async deleteCategory(tenantId: number, adminId: number, id: number) {
    const result = await this.categoryRepo
      .createQueryBuilder('c')
      .addSelect(
        '(SELECT COUNT(*) FROM listings l WHERE l.category_id = c.id)',
        'listing_count',
      )
      .where('c.id = :id AND c.tenant_id = :tenantId', { id, tenantId })
      .getRawOne();

    if (!result) {
      this.respondWithError('RESOURCE_NOT_FOUND', 'Category not found', null, 404);
    }

    const listingCount = Number(result.listing_count ?? 0);

    // Unassign listings before deletion
    if (listingCount > 0) {
      await this.categoryRepo.manager
        .createQueryBuilder()
        .update('listings')
        .set({ category_id: () => 'NULL' })
        .where('category_id = :id AND tenant_id = :tenantId', { id, tenantId })
        .execute();
    }

    await this.categoryRepo.delete({ id, tenantId });

    // Activity log
    await this.logActivity(adminId, 'admin_delete_category',
      `Deleted category #${id}: ${result.c_name}${listingCount > 0 ? ` (${listingCount} listings unassigned)` : ''}`);

    return this.respondWithData({
      deleted: true,
      id,
      listings_unassigned: listingCount,
    });
  }

  // =========================================================================
  // Admin: Attributes CRUD
  // Source: AdminCategoriesController.php lines 205-340
  // =========================================================================

  /**
   * GET /api/v2/admin/attributes
   * Source: AdminCategoriesController.listAttributes()
   */
  async listAttributes(tenantId: number) {
    const items = await this.attributeRepo
      .createQueryBuilder('a')
      .leftJoin(Category, 'c', 'a.category_id = c.id')
      .addSelect('c.name', 'category_name')
      .where('a.tenant_id = :tenantId', { tenantId })
      .orderBy('a.category_id', 'ASC')
      .addOrderBy('a.name', 'ASC')
      .limit(500)
      .getRawAndEntities();

    return this.respondWithData(
      items.raw.map((row, i) => {
        const a = items.entities[i];
        return {
          id: a.id,
          name: a.name ?? '',
          slug: (a.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          type: a.inputType ?? 'checkbox',
          options: null,
          category_id: a.categoryId,
          category_name: row.category_name ?? null,
          is_active: a.isActive ?? true,
          target_type: a.targetType ?? 'any',
        };
      }),
    );
  }

  /**
   * POST /api/v2/admin/attributes
   * Source: AdminCategoriesController.storeAttribute()
   */
  async createAttribute(tenantId: number, adminId: number, body: Record<string, any>) {
    const name = (body.name || '').trim();
    if (!name) {
      this.respondWithError('VALIDATION_ERROR', 'Attribute name is required', 'name', 422);
    }

    const categoryId = body.category_id ? Number(body.category_id) : null;
    const inputType = (body.type || body.input_type || 'checkbox').trim();

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const targetType = (body.target_type || 'any').trim();
    const attribute = await this.attributeRepo.save(
      this.attributeRepo.create({
        tenantId,
        name,
        slug,
        categoryId,
        inputType,
        targetType,
        isActive: true,
      }),
    );

    // Activity log
    await this.logActivity(adminId, 'admin_create_attribute', `Created attribute #${attribute.id}: ${name}`);

    return this.respondWithData({
      id: attribute.id,
      name: attribute.name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      type: inputType,
      options: null,
      category_id: categoryId,
      is_active: true,
    });
  }

  /**
   * PUT /api/v2/admin/attributes/:id
   * Source: AdminCategoriesController.updateAttribute()
   */
  async updateAttribute(tenantId: number, adminId: number, id: number, body: Record<string, any>) {
    const attribute = await this.attributeRepo.findOne({
      where: { id, tenantId },
    });
    if (!attribute) {
      this.respondWithError('RESOURCE_NOT_FOUND', 'Attribute not found', null, 404);
    }

    const name = body.name?.trim() || attribute!.name;
    const categoryId = body.category_id !== undefined ? (body.category_id || null) : attribute!.categoryId;
    const inputType = body.type?.trim() || body.input_type?.trim() || attribute!.inputType;
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : attribute!.isActive;

    await this.attributeRepo.update(id, { name, categoryId, inputType, isActive });

    // Activity log
    await this.logActivity(adminId, 'admin_update_attribute', `Updated attribute #${id}: ${name}`);

    return this.respondWithData({
      id,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      type: inputType,
      is_active: isActive,
    });
  }

  /**
   * DELETE /api/v2/admin/attributes/:id
   * Source: AdminCategoriesController.destroyAttribute()
   */
  async deleteAttribute(tenantId: number, adminId: number, id: number) {
    const attribute = await this.attributeRepo.findOne({
      where: { id, tenantId },
    });
    if (!attribute) {
      this.respondWithError('RESOURCE_NOT_FOUND', 'Attribute not found', null, 404);
    }

    await this.attributeRepo.delete({ id, tenantId });

    // Activity log
    await this.logActivity(adminId, 'admin_delete_attribute', `Deleted attribute #${id}: ${attribute!.name}`);

    return this.respondWithData({ deleted: true, id });
  }

  // =========================================================================
  // Public: Categories read-only
  // Source: CategoriesController.php + CategoryService.php
  // =========================================================================

  /**
   * GET /api/v2/categories
   * Source: CategoriesController.index() → CategoryService.getByType() / getAll()
   */
  async getPublicCategories(tenantId: number, type?: string) {
    if (type) {
      // CategoryService.getByType()
      const categories = await this.categoryRepo.find({
        where: { tenantId, type },
        order: { name: 'ASC' },
      });
      return this.respondWithData(categories);
    }

    // CategoryService.getAll()
    const categories = await this.categoryRepo.find({
      where: { tenantId },
      order: { type: 'ASC', name: 'ASC' },
    });
    return this.respondWithData(categories);
  }
}