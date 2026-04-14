import { Injectable, NotFoundException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { Attribute } from './entities/attribute.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class AdminCategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Attribute)
    private readonly attributeRepository: Repository<Attribute>,
    private readonly activityLogService: ActivityLogService,
    private readonly tenantService: TenantService,
  ) {}

  /**
   * Lists all categories for the current tenant, ordered by type then name.
   * Source: AdminCategoriesController.index
   */
  async getAdminCategories(type?: string) {
    const tenantId = this.tenantService.getCurrentTenantId();
    
    const queryBuilder = this.categoryRepository.createQueryBuilder('c')
      .leftJoin('listings', 'l', 'l.category_id = c.id')
      .select([
        'c.id',
        'c.name',
        'c.slug', 
        'c.color',
        'c.type',
        'c.created_at',
        'COUNT(l.id) as listing_count'
      ])
      .where('c.tenant_id = :tenantId', { tenantId })
      .groupBy('c.id');

    if (type && type !== 'all') {
      queryBuilder.andWhere('c.type = :type', { type });
    }

    queryBuilder
      .orderBy('c.type', 'ASC')
      .addOrderBy('c.name', 'ASC')
      .limit(500);

    const items = await queryBuilder.getRawMany();

    const formatted = items.map(row => ({
      id: parseInt(row.c_id),
      name: row.c_name || '',
      slug: row.c_slug || '',
      color: row.c_color || 'blue',
      type: row.c_type || 'listing',
      listing_count: parseInt(row.listing_count) || 0,
      created_at: row.c_created_at,
    }));

    return { data: formatted };
  }

  /**
   * Create a new category.
   * Source: AdminCategoriesController.store
   */
  async createCategory(createCategoryDto: CreateCategoryDto) {
    const adminId = this.tenantService.getCurrentUserId();
    const tenantId = this.tenantService.getCurrentTenantId();

    const { name, color = 'blue', type = 'listing' } = createCategoryDto;

    if (!name || name.trim() === '') {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'Category name is required',
        field: 'name'
      });
    }

    const trimmedName = name.trim();
    const slug = this.generateSlug(trimmedName);

    const allowedTypes = ['listing', 'event', 'blog', 'resource', 'vol_opportunity'];
    if (!allowedTypes.includes(type)) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_INVALID_VALUE',
        message: `Invalid category type. Allowed types: ${allowedTypes.join(', ')}`,
        field: 'type'
      });
    }

    // Check name uniqueness within tenant
    const existing = await this.categoryRepository.findOne({
      where: { name: trimmedName, tenantId }
    });

    if (existing) {
      throw new ConflictException({
        code: 'VALIDATION_DUPLICATE',
        message: 'Category name already exists',
        field: 'name'
      });
    }

    const category = this.categoryRepository.create({
      tenantId,
      name: trimmedName,
      slug,
      color,
      type,
    });

    const savedCategory = await this.categoryRepository.save(category);

    await this.activityLogService.log(
      adminId,
      'admin_create_category',
      `Created category #${savedCategory.id}: ${trimmedName} (type: ${type})`
    );

    return {
      data: {
        id: savedCategory.id,
        name: savedCategory.name,
        slug: savedCategory.slug,
        color: savedCategory.color,
        type: savedCategory.type,
        listing_count: 0,
        created_at: savedCategory.createdAt,
      }
    };
  }

  /**
   * Update an existing category.
   * Source: AdminCategoriesController.update
   */
  async updateCategory(id: number, updateCategoryDto: UpdateCategoryDto) {
    const adminId = this.tenantService.getCurrentUserId();
    const tenantId = this.tenantService.getCurrentTenantId();

    const category = await this.categoryRepository.findOne({
      where: { id, tenantId }
    });

    if (!category) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Category not found'
      });
    }

    const { name, color, type } = updateCategoryDto;

    const updatedName = name && name.trim() !== '' ? name.trim() : category.name;
    const updatedColor = color && color.trim() !== '' ? color.trim() : category.color;
    const updatedType = type && type.trim() !== '' ? type.trim() : category.type;

    const allowedTypes = ['listing', 'event', 'blog', 'resource', 'vol_opportunity'];
    if (!allowedTypes.includes(updatedType)) {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_INVALID_VALUE',
        message: `Invalid category type. Allowed types: ${allowedTypes.join(', ')}`,
        field: 'type'
      });
    }

    // Check name uniqueness if name changed
    if (updatedName !== category.name) {
      const existing = await this.categoryRepository.findOne({
        where: { name: updatedName, tenantId, id: { not: id } }
      });

      if (existing) {
        throw new ConflictException({
          code: 'VALIDATION_DUPLICATE',
          message: 'Category name already exists',
          field: 'name'
        });
      }
    }

    // Regenerate slug if name changed
    let updatedSlug = category.slug;
    if (updatedName !== category.name) {
      updatedSlug = this.generateSlug(updatedName);
    }

    await this.categoryRepository.update(
      { id, tenantId },
      {
        name: updatedName,
        slug: updatedSlug,
        color: updatedColor,
        type: updatedType,
      }
    );

    await this.activityLogService.log(
      adminId,
      'admin_update_category',
      `Updated category #${id}: ${updatedName}`
    );

    // Fetch updated record with listing count
    const updated = await this.categoryRepository
      .createQueryBuilder('c')
      .leftJoin('listings', 'l', 'l.category_id = c.id')
      .select([
        'c.id',
        'c.name',
        'c.slug',
        'c.color',
        'c.type',
        'c.created_at',
        'COUNT(l.id) as listing_count'
      ])
      .where('c.id = :id AND c.tenant_id = :tenantId', { id, tenantId })
      .groupBy('c.id')
      .getRawOne();

    return {
      data: {
        id: parseInt(updated.c_id),
        name: updated.c_name,
        slug: updated.c_slug,
        color: updated.c_color,
        type: updated.c_type,
        listing_count: parseInt(updated.listing_count) || 0,
        created_at: updated.c_created_at,
      }
    };
  }

  /**
   * Delete a category. Unassigns any listings first.
   * Source: AdminCategoriesController.destroy
   */
  async deleteCategory(id: number) {
    const adminId = this.tenantService.getCurrentUserId();
    const tenantId = this.tenantService.getCurrentTenantId();

    const category = await this.categoryRepository
      .createQueryBuilder('c')
      .leftJoin('listings', 'l', 'l.category_id = c.id')
      .select([
        'c.id',
        'c.name',
        'c.type',
        'COUNT(l.id) as listing_count'
      ])
      .where('c.id = :id AND c.tenant_id = :tenantId', { id, tenantId })
      .groupBy('c.id')
      .getRawOne();

    if (!category) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Category not found'
      });
    }

    const listingCount = parseInt(category.listing_count) || 0;

    // Nullify category_id on affected listings
    if (listingCount > 0) {
      await this.categoryRepository.query(
        'UPDATE listings SET category_id = NULL WHERE category_id = ? AND tenant_id = ?',
        [id, tenantId]
      );
    }

    await this.categoryRepository.delete({ id, tenantId });

    const logMessage = `Deleted category #${id}: ${category.c_name}` + 
      (listingCount > 0 ? ` (${listingCount} listings unassigned)` : '');

    await this.activityLogService.log(adminId, 'admin_delete_category', logMessage);

    return {
      data: {
        deleted: true,
        id,
        listings_unassigned: listingCount,
      }
    };
  }

  /**
   * Lists all attributes for the current tenant.
   * Source: AdminCategoriesController.listAttributes
   */
  async getAdminAttributes() {
    const tenantId = this.tenantService.getCurrentTenantId();

    const items = await this.attributeRepository
      .createQueryBuilder('a')
      .leftJoin('categories', 'c', 'a.category_id = c.id')
      .select([
        'a.id',
        'a.name',
        'a.input_type',
        'a.category_id',
        'a.is_active',
        'a.target_type',
        'c.name as category_name'
      ])
      .where('a.tenant_id = :tenantId', { tenantId })
      .orderBy('a.category_id', 'ASC')
      .addOrderBy('a.name', 'ASC')
      .limit(500)
      .getRawMany();

    const formatted = items.map(row => ({
      id: parseInt(row.a_id),
      name: row.a_name || '',
      slug: this.generateSlug(row.a_name || ''),
      type: row.a_input_type || 'checkbox',
      options: null,
      category_id: row.a_category_id ? parseInt(row.a_category_id) : null,
      category_name: row.category_name || null,
      is_active: Boolean(row.a_is_active ?? true),
      target_type: row.a_target_type || 'any',
    }));

    return { data: formatted };
  }

  /**
   * Create a new attribute.
   * Source: AdminCategoriesController.storeAttribute
   */
  async createAttribute(createAttributeDto: CreateAttributeDto) {
    const adminId = this.tenantService.getCurrentUserId();
    const tenantId = this.tenantService.getCurrentTenantId();

    const { name, category_id, type = 'checkbox', input_type } = createAttributeDto;

    if (!name || name.trim() === '') {
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'Attribute name is required',
        field: 'name'
      });
    }

    const trimmedName = name.trim();
    const categoryId = category_id ? parseInt(category_id.toString()) : null;
    const inputType = type || input_type || 'checkbox';

    const attribute = this.attributeRepository.create({
      tenantId,
      name: trimmedName,
      categoryId,
      inputType,
      isActive: true,
    });

    const savedAttribute = await this.attributeRepository.save(attribute);

    await this.activityLogService.log(
      adminId,
      'admin_create_attribute',
      `Created attribute #${savedAttribute.id}: ${trimmedName}`
    );

    return {
      data: {
        id: savedAttribute.id,
        name: savedAttribute.name,
        slug: this.generateSlug(savedAttribute.name),
        type: savedAttribute.inputType,
        options: null,
        category_id: savedAttribute.categoryId,
        is_active: true,
      }
    };
  }

  /**
   * Update an existing attribute.
   * Source: AdminCategoriesController.updateAttribute
   */
  async updateAttribute(id: number, updateAttributeDto: UpdateAttributeDto) {
    const adminId = this.tenantService.getCurrentUserId();
    const tenantId = this.tenantService.getCurrentTenantId();

    const attribute = await this.attributeRepository.findOne({
      where: { id, tenantId }
    });

    if (!attribute) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Attribute not found'
      });
    }

    const { name, category_id, type, input_type, is_active } = updateAttributeDto;

    const updatedName = name && name.trim() !== '' ? name.trim() : attribute.name;
    const updatedCategoryId = category_id !== undefined ? 
      (category_id ? parseInt(category_id.toString()) : null) : 
      (attribute.categoryId || null);
    const updatedInputType = type || input_type || attribute.inputType;
    const updatedIsActive = is_active !== undefined ? 
      Boolean(is_active) : 
      Boolean(attribute.isActive ?? true);

    await this.attributeRepository.update(
      { id, tenantId },
      {
        name: updatedName,
        categoryId: updatedCategoryId,
        inputType: updatedInputType,
        isActive: updatedIsActive,
      }
    );

    await this.activityLogService.log(
      adminId,
      'admin_update_attribute',
      `Updated attribute #${id}: ${updatedName}`
    );

    return {
      data: {
        id,
        name: updatedName,
        slug: this.generateSlug(updatedName),
        type: updatedInputType,
        is_active: updatedIsActive,
      }
    };
  }

  /**
   * Delete an attribute.
   * Source: AdminCategoriesController.destroyAttribute
   */
  async deleteAttribute(id: number) {
    const adminId = this.tenantService.getCurrentUserId();
    const tenantId = this.tenantService.getCurrentTenantId();

    const attribute = await this.attributeRepository.findOne({
      where: { id, tenantId }
    });

    if (!attribute) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Attribute not found'
      });
    }

    await this.attributeRepository.delete({ id, tenantId });

    await this.activityLogService.log(
      adminId,
      'admin_delete_attribute',
      `Deleted attribute #${id}: ${attribute.name}`
    );

    return {
      data: {
        deleted: true,
        id,
      }
    };
  }

  /**
   * Generate URL-friendly slug from name
   */
  private generateSlug(name: string): string {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug || 'untitled';
  }
}