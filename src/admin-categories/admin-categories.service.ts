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
    const queryBuilder = this.categoryRepository
      .createQueryBuilder('c')
      .select([
        'c.id',
        'c.name',
        'c.slug', 
        'c.description',
        'c.parentId',
        'c.sortOrder',
        'c.isActive',
        'c.metaTitle',
        'c.metaDescription',
        'c.createdAt'
      ])
      .orderBy('c.name', 'ASC')
      .limit(500);

    if (type && type !== 'all') {
      // Note: The entity doesn't have a type field, but the Laravel source uses it
      // This would need to be added to the entity if type filtering is needed
    }

    const items = await queryBuilder.getMany();

    const formatted = items.map(row => ({
      id: row.id,
      name: row.name || '',
      slug: row.slug || '',
      description: row.description,
      parent_id: row.parentId,
      sort_order: row.sortOrder,
      is_active: row.isActive,
      meta_title: row.metaTitle,
      meta_description: row.metaDescription,
      created_at: row.createdAt,
    }));

    return { data: formatted };
  }

  /**
   * Create a new category in admin interface
   * Source: AdminCategoriesController.store
   */
  async createAdminCategory(body: Record<string, any>): Promise<any> {
    const name = (body.name || '').trim();
    if (name === '') {
      throw new BadRequestException('Category name is required');
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
    
    // Check name uniqueness
    const existing = await this.categoryRepository
      .createQueryBuilder('c')
      .where('c.name = :name', { name })
      .getOne();

    if (existing) {
      throw new ConflictException('Category name already exists');
    }

    const newCategory = this.categoryRepository.create({
      name,
      slug,
      description: body.description || null,
      parentId: body.parentId || null,
      sortOrder: body.sortOrder || 0,
      isActive: body.isActive !== false,
      metaTitle: body.metaTitle || null,
      metaDescription: body.metaDescription || null,
    });

    const saved = await this.categoryRepository.save(newCategory);

    // TODO: add activity logging
    // ActivityLog::log($adminId, 'admin_create_category', "Created category #{$newId}: {$name}");

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
  async updateAdminCategory(id: number, body: Record<string, any>): Promise<any> {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const name = body.name && body.name.trim() !== '' ? body.name.trim() : category.name;

    // Check name uniqueness if name changed
    if (name !== category.name) {
      const existing = await this.categoryRepository
        .createQueryBuilder('c')
        .where('c.name = :name', { name })
        .andWhere('c.id != :id', { id })
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

    const updateData: Partial<AdminCategory> = {
      name,
      slug,
    };

    if ('description' in body) updateData.description = body.description || null;
    if ('parentId' in body) updateData.parentId = body.parentId || null;
    if ('sortOrder' in body) updateData.sortOrder = body.sortOrder || 0;
    if ('isActive' in body) updateData.isActive = body.isActive !== false;
    if ('metaTitle' in body) updateData.metaTitle = body.metaTitle || null;
    if ('metaDescription' in body) updateData.metaDescription = body.metaDescription || null;

    await this.categoryRepository.update(id, updateData);

    // TODO: add activity logging
    // ActivityLog::log($adminId, 'admin_update_category', "Updated category #{$id}: {$name}");

    const updated = await this.categoryRepository.findOne({ where: { id } });

    return {
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        description: updated.description,
        parent_id: updated.parentId,
        sort_order: updated.sortOrder,
        is_active: updated.isActive,
        meta_title: updated.metaTitle,
        meta_description: updated.metaDescription,
        created_at: updated.createdAt,
      }
    };
  }

  /**
   * Delete category from admin interface
   * Source: AdminCategoriesController.destroy
   */
  async deleteAdminCategory(id: number): Promise<any> {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Note: The Laravel code updates listings to nullify category_id, but we don't have
    // a listings table in this module. This would need to be handled by a separate service
    // or through database constraints.

    await this.categoryRepository.delete(id);

    // TODO: add activity logging
    // ActivityLog::log($adminId, 'admin_delete_category', "Deleted category #{$id}: {$category->name}");

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
  async getAdminAttributes(page?: number | null, perPage?: number | null): Promise<any> {
    const queryBuilder = this.attributeRepository
      .createQueryBuilder('a')
      .select([
        'a.id',
        'a.name',
        'a.slug',
        'a.attributeType',
        'a.defaultValue',
        'a.isRequired',
        'a.isSearchable',
        'a.sortOrder',
        'a.createdAt'
      ])
      .orderBy('a.name', 'ASC')
      .limit(500);

    const items = await queryBuilder.getMany();

    const formatted = items.map(row => ({
      id: row.id,
      name: row.name || '',
      slug: row.slug,
      type: row.attributeType || 'checkbox',
      options: null,
      default_value: row.defaultValue,
      is_required: row.isRequired,
      is_searchable: row.isSearchable,
      sort_order: row.sortOrder,
      created_at: row.createdAt,
    }));

    return { data: formatted };
  }

  /**
   * Create a new attribute in admin interface
   * Source: AdminCategoriesController.storeAttribute
   */
  async createAdminAttribute(body: Record<string, any>): Promise<any> {
    const name = (body.name || '').trim();
    if (name === '') {
      throw new BadRequestException('Attribute name is required');
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
    const attributeType = body.type || body.input_type || 'checkbox';

    const newAttribute = this.attributeRepository.create({
      name,
      slug,
      attributeType,
      defaultValue: body.defaultValue || null,
      isRequired: body.isRequired || false,
      isSearchable: body.isSearchable || false,
      sortOrder: body.sortOrder || 0,
    });

    const saved = await this.attributeRepository.save(newAttribute);

    // TODO: add activity logging
    // ActivityLog::log($adminId, 'admin_create_attribute', "Created attribute #{$id}: {$name}");

    return {
      data: {
        id: saved.id,
        name: saved.name,
        slug: saved.slug,
        type: saved.attributeType,
        options: null,
        default_value: saved.defaultValue,
        is_required: saved.isRequired,
        is_searchable: saved.isSearchable,
        sort_order: saved.sortOrder,
        created_at: saved.createdAt,
      }
    };
  }

  /**
   * Update existing attribute in admin interface
   * Source: AdminCategoriesController.updateAttribute
   */
  async updateAdminAttribute(id: number, body: Record<string, any>): Promise<any> {
    const attribute = await this.attributeRepository.findOne({ where: { id } });

    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    const name = body.name && body.name.trim() !== '' ? body.name.trim() : attribute.name;
    const attributeType = body.type || body.input_type || attribute.attributeType;
    
    // Regenerate slug if name changed
    let slug = attribute.slug;
    if (name !== attribute.name) {
      slug = name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
    }

    const updateData: Partial<AdminAttribute> = {
      name,
      slug,
      attributeType,
    };

    if ('defaultValue' in body) updateData.defaultValue = body.defaultValue || null;
    if ('isRequired' in body) updateData.isRequired = body.isRequired || false;
    if ('isSearchable' in body) updateData.isSearchable = body.isSearchable || false;
    if ('sortOrder' in body) updateData.sortOrder = body.sortOrder || 0;

    await this.attributeRepository.update(id, updateData);

    // TODO: add activity logging
    // ActivityLog::log($adminId, 'admin_update_attribute', "Updated attribute #{$id}: {$name}");

    const updated = await this.attributeRepository.findOne({ where: { id } });

    return {
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        type: updated.attributeType,
        default_value: updated.defaultValue,
        is_required: updated.isRequired,
        is_searchable: updated.isSearchable,
        sort_order: updated.sortOrder,
        created_at: updated.createdAt,
      }
    };
  }

  /**
   * Delete attribute from admin interface
   * Source: AdminCategoriesController.destroyAttribute
   */
  async deleteAdminAttribute(id: number): Promise<any> {
    const attribute = await this.attributeRepository.findOne({ where: { id } });

    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    await this.attributeRepository.delete(id);

    // TODO: add activity logging
    // ActivityLog::log($adminId, 'admin_delete_attribute', "Deleted attribute #{$id}: {$attribute->name}");

    return {
      data: {
        deleted: true,
        id,
      }
    };
  }
}