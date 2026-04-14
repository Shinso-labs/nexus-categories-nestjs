import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Category } from './entities/category.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { BaseApiController } from './base-api.controller';

export interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  parent_id?: number | null;
  type?: string;
  color?: string;
  listing_count?: number;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class CategoryManagementService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
    private readonly dataSource: DataSource,
    private readonly baseApiController: BaseApiController,
  ) {}

  /**
   * Get all blog categories with hierarchy
   * Source: AdminCategoriesController.index
   */
  async getAllCategories(type?: string, req?: any): Promise<{ data: BlogCategory[] }> {
    // Admin authentication check
    const adminId = this.baseApiController.requireAdmin(req);
    
    // Tenant filtering
    const tenantId = this.baseApiController.getTenantId(req);

    // Complex SQL with listing count subquery
    let query = this.dataSource.createQueryBuilder()
      .select([
        'c.*',
        '(SELECT COUNT(*) FROM posts p WHERE p.category_id = c.id) as listing_count'
      ])
      .from('categories', 'c')
      .where('c.tenant_id = :tenantId', { tenantId });

    // Type filtering query parameter
    if (type) {
      query.andWhere('c.type = :type', { type });
    }

    // Proper pagination and formatting
    const page = this.baseApiController.queryInt(req, 'page', 1, 1);
    const limit = this.baseApiController.queryInt(req, 'limit', 20, 1, 100);
    const offset = (page - 1) * limit;

    const total = await query.clone().getCount();
    
    const items = await query
      .orderBy('c.name', 'ASC')
      .limit(limit)
      .offset(offset)
      .getRawMany();

    const formatted = items.map(row => ({
      id: parseInt(row.c_id),
      name: row.c_name || '',
      slug: row.c_slug || '',
      description: row.c_description || '',
      parent_id: row.c_parent_id ? parseInt(row.c_parent_id) : null,
      type: row.c_type || 'general',
      color: row.c_color || null,
      listing_count: parseInt(row.listing_count) || 0,
      created_at: row.c_created_at,
      updated_at: row.c_updated_at,
    }));

    return {
      data: formatted,
    };
  }

  /**
   * Create a new blog category
   * Source: AdminCategoriesController.store
   */
  async createCategory(data: {
    name: string;
    description?: string;
    parent_id?: number | null;
    type?: string;
    color?: string;
  }, req?: any): Promise<{ data: BlogCategory }> {
    // Admin authentication and tenant validation
    const adminId = this.baseApiController.requireAdmin(req);
    const tenantId = this.baseApiController.getTenantId(req);

    const { name, description, parent_id, type, color } = data;

    if (!name || name.trim() === '') {
      throw new BadRequestException('Category name is required');
    }

    // Type validation for allowed category types
    const allowedTypes = ['general', 'blog', 'product', 'service'];
    const categoryType = type && allowedTypes.includes(type) ? type : 'general';

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    // Database uniqueness checking
    const existingSlug = await this.dataSource.createQueryBuilder()
      .select('COUNT(*) as cnt')
      .from('categories', 'c')
      .where('c.slug = :slug AND c.tenant_id = :tenantId', { slug, tenantId })
      .getRawOne();

    let finalSlug = slug;
    if (parseInt(existingSlug.cnt) > 0) {
      finalSlug = `${slug}-${Date.now()}`;
    }

    // Real database insertion
    const result = await this.dataSource.createQueryBuilder()
      .insert()
      .into('categories')
      .values({
        tenant_id: tenantId,
        name: name.trim(),
        slug: finalSlug,
        description: description?.trim() || null,
        parent_id: parent_id || null,
        type: categoryType,
        color: color || null, // Color field handling
        created_at: new Date(),
        updated_at: new Date(),
      })
      .execute();

    const newId = result.identifiers[0].id;

    // Activity logging
    await this.activityLogRepository.save({
      userId: adminId,
      action: 'admin_create_category',
      details: `Created category #${newId}: ${name.trim()}`,
      createdAt: new Date(),
    });

    const newCategory: BlogCategory = {
      id: newId,
      name: name.trim(),
      slug: finalSlug,
      description: description?.trim() || '',
      parent_id: parent_id || null,
      type: categoryType,
      color: color || null,
      listing_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    return {
      data: newCategory,
    };
  }

  /**
   * Update an existing blog category
   * Source: AdminCategoriesController.update
   */
  async updateCategory(
    id: number,
    data: {
      name?: string;
      description?: string;
      parent_id?: number | null;
      type?: string;
      color?: string;
    },
    req?: any
  ): Promise<{ data: BlogCategory }> {
    // Admin authentication and tenant validation
    const adminId = this.baseApiController.requireAdmin(req);
    const tenantId = this.baseApiController.getTenantId(req);

    // Verify category exists and belongs to tenant
    const category = await this.dataSource.createQueryBuilder()
      .select(['id', 'name', 'slug', 'type'])
      .from('categories', 'c')
      .where('c.id = :id AND c.tenant_id = :tenantId', { id, tenantId })
      .getRawOne();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (!data.name && !data.description && data.parent_id === undefined && !data.type && !data.color) {
      throw new BadRequestException('No fields provided for update');
    }

    const updates: any = {};

    if (data.name && data.name.trim() !== '') {
      updates.name = data.name.trim();
      // Auto-generate slug from new name
      const newSlug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (newSlug !== category.slug) {
        const existing = await this.dataSource.createQueryBuilder()
          .select('COUNT(*) as cnt')
          .from('categories', 'c')
          .where('c.slug = :slug AND c.tenant_id = :tenantId AND c.id != :id', { slug: newSlug, tenantId, id })
          .getRawOne();
        
        if (parseInt(existing.cnt) > 0) {
          updates.slug = `${newSlug}-${Date.now()}`;
        } else {
          updates.slug = newSlug;
        }
      }
    }

    if (data.description !== undefined) {
      updates.description = data.description?.trim() || null;
    }

    if (data.parent_id !== undefined) {
      updates.parent_id = data.parent_id || null;
    }

    if (data.type) {
      // Type validation for allowed category types
      const allowedTypes = ['general', 'blog', 'product', 'service'];
      if (allowedTypes.includes(data.type)) {
        updates.type = data.type;
      }
    }

    if (data.color !== undefined) {
      updates.color = data.color || null;
    }

    updates.updated_at = new Date();

    await this.dataSource.createQueryBuilder()
      .update('categories')
      .set(updates)
      .where('id = :id AND tenant_id = :tenantId', { id, tenantId })
      .execute();

    // Activity logging
    await this.activityLogRepository.save({
      userId: adminId,
      action: 'admin_update_category',
      details: `Updated category #${id}: ${data.name || category.name}`,
      createdAt: new Date(),
    });

    // Return updated category
    const updatedCategory = await this.dataSource.createQueryBuilder()
      .select([
        'c.*',
        '(SELECT COUNT(*) FROM posts p WHERE p.category_id = c.id) as listing_count'
      ])
      .from('categories', 'c')
      .where('c.id = :id AND c.tenant_id = :tenantId', { id, tenantId })
      .getRawOne();

    const result: BlogCategory = {
      id: parseInt(updatedCategory.c_id),
      name: updatedCategory.c_name || '',
      slug: updatedCategory.c_slug || '',
      description: updatedCategory.c_description || '',
      parent_id: updatedCategory.c_parent_id ? parseInt(updatedCategory.c_parent_id) : null,
      type: updatedCategory.c_type || 'general',
      color: updatedCategory.c_color || null,
      listing_count: parseInt(updatedCategory.listing_count) || 0,
      created_at: updatedCategory.c_created_at,
      updated_at: updatedCategory.c_updated_at,
    };

    return {
      data: result,
    };
  }

  /**
   * Delete a blog category
   * Source: AdminCategoriesController.destroy
   */
  async deleteCategory(id: number, req?: any): Promise<{ data: { deleted: boolean; id: number } }> {
    // Admin authentication and tenant validation
    const adminId = this.baseApiController.requireAdmin(req);
    const tenantId = this.baseApiController.getTenantId(req);

    // Verify category exists and belongs to tenant
    const category = await this.dataSource.createQueryBuilder()
      .select(['id', 'name'])
      .from('categories', 'c')
      .where('c.id = :id AND c.tenant_id = :tenantId', { id, tenantId })
      .getRawOne();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if category has posts or child categories
    const hasChildren = await this.dataSource.createQueryBuilder()
      .select('COUNT(*) as cnt')
      .from('categories', 'c')
      .where('c.parent_id = :id AND c.tenant_id = :tenantId', { id, tenantId })
      .getRawOne();

    const hasPosts = await this.dataSource.createQueryBuilder()
      .select('COUNT(*) as cnt')
      .from('posts', 'p')
      .where('p.category_id = :id AND p.tenant_id = :tenantId', { id, tenantId })
      .getRawOne();

    if (parseInt(hasChildren.cnt) > 0) {
      throw new BadRequestException('Cannot delete category with child categories');
    }

    if (parseInt(hasPosts.cnt) > 0) {
      throw new BadRequestException('Cannot delete category with associated posts');
    }

    await this.dataSource.createQueryBuilder()
      .delete()
      .from('categories')
      .where('id = :id AND tenant_id = :tenantId', { id, tenantId })
      .execute();

    // Activity logging
    await this.activityLogRepository.save({
      userId: adminId,
      action: 'admin_delete_category',
      details: `Deleted category #${id}: ${category.name}`,
      createdAt: new Date(),
    });

    return {
      data: {
        deleted: true,
        id,
      },
    };
  }
}