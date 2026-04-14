import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Category } from './entities/category.entity';
import { Attribute } from './entities/attribute.entity';
import { ActivityLog } from '../activity-log/entities/activity-log.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';

@Injectable()
export class AdminCategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Attribute)
    private readonly attributeRepository: Repository<Attribute>,
    @InjectRepository(ActivityLog)
    private readonly activityLogRepository: Repository<ActivityLog>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get all categories for tenant with listing counts
   * Source: AdminCategoriesController.index
   */
  async getAllCategories(tenantId: number, typeFilter?: string) {
    let whereClause = 'c.tenant_id = $1';
    const params: any[] = [tenantId];

    if (typeFilter && typeFilter !== 'all') {
      whereClause += ' AND c.type = $2';
      params.push(typeFilter);
    }

    const query = `
      SELECT c.*,
             (SELECT COUNT(*) FROM listings l WHERE l.category_id = c.id) as listing_count
      FROM categories c
      WHERE ${whereClause}
      ORDER BY c.type ASC, c.name ASC
      LIMIT 500
    `;

    const items = await this.dataSource.query(query, params);

    const formatted = items.map((row: any) => ({
      id: parseInt(row.id),
      name: row.name || '',
      slug: row.slug || '',
      color: row.color || 'blue',
      type: row.type || 'listing',
      listing_count: parseInt(row.listing_count) || 0,
      created_at: row.created_at,
    }));

    return { data: formatted };
  }

  /**
   * Create a new category
   * Source: AdminCategoriesController.store
   */
  async createCategory(createCategoryDto: CreateCategoryDto, adminId: number, tenantId: number) {
    const name = createCategoryDto.name?.trim();
    if (!name) {
      throw new BadRequestException('Category name is required');
    }

    const slug = this.generateSlug(name);
    const color = createCategoryDto.color?.trim() || 'blue';
    const type = createCategoryDto.type?.trim() || 'listing';

    const allowedTypes = ['listing', 'event', 'blog', 'resource', 'vol_opportunity'];
    if (!allowedTypes.includes(type)) {
      throw new BadRequestException(
        `Invalid category type. Allowed types: ${allowedTypes.join(', ')}`
      );
    }

    // Check name uniqueness within tenant
    const existing = await this.dataSource.query(
      'SELECT id FROM categories WHERE name = $1 AND tenant_id = $2',
      [name, tenantId]
    );

    if (existing.length > 0) {
      throw new ConflictException('Category name already exists');
    }

    // Create category
    const result = await this.dataSource.query(
      `INSERT INTO categories (tenant_id, name, slug, color, type, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, created_at`,
      [tenantId, name, slug, color, type]
    );

    const newId = result[0].id;
    const createdAt = result[0].created_at;

    // Log activity
    await this.logActivity(
      adminId,
      'admin_create_category',
      `Created category #${newId}: ${name} (type: ${type})`
    );

    return {
      data: {
        id: parseInt(newId),
        name,
        slug,
        color,
        type,
        listing_count: 0,
        created_at: createdAt,
      },
      status: 201
    };
  }

  /**
   * Update an existing category
   * Source: AdminCategoriesController.update
   */
  async updateCategory(id: number, updateCategoryDto: UpdateCategoryDto, adminId: number, tenantId: number) {
    const category = await this.dataSource.query(
      'SELECT * FROM categories WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (category.length === 0) {
      throw new NotFoundException('Category not found');
    }

    const existing = category[0];
    const name = updateCategoryDto.name?.trim() || existing.name;
    const color = updateCategoryDto.color?.trim() || existing.color;
    const type = updateCategoryDto.type?.trim() || existing.type;

    const allowedTypes = ['listing', 'event', 'blog', 'resource', 'vol_opportunity'];
    if (!allowedTypes.includes(type)) {
      throw new BadRequestException(
        `Invalid category type. Allowed types: ${allowedTypes.join(', ')}`
      );
    }

    // Check name uniqueness if name changed
    if (name !== existing.name) {
      const duplicateCheck = await this.dataSource.query(
        'SELECT id FROM categories WHERE name = $1 AND tenant_id = $2 AND id != $3',
        [name, tenantId, id]
      );

      if (duplicateCheck.length > 0) {
        throw new ConflictException('Category name already exists');
      }
    }

    // Regenerate slug if name changed
    let slug = existing.slug;
    if (name !== existing.name) {
      slug = this.generateSlug(name);
    }

    // Update category
    await this.dataSource.query(
      'UPDATE categories SET name = $1, slug = $2, color = $3, type = $4, updated_at = NOW() WHERE id = $5 AND tenant_id = $6',
      [name, slug, color, type, id, tenantId]
    );

    // Log activity
    await this.logActivity(adminId, 'admin_update_category', `Updated category #${id}: ${name}`);

    // Fetch updated record with listing count
    const updated = await this.dataSource.query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM listings l WHERE l.category_id = c.id) as listing_count
       FROM categories c
       WHERE c.id = $1 AND c.tenant_id = $2`,
      [id, tenantId]
    );

    const updatedRecord = updated[0];
    return {
      data: {
        id: parseInt(updatedRecord.id),
        name: updatedRecord.name,
        slug: updatedRecord.slug,
        color: updatedRecord.color,
        type: updatedRecord.type,
        listing_count: parseInt(updatedRecord.listing_count) || 0,
        created_at: updatedRecord.created_at,
      }
    };
  }

  /**
   * Delete a category. Unassigns any listings first.
   * Source: AdminCategoriesController.destroy
   */
  async deleteCategory(id: number, adminId: number, tenantId: number) {
    const category = await this.dataSource.query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM listings l WHERE l.category_id = c.id) as listing_count
       FROM categories c
       WHERE c.id = $1 AND c.tenant_id = $2`,
      [id, tenantId]
    );

    if (category.length === 0) {
      throw new NotFoundException('Category not found');
    }

    const categoryRecord = category[0];
    const listingCount = parseInt(categoryRecord.listing_count) || 0;

    // Nullify category_id on affected listings
    if (listingCount > 0) {
      await this.dataSource.query(
        'UPDATE listings SET category_id = NULL WHERE category_id = $1 AND tenant_id = $2',
        [id, tenantId]
      );
    }

    // Delete category
    await this.dataSource.query(
      'DELETE FROM categories WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    // Log activity
    const logMessage = `Deleted category #${id}: ${categoryRecord.name}` +
      (listingCount > 0 ? ` (${listingCount} listings unassigned)` : '');
    
    await this.logActivity(adminId, 'admin_delete_category', logMessage);

    return {
      data: {
        deleted: true,
        id,
        listings_unassigned: listingCount,
      }
    };
  }

  /**
   * Get all attributes for tenant
   * Source: AdminCategoriesController.listAttributes
   */
  async getAllAttributes(tenantId: number) {
    const items = await this.dataSource.query(
      `SELECT a.*, c.name as category_name
       FROM attributes a
       LEFT JOIN categories c ON a.category_id = c.id
       WHERE a.tenant_id = $1
       ORDER BY a.category_id ASC, a.name ASC
       LIMIT 500`,
      [tenantId]
    );

    const formatted = items.map((row: any) => ({
      id: parseInt(row.id),
      name: row.name || '',
      slug: this.generateSlug(row.name || ''),
      type: row.input_type || 'checkbox',
      options: null,
      category_id: row.category_id ? parseInt(row.category_id) : null,
      category_name: row.category_name || null,
      is_active: Boolean(row.is_active ?? true),
      target_type: row.target_type || 'any',
    }));

    return { data: formatted };
  }

  /**
   * Create a new attribute
   * Source: AdminCategoriesController.storeAttribute
   */
  async createAttribute(createAttributeDto: CreateAttributeDto, adminId: number, tenantId: number) {
    const name = createAttributeDto.name?.trim();
    if (!name) {
      throw new BadRequestException('Attribute name is required');
    }

    const categoryId = createAttributeDto.category_id || null;
    const inputType = createAttributeDto.input_type?.trim() || 'checkbox';

    const result = await this.dataSource.query(
      `INSERT INTO attributes (tenant_id, name, category_id, input_type, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())
       RETURNING id`,
      [tenantId, name, categoryId, inputType]
    );

    const newId = result[0].id;

    // Log activity
    await this.logActivity(adminId, 'admin_create_attribute', `Created attribute #${newId}: ${name}`);

    return {
      data: {
        id: parseInt(newId),
        name,
        slug: this.generateSlug(name),
        type: inputType,
        options: null,
        category_id: categoryId,
        is_active: true,
      },
      status: 201
    };
  }

  /**
   * Update an existing attribute
   * Source: AdminCategoriesController.updateAttribute
   */
  async updateAttribute(id: number, updateAttributeDto: UpdateAttributeDto, adminId: number, tenantId: number) {
    const attribute = await this.dataSource.query(
      'SELECT * FROM attributes WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (attribute.length === 0) {
      throw new NotFoundException('Attribute not found');
    }

    const existing = attribute[0];
    const name = updateAttributeDto.name?.trim() || existing.name;
    const categoryId = updateAttributeDto.category_id !== undefined 
      ? updateAttributeDto.category_id 
      : existing.category_id;
    const inputType = updateAttributeDto.input_type?.trim() || existing.input_type;
    const isActive = updateAttributeDto.is_active !== undefined 
      ? updateAttributeDto.is_active 
      : existing.is_active;

    // Update attribute
    await this.dataSource.query(
      'UPDATE attributes SET name = $1, category_id = $2, input_type = $3, is_active = $4, updated_at = NOW() WHERE id = $5 AND tenant_id = $6',
      [name, categoryId, inputType, isActive, id, tenantId]
    );

    // Log activity
    await this.logActivity(adminId, 'admin_update_attribute', `Updated attribute #${id}: ${name}`);

    return {
      data: {
        id: parseInt(id),
        name,
        slug: this.generateSlug(name),
        type: inputType,
        is_active: Boolean(isActive),
      }
    };
  }

  /**
   * Delete an attribute
   * Source: AdminCategoriesController.destroyAttribute
   */
  async deleteAttribute(id: number, adminId: number, tenantId: number) {
    const attribute = await this.dataSource.query(
      'SELECT * FROM attributes WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (attribute.length === 0) {
      throw new NotFoundException('Attribute not found');
    }

    const attributeRecord = attribute[0];

    // Delete attribute
    await this.dataSource.query(
      'DELETE FROM attributes WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    // Log activity
    await this.logActivity(
      adminId, 
      'admin_delete_attribute', 
      `Deleted attribute #${id}: ${attributeRecord.name}`
    );

    return {
      data: {
        deleted: true,
        id
      }
    };
  }

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Log activity
   */
  private async logActivity(adminId: number, action: string, description: string) {
    try {
      await this.dataSource.query(
        'INSERT INTO activity_logs (user_id, action, description, created_at) VALUES ($1, $2, $3, NOW())',
        [adminId, action, description]
      );
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Failed to log activity:', error);
    }
  }
}