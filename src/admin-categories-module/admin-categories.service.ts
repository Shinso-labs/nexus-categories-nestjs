import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { AdminCategory } from './entities/admin-category.entity';
import { AdminAttribute } from './entities/admin-attribute.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class AdminCategoriesModuleService {
  constructor(
    @InjectRepository(AdminCategory)
    private readonly categoryRepository: Repository<AdminCategory>,
    @InjectRepository(AdminAttribute)
    private readonly attributeRepository: Repository<AdminAttribute>,
  ) {}

  /**
   * List all categories with pagination for admin interface
   * Source: AdminCategoriesController.index
   */
  async getAdminCategories(page?: number | null, perPage?: number | null, type?: string): Promise<any> {
    // TODO: requireAdmin() - implement auth check
    // TODO: getTenantId() - implement tenant resolution

    const queryBuilder = this.categoryRepository.createQueryBuilder('c')
      .leftJoin('listings', 'l', 'l.category_id = c.id')
      .select([
        'c.id',
        'c.name',
        'c.slug',
        'c.color',
        'c.type',
        'c.createdAt',
        'COUNT(l.id) as listing_count'
      ])
      .groupBy('c.id');

    // TODO: Add tenant filtering when getTenantId() is available
    // .where('c.tenant_id = :tenantId', { tenantId })

    if (type && type !== 'all') {
      queryBuilder.andWhere('c.type = :type', { type });
    }

    const items = await queryBuilder
      .orderBy('c.type', 'ASC')
      .addOrderBy('c.name', 'ASC')
      .limit(500)
      .getRawMany();

    const formatted = items.map(row => ({
      id: parseInt(row.c_id),
      name: row.c_name || '',
      slug: row.c_slug || '',
      color: row.c_color || 'blue',
      type: row.c_type || 'listing',
      listing_count: parseInt(row.listing_count) || 0,
      created_at: row.c_createdAt,
    }));

    return { data: formatted };
  }

  /**
   * Create a new category in admin interface
   * Source: AdminCategoriesController.store
   */
  async createAdminCategory(body: Record<string, any>): Promise<any> {
    // TODO: requireAdmin() - implement auth check
    // TODO: getTenantId() - implement tenant resolution

    const name = body.name?.trim() || '';
    if (name === '') {
      throw new BadRequestException('Category name is required');
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
    const color = body.color?.trim() || 'blue';
    const type = body.type?.trim() || 'listing';

    const allowedTypes = ['listing', 'event', 'blog', 'resource', 'vol_opportunity'];
    if (!allowedTypes.includes(type)) {
      throw new BadRequestException(`Invalid category type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check name uniqueness within tenant
    const existing = await this.categoryRepository.createQueryBuilder('c')
      .where('c.name = :name', { name })
      // TODO: Add tenant filtering when getTenantId() is available
      // .andWhere('c.tenant_id = :tenantId', { tenantId })
      .getOne();

    if (existing) {
      throw new ConflictException('Category name already exists');
    }

    const category = this.categoryRepository.create({
      name,
      slug,
      color,
      type,
      // TODO: Add tenant_id when getTenantId() is available
    });

    const saved = await this.categoryRepository.save(category);

    // TODO: ActivityLog::log() - add activity logging
    // ActivityLog.log(adminId, 'admin_create_category', `Created category #${saved.id}: ${name} (type: ${type})`);

    return { 
      data: {
        id: saved.id,
        name: saved.name,
        slug: saved.slug,
        color: saved.color,
        type: saved.type,
        listing_count: 0,
        created_at: saved.createdAt,
      }
    };
  }

  /**
   * Update existing category in admin interface
   * Source: AdminCategoriesController.update
   */
  async updateAdminCategory(id: number, body: Record<string, any>): Promise<any> {
    // TODO: requireAdmin() - implement auth check
    // TODO: getTenantId() - implement tenant resolution

    const category = await this.categoryRepository.createQueryBuilder('c')
      .where('c.id = :id', { id })
      // TODO: Add tenant filtering when getTenantId() is available
      // .andWhere('c.tenant_id = :tenantId', { tenantId })
      .getOne();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const name = (body.name && body.name.trim() !== '') ? body.name.trim() : category.name;
    const color = (body.color && body.color.trim() !== '') ? body.color.trim() : category.color;
    const type = (body.type && body.type.trim() !== '') ? body.type.trim() : category.type;

    const allowedTypes = ['listing', 'event', 'blog', 'resource', 'vol_opportunity'];
    if (!allowedTypes.includes(type)) {
      throw new BadRequestException(`Invalid category type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check name uniqueness if name changed
    if (name !== category.name) {
      const existing = await this.categoryRepository.createQueryBuilder('c')
        .where('c.name = :name', { name })
        .andWhere('c.id != :id', { id })
        // TODO: Add tenant filtering when getTenantId() is available
        // .andWhere('c.tenant_id = :tenantId', { tenantId })
        .getOne();

      if (existing) {
        throw new ConflictException('Category name already exists');
      }
    }

    // Regenerate slug if name changed
    let slug = category.slug;
    if (name !== category.name) {
      slug = name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
    }

    await this.categoryRepository.update(id, {
      name,
      slug,
      color,
      type,
    });

    // TODO: ActivityLog::log() - add activity logging
    // ActivityLog.log(adminId, 'admin_update_category', `Updated category #${id}: ${name}`);

    // Fetch updated record with listing count
    const updated = await this.categoryRepository.createQueryBuilder('c')
      .leftJoin('listings', 'l', 'l.category_id = c.id')
      .select([
        'c.id',
        'c.name',
        'c.slug',
        'c.color',
        'c.type',
        'c.createdAt',
        'COUNT(l.id) as listing_count'
      ])
      .where('c.id = :id', { id })
      // TODO: Add tenant filtering when getTenantId() is available
      // .andWhere('c.tenant_id = :tenantId', { tenantId })
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
        created_at: updated.c_createdAt,
      }
    };
  }

  /**
   * Delete category from admin interface
   * Source: AdminCategoriesController.destroy
   */
  async deleteAdminCategory(id: number): Promise<any> {
    // TODO: requireAdmin() - implement auth check
    // TODO: getTenantId() - implement tenant resolution

    const category = await this.categoryRepository.createQueryBuilder('c')
      .leftJoin('listings', 'l', 'l.category_id = c.id')
      .select([
        'c.id',
        'c.name',
        'COUNT(l.id) as listing_count'
      ])
      .where('c.id = :id', { id })
      // TODO: Add tenant filtering when getTenantId() is available
      // .andWhere('c.tenant_id = :tenantId', { tenantId })
      .groupBy('c.id')
      .getRawOne();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const listingCount = parseInt(category.listing_count) || 0;

    // Nullify category_id on affected listings
    if (listingCount > 0) {
      // TODO: Update listings table when available
      // await this.dataSource.query(
      //   'UPDATE listings SET category_id = NULL WHERE category_id = ? AND tenant_id = ?',
      //   [id, tenantId]
      // );
    }

    await this.categoryRepository.delete(id);

    // TODO: ActivityLog::log() - add activity logging
    const message = `Deleted category #${id}: ${category.c_name}` + (listingCount > 0 ? ` (${listingCount} listings unassigned)` : '');

    return {
      data: {
        deleted: true,
        id: id,
        listings_unassigned: listingCount,
      }
    };
  }

  /**
   * List all attributes with pagination for admin interface
   * Source: AdminCategoriesController.listAttributes
   */
  async getAdminAttributes(page?: number | null, perPage?: number | null): Promise<any> {
    // TODO: requireAdmin() - implement auth check
    // TODO: getTenantId() - implement tenant resolution

    const items = await this.attributeRepository.createQueryBuilder('a')
      .leftJoin('categories', 'c', 'a.category_id = c.id')
      .select([
        'a.id',
        'a.name',
        'a.attributeType',
        'a.defaultValue',
        'a.isRequired',
        'a.isSearchable',
        'a.sortOrder',
        'c.name as category_name'
      ])
      // TODO: Add tenant filtering when getTenantId() is available
      // .where('a.tenant_id = :tenantId', { tenantId })
      .orderBy('a.sortOrder', 'ASC')
      .addOrderBy('a.name', 'ASC')
      .limit(500)
      .getRawMany();

    const formatted = items.map(row => ({
      id: parseInt(row.a_id),
      name: row.a_name || '',
      slug: (row.a_name || '').toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, ''),
      type: row.a_attributeType || 'checkbox',
      options: null,
      category_id: row.a_category_id ? parseInt(row.a_category_id) : null,
      category_name: row.category_name || null,
      is_active: true, // TODO: Add is_active field to entity if needed
      target_type: 'any', // TODO: Add target_type field to entity if needed
    }));

    return { data: formatted };
  }

  /**
   * Create a new attribute in admin interface
   * Source: AdminCategoriesController.storeAttribute
   */
  async createAdminAttribute(body: Record<string, any>): Promise<any> {
    // TODO: requireAdmin() - implement auth check
    // TODO: getTenantId() - implement tenant resolution

    const name = body.name?.trim() || '';
    if (name === '') {
      throw new BadRequestException('Attribute name is required');
    }

    const categoryId = body.category_id ? parseInt(body.category_id) : null;
    const inputType = body.type?.trim() || body.input_type?.trim() || 'checkbox';

    const attribute = this.attributeRepository.create({
      name,
      attributeType: inputType,
      // TODO: Add tenant_id when getTenantId() is available
      // tenant_id: tenantId,
      // category_id: categoryId, // TODO: Add when foreign key is properly set up
      isRequired: false,
      isSearchable: false,
      sortOrder: 0,
    });

    const saved = await this.attributeRepository.save(attribute);

    // TODO: ActivityLog::log() - add activity logging
    // ActivityLog.log(adminId, 'admin_create_attribute', `Created attribute #${saved.id}: ${name}`);

    return {
      data: {
        id: saved.id,
        name: saved.name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, ''),
        type: saved.attributeType,
        options: null,
        category_id: categoryId,
        is_active: true,
      }
    };
  }

  /**
   * Update existing attribute in admin interface
   * Source: AdminCategoriesController.updateAttribute
   */
  async updateAdminAttribute(id: number, body: Record<string, any>): Promise<any> {
    // TODO: requireAdmin() - implement auth check
    // TODO: getTenantId() - implement tenant resolution

    const attribute = await this.attributeRepository.createQueryBuilder('a')
      .where('a.id = :id', { id })
      // TODO: Add tenant filtering when getTenantId() is available
      // .andWhere('a.tenant_id = :tenantId', { tenantId })
      .getOne();

    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    const name = (body.name && body.name.trim() !== '') ? body.name.trim() : attribute.name;
    const categoryId = 'category_id' in body ? (body.category_id ? parseInt(body.category_id) : null) : null;
    const inputType = body.type?.trim() || body.input_type?.trim() || attribute.attributeType;
    const isActive = 'is_active' in body ? !!body.is_active : true;

    await this.attributeRepository.update(id, {
      name,
      attributeType: inputType,
      // TODO: Add category_id when foreign key is properly set up
      // category_id: categoryId,
      // TODO: Add is_active field to entity if needed
    });

    // TODO: ActivityLog::log() - add activity logging
    // ActivityLog.log(adminId, 'admin_update_attribute', `Updated attribute #${id}: ${name}`);

    return {
      data: {
        id: id,
        name: name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, ''),
        type: inputType,
        is_active: isActive,
      }
    };
  }

  /**
   * Delete attribute from admin interface
   * Source: AdminCategoriesController.destroyAttribute
   */
  async deleteAdminAttribute(id: number): Promise<any> {
    // TODO: requireAdmin() - implement auth check
    // TODO: getTenantId() - implement tenant resolution

    const attribute = await this.attributeRepository.createQueryBuilder('a')
      .where('a.id = :id', { id })
      // TODO: Add tenant filtering when getTenantId() is available
      // .andWhere('a.tenant_id = :tenantId', { tenantId })
      .getOne();

    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    await this.attributeRepository.delete(id);

    // TODO: ActivityLog::log() - add activity logging
    // ActivityLog.log(adminId, 'admin_delete_attribute', `Deleted attribute #${id}: ${attribute.name}`);

    return {
      data: {
        deleted: true,
        id: id,
      }
    };
  }
}