import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { AdminCategory } from './entities/admin-category.entity';
import { AdminAttribute } from './entities/admin-attribute.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

@Injectable()
export class AdminCategoriesModuleService {
  constructor(
    @InjectRepository(AdminCategory)
    private readonly categoryRepository: Repository<AdminCategory>,
    @InjectRepository(AdminAttribute)
    private readonly attributeRepository: Repository<AdminAttribute>,
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * List all categories with pagination for admin interface
   * Source: AdminCategoriesController.index
   */
  async getAdminCategories(
    page?: number | null, 
    perPage?: number | null, 
    type?: string,
    status?: string,
    search?: string,
    tenantId?: number
  ): Promise<any> {
    const pageNum = Math.max(page || 1, 1);
    const limitNum = Math.min(Math.max(perPage || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select([
        'c.id',
        'c.name',
        'c.slug', 
        'c.description',
        'c.parent_id',
        'c.sort_order',
        'c.is_active',
        'c.meta_title',
        'c.meta_description',
        'c.created_at',
        'p.name as parent_name',
        '(SELECT COUNT(*) FROM categories sub WHERE sub.parent_id = c.id AND sub.tenant_id = c.tenant_id) as children_count'
      ])
      .from('categories', 'c')
      .leftJoin('categories', 'p', 'c.parent_id = p.id');

    if (tenantId) {
      queryBuilder.where('c.tenant_id = :tenantId', { tenantId });
    }

    if (status && ['active', 'inactive'].includes(status)) {
      const isActive = status === 'active';
      queryBuilder.andWhere('c.is_active = :isActive', { isActive });
    }

    if (search) {
      queryBuilder.andWhere('(c.name LIKE :search OR c.description LIKE :search)', { 
        search: `%${search}%` 
      });
    }

    const totalQuery = queryBuilder.clone();
    const total = await totalQuery.getCount();

    const items = await queryBuilder
      .orderBy('c.name', 'ASC')
      .limit(limitNum)
      .offset(offset)
      .getRawMany();

    const formatted = items.map(row => ({
      id: parseInt(row.id),
      name: row.name || '',
      slug: row.slug || '',
      description: row.description,
      parent_id: row.parent_id ? parseInt(row.parent_id) : null,
      parent_name: row.parent_name || null,
      sort_order: parseInt(row.sort_order || '0'),
      is_active: Boolean(row.is_active),
      meta_title: row.meta_title,
      meta_description: row.meta_description,
      children_count: parseInt(row.children_count || '0'),
      created_at: row.created_at,
    }));

    return { 
      data: formatted,
      pagination: {
        page: pageNum,
        per_page: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Create a new category in admin interface
   * Source: AdminCategoriesController.store
   */
  async createAdminCategory(body: Record<string, any>, adminId: number, tenantId: number): Promise<any> {
    const name = (body.name || '').trim();
    if (name === '') {
      throw new BadRequestException('Category name is required');
    }

    let slug = this.generateSlug(name);
    
    // Allow custom slug
    if (body.slug && body.slug.trim()) {
      slug = this.generateSlug(body.slug);
    }
    
    // Check name uniqueness within tenant
    const existingName = await this.dataSource.query(
      'SELECT COUNT(*) as cnt FROM categories WHERE name = ? AND tenant_id = ?',
      [name, tenantId]
    );

    if (existingName[0].cnt > 0) {
      throw new ConflictException('Category name already exists');
    }

    // Check slug uniqueness within tenant
    const existingSlug = await this.dataSource.query(
      'SELECT COUNT(*) as cnt FROM categories WHERE slug = ? AND tenant_id = ?',
      [slug, tenantId]
    );

    if (existingSlug[0].cnt > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const newCategory = this.categoryRepository.create({
      tenantId,
      name,
      slug,
      description: body.description || null,
      parentId: body.parent_id || null,
      sortOrder: body.sort_order || 0,
      isActive: body.is_active !== false,
      metaTitle: body.meta_title || null,
      metaDescription: body.meta_description || null,
    });

    const saved = await this.categoryRepository.save(newCategory);

    // Activity logging
    await this.logActivity(adminId, 'admin_create_category', `Created category #${saved.id}: ${name}`);

    return {
      data: {
        id: saved.id,
        name: saved.name,
        slug: saved.slug,
        description: saved.description,
        parent_id: saved.parentId,
        sort_order: saved.sortOrder,
        is_active: saved.isActive,
        meta_title: saved.metaTitle,
        meta_description: saved.metaDescription,
        created_at: saved.createdAt,
      }
    };
  }

  /**
   * Update existing category in admin interface
   * Source: AdminCategoriesController.update
   */
  async updateAdminCategory(id: number, body: Record<string, any>, adminId: number, tenantId: number): Promise<any> {
    const category = await this.dataSource.query(
      'SELECT * FROM categories WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );

    if (!category || category.length === 0) {
      throw new NotFoundException('Category not found');
    }

    const currentCategory = category[0];
    const updateData: any = {};

    // Dynamic field updates
    if ('name' in body && body.name && body.name.trim() !== '') {
      const newName = body.name.trim();
      
      // Check name uniqueness if changed
      if (newName !== currentCategory.name) {
        const existingName = await this.dataSource.query(
          'SELECT COUNT(*) as cnt FROM categories WHERE name = ? AND tenant_id = ? AND id != ?',
          [newName, tenantId, id]
        );

        if (existingName[0].cnt > 0) {
          throw new ConflictException('Category name already exists');
        }

        updateData.name = newName;
        // Auto-regenerate slug from name if no explicit slug provided
        if (!('slug' in body)) {
          updateData.slug = this.generateSlug(newName);
        }
      }
    }

    // Allow explicit slug override
    if ('slug' in body && body.slug && body.slug.trim() !== '') {
      const newSlug = this.generateSlug(body.slug);
      if (newSlug !== currentCategory.slug) {
        const existingSlug = await this.dataSource.query(
          'SELECT COUNT(*) as cnt FROM categories WHERE slug = ? AND tenant_id = ? AND id != ?',
          [newSlug, tenantId, id]
        );

        if (existingSlug[0].cnt > 0) {
          updateData.slug = `${newSlug}-${Date.now()}`;
        } else {
          updateData.slug = newSlug;
        }
      }
    }

    // Update other fields if provided
    if ('description' in body) updateData.description = body.description || null;
    if ('parent_id' in body) updateData.parent_id = body.parent_id || null;
    if ('sort_order' in body) updateData.sort_order = body.sort_order || 0;
    if ('is_active' in body) updateData.is_active = body.is_active !== false;
    if ('meta_title' in body) updateData.meta_title = body.meta_title || null;
    if ('meta_description' in body) updateData.meta_description = body.meta_description || null;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    // Build dynamic SQL update
    const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);

    await this.dataSource.query(
      `UPDATE categories SET ${setClause}, updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
      [...values, id, tenantId]
    );

    // Activity logging
    await this.logActivity(adminId, 'admin_update_category', `Updated category #${id}: ${updateData.name || currentCategory.name}`);

    // Return updated category
    const updated = await this.dataSource.query(
      'SELECT * FROM categories WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );

    return {
      data: {
        id: parseInt(updated[0].id),
        name: updated[0].name,
        slug: updated[0].slug,
        description: updated[0].description,
        parent_id: updated[0].parent_id ? parseInt(updated[0].parent_id) : null,
        sort_order: parseInt(updated[0].sort_order || '0'),
        is_active: Boolean(updated[0].is_active),
        meta_title: updated[0].meta_title,
        meta_description: updated[0].meta_description,
        created_at: updated[0].created_at,
      }
    };
  }

  /**
   * Delete category from admin interface
   * Source: AdminCategoriesController.destroy
   */
  async deleteAdminCategory(id: number, adminId: number, tenantId: number): Promise<any> {
    const category = await this.dataSource.query(
      'SELECT * FROM categories WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );

    if (!category || category.length === 0) {
      throw new NotFoundException('Category not found');
    }

    const categoryData = category[0];

    // Check for child categories
    const children = await this.dataSource.query(
      'SELECT COUNT(*) as cnt FROM categories WHERE parent_id = ? AND tenant_id = ?',
      [id, tenantId]
    );

    if (children[0].cnt > 0) {
      throw new BadRequestException('Cannot delete category with child categories');
    }

    // Update any listings using this category to null
    await this.dataSource.query(
      'UPDATE listings SET category_id = NULL WHERE category_id = ? AND tenant_id = ?',
      [id, tenantId]
    );

    await this.dataSource.query(
      'DELETE FROM categories WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );

    // Activity logging
    await this.logActivity(adminId, 'admin_delete_category', `Deleted category #${id}: ${categoryData.name}`);

    return {
      data: {
        deleted: true,
        id,
      }
    };
  }

  /**
   * List all attributes with pagination for admin interface
   * Source: AdminCategoriesController.listAttributes
   */
  async getAdminAttributes(
    page?: number | null, 
    perPage?: number | null,
    search?: string,
    tenantId?: number
  ): Promise<any> {
    const pageNum = Math.max(page || 1, 1);
    const limitNum = Math.min(Math.max(perPage || 20, 1), 100);
    const offset = (pageNum - 1) * limitNum;

    const queryBuilder = this.dataSource
      .createQueryBuilder()
      .select([
        'a.id',
        'a.name',
        'a.slug',
        'a.input_type',
        'a.options',
        'a.default_value',
        'a.is_required',
        'a.is_searchable',
        'a.sort_order',
        'a.created_at'
      ])
      .from('attributes', 'a');

    if (tenantId) {
      queryBuilder.where('a.tenant_id = :tenantId', { tenantId });
    }

    if (search) {
      queryBuilder.andWhere('(a.name LIKE :search)', { 
        search: `%${search}%` 
      });
    }

    const totalQuery = queryBuilder.clone();
    const total = await totalQuery.getCount();

    const items = await queryBuilder
      .orderBy('a.name', 'ASC')
      .limit(limitNum)
      .offset(offset)
      .getRawMany();

    const formatted = items.map(row => ({
      id: parseInt(row.id),
      name: row.name || '',
      slug: row.slug,
      type: row.input_type || 'checkbox',
      options: row.options ? JSON.parse(row.options) : null,
      default_value: row.default_value,
      is_required: Boolean(row.is_required),
      is_searchable: Boolean(row.is_searchable),
      sort_order: parseInt(row.sort_order || '0'),
      created_at: row.created_at,
    }));

    return { 
      data: formatted,
      pagination: {
        page: pageNum,
        per_page: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Create a new attribute in admin interface
   * Source: AdminCategoriesController.storeAttribute
   */
  async createAdminAttribute(body: Record<string, any>, adminId: number, tenantId: number): Promise<any> {
    const name = (body.name || '').trim();
    if (name === '') {
      throw new BadRequestException('Attribute name is required');
    }

    let slug = this.generateSlug(name);
    const attributeType = body.type || body.input_type || 'checkbox';

    // Allow custom slug
    if (body.slug && body.slug.trim()) {
      slug = this.generateSlug(body.slug);
    }

    // Check slug uniqueness within tenant
    const existingSlug = await this.dataSource.query(
      'SELECT COUNT(*) as cnt FROM attributes WHERE slug = ? AND tenant_id = ?',
      [slug, tenantId]
    );

    if (existingSlug[0].cnt > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const options = body.options ? JSON.stringify(body.options) : null;

    await this.dataSource.query(`
      INSERT INTO attributes (tenant_id, name, slug, input_type, options, default_value, is_required, is_searchable, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      tenantId,
      name,
      slug,
      attributeType,
      options,
      body.default_value || null,
      body.is_required ? 1 : 0,
      body.is_searchable ? 1 : 0,
      body.sort_order || 0
    ]);

    const result = await this.dataSource.query('SELECT LAST_INSERT_ID() as id');
    const newId = result[0].id;

    // Activity logging
    await this.logActivity(adminId, 'admin_create_attribute', `Created attribute #${newId}: ${name}`);

    return {
      data: {
        id: newId,
        name,
        slug,
        type: attributeType,
        options: body.options || null,
        default_value: body.default_value || null,
        is_required: body.is_required || false,
        is_searchable: body.is_searchable || false,
        sort_order: body.sort_order || 0,
        created_at: new Date(),
      }
    };
  }

  /**
   * Update existing attribute in admin interface
   * Source: AdminCategoriesController.updateAttribute
   */
  async updateAdminAttribute(id: number, body: Record<string, any>, adminId: number, tenantId: number): Promise<any> {
    const attribute = await this.dataSource.query(
      'SELECT * FROM attributes WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );

    if (!attribute || attribute.length === 0) {
      throw new NotFoundException('Attribute not found');
    }

    const currentAttribute = attribute[0];
    const updateData: any = {};

    // Dynamic field updates
    if ('name' in body && body.name && body.name.trim() !== '') {
      const newName = body.name.trim();
      updateData.name = newName;
      
      // Auto-regenerate slug from name if no explicit slug provided
      if (!('slug' in body)) {
        updateData.slug = this.generateSlug(newName);
      }
    }

    // Allow explicit slug override
    if ('slug' in body && body.slug && body.slug.trim() !== '') {
      updateData.slug = this.generateSlug(body.slug);
    }

    if ('type' in body || 'input_type' in body) {
      updateData.input_type = body.type || body.input_type || currentAttribute.input_type;
    }

    if ('options' in body) {
      updateData.options = body.options ? JSON.stringify(body.options) : null;
    }

    if ('default_value' in body) updateData.default_value = body.default_value || null;
    if ('is_required' in body) updateData.is_required = body.is_required ? 1 : 0;
    if ('is_searchable' in body) updateData.is_searchable = body.is_searchable ? 1 : 0;
    if ('sort_order' in body) updateData.sort_order = body.sort_order || 0;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    // Build dynamic SQL update
    const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);

    await this.dataSource.query(
      `UPDATE attributes SET ${setClause}, updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
      [...values, id, tenantId]
    );

    // Activity logging
    await this.logActivity(adminId, 'admin_update_attribute', `Updated attribute #${id}: ${updateData.name || currentAttribute.name}`);

    // Return updated attribute
    const updated = await this.dataSource.query(
      'SELECT * FROM attributes WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );

    const updatedData = updated[0];

    return {
      data: {
        id: parseInt(updatedData.id),
        name: updatedData.name,
        slug: updatedData.slug,
        type: updatedData.input_type,
        options: updatedData.options ? JSON.parse(updatedData.options) : null,
        default_value: updatedData.default_value,
        is_required: Boolean(updatedData.is_required),
        is_searchable: Boolean(updatedData.is_searchable),
        sort_order: parseInt(updatedData.sort_order || '0'),
        created_at: updatedData.created_at,
      }
    };
  }

  /**
   * Delete attribute from admin interface
   * Source: AdminCategoriesController.destroyAttribute
   */
  async deleteAdminAttribute(id: number, adminId: number, tenantId: number): Promise<any> {
    const attribute = await this.dataSource.query(
      'SELECT * FROM attributes WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );

    if (!attribute || attribute.length === 0) {
      throw new NotFoundException('Attribute not found');
    }

    const attributeData = attribute[0];

    await this.dataSource.query(
      'DELETE FROM attributes WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );

    // Activity logging
    await this.logActivity(adminId, 'admin_delete_attribute', `Deleted attribute #${id}: ${attributeData.name}`);

    return {
      data: {
        deleted: true,
        id,
      }
    };
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async logActivity(userId: number, action: string, details: string) {
    const activity = this.activityLogRepository.create({
      userId,
      action,
      details
    });
    await this.activityLogRepository.save(activity);
  }
}