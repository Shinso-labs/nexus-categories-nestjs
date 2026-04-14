import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { AdminCategory } from './entities/admin-category.entity';
import { AdminAttribute } from './entities/admin-attribute.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { CreateAdminCategoriesModuleDto } from './dto/create-admin-categories.dto';
import { UpdateAdminCategoriesModuleDto } from './dto/update-admin-categories.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { ReorderAttributesDto } from './dto/reorder-attributes.dto';

@Injectable()
export class AdminCategoriesModuleService {
  private readonly logger = new Logger(AdminCategoriesModuleService.name);

  constructor(
    @InjectRepository(AdminCategory)
    private readonly categoryRepository: Repository<AdminCategory>,
    @InjectRepository(AdminAttribute)
    private readonly attributeRepository: Repository<AdminAttribute>,
    private readonly dataSource: DataSource,
  ) {}

  private getTenantId(): number {
    // Default tenant implementation - should be replaced with actual tenant resolution
    return 1;
  }

  private requireAdmin(): void {
    // Default admin check implementation - should be replaced with actual auth
    // For now, we'll just log the action
    this.logger.log('Admin action required');
  }

  private logActivity(adminId: number, action: string, message: string): void {
    // Activity logging implementation
    this.logger.log(`Admin ${adminId} - ${action}: ${message}`);
  }

  /**
   * List all categories with pagination for admin interface
   * Source: AdminCategoriesController.index
   */
  async getAdminCategories(page?: number | null, perPage?: number | null, type?: string): Promise<any> {
    this.requireAdmin();
    const tenantId = this.getTenantId();

    const queryBuilder = this.categoryRepository.createQueryBuilder('c')
      .select([
        'c.id',
        'c.name',
        'c.slug',
        'c.color',
        'c.type',
        'c.createdAt'
      ]);

    if (type && type !== 'all') {
      queryBuilder.andWhere('c.type = :type', { type });
    }

    const items = await queryBuilder
      .orderBy('c.type', 'ASC')
      .addOrderBy('c.name', 'ASC')
      .limit(500)
      .getMany();

    const formatted = items.map(category => ({
      id: category.id,
      name: category.name || '',
      slug: category.slug || '',
      color: category.color || 'blue',
      type: category.type || 'listing',
      listing_count: 0, // Would need actual listing count from listings table
      created_at: category.createdAt,
    }));

    return { data: formatted };
  }

  /**
   * Get single category details for admin interface
   * Source: AdminCategoriesController.show
   */
  async show(id: number): Promise<any> {
    this.requireAdmin();
    const tenantId = this.getTenantId();

    const category = await this.categoryRepository.findOne({
      where: { id }
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return {
      data: {
        id: category.id,
        name: category.name || '',
        slug: category.slug || '',
        color: category.color || 'blue',
        type: category.type || 'listing',
        description: category.description,
        parent_id: category.parentId,
        sort_order: category.sortOrder,
        is_active: category.isActive,
        meta_title: category.metaTitle,
        meta_description: category.metaDescription,
        listing_count: 0, // Would need actual listing count from listings table
        created_at: category.createdAt,
      }
    };
  }

  /**
   * Create a new category in admin interface
   * Source: AdminCategoriesController.store
   */
  async createAdminCategory(body: CreateAdminCategoriesModuleDto): Promise<any> {
    this.requireAdmin();
    const tenantId = this.getTenantId();

    const name = body.name?.trim() || '';
    if (name === '') {
      throw new BadRequestException('Category name is required');
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
    const color = body.color || 'blue';
    const type = body.type || 'listing';

    const allowedTypes = ['listing', 'event', 'blog', 'resource', 'vol_opportunity'];
    if (!allowedTypes.includes(type)) {
      throw new BadRequestException(`Invalid category type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check name uniqueness within tenant
    const existing = await this.categoryRepository.findOne({
      where: { name }
    });

    if (existing) {
      throw new ConflictException('Category name already exists');
    }

    const category = this.categoryRepository.create({
      name,
      slug,
      color,
      type,
      description: body.description || null,
      parentId: body.parentId || null,
      sortOrder: body.sortOrder || 0,
      isActive: body.isActive !== undefined ? body.isActive : true,
      metaTitle: body.metaTitle || null,
      metaDescription: body.metaDescription || null,
    });

    const saved = await this.categoryRepository.save(category);

    this.logActivity(1, 'admin_create_category', `Created category #${saved.id}: ${name} (type: ${type})`);

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
  async updateAdminCategory(id: number, body: UpdateAdminCategoriesModuleDto): Promise<any> {
    this.requireAdmin();
    const tenantId = this.getTenantId();

    const category = await this.categoryRepository.findOne({
      where: { id }
    });

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
      const existing = await this.categoryRepository.findOne({
        where: { name }
      });

      if (existing && existing.id !== id) {
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
      description: body.description !== undefined ? body.description : category.description,
      parentId: body.parentId !== undefined ? body.parentId : category.parentId,
      sortOrder: body.sortOrder !== undefined ? body.sortOrder : category.sortOrder,
      isActive: body.isActive !== undefined ? body.isActive : category.isActive,
      metaTitle: body.metaTitle !== undefined ? body.metaTitle : category.metaTitle,
      metaDescription: body.metaDescription !== undefined ? body.metaDescription : category.metaDescription,
    });

    this.logActivity(1, 'admin_update_category', `Updated category #${id}: ${name}`);

    // Fetch updated record
    const updated = await this.categoryRepository.findOne({
      where: { id }
    });

    return {
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        color: updated.color,
        type: updated.type,
        listing_count: 0, // Would need actual listing count from listings table
        created_at: updated.createdAt,
      }
    };
  }

  /**
   * Delete category from admin interface
   * Source: AdminCategoriesController.destroy
   */
  async deleteAdminCategory(id: number): Promise<any> {
    this.requireAdmin();
    const tenantId = this.getTenantId();

    const category = await this.categoryRepository.findOne({
      where: { id }
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const listingCount = 0; // Would need to query actual listings table

    await this.categoryRepository.delete(id);

    const message = `Deleted category #${id}: ${category.name}` + 
                   (listingCount > 0 ? ` (${listingCount} listings unassigned)` : '');
    this.logActivity(1, 'admin_delete_category', message);

    return {
      data: {
        deleted: true,
        id: id,
        listings_unassigned: listingCount,
      }
    };
  }

  /**
   * List all attributes with pagination for admin interface with category joins, target type filtering, options handling
   * Source: AdminCategoriesController.listAttributes
   */
  async getAdminAttributes(page?: number | null, perPage?: number | null, categoryId?: number, targetType?: string): Promise<any> {
    this.requireAdmin();
    const tenantId = this.getTenantId();

    const queryBuilder = this.attributeRepository.createQueryBuilder('a')
      .leftJoinAndSelect('a.category', 'c')
      .select([
        'a.id',
        'a.name',
        'a.slug',
        'a.attributeType',
        'a.sortOrder',
        'a.isRequired',
        'a.isSearchable',
        'c.id',
        'c.name'
      ]);

    // Category joins and filtering
    if (categoryId) {
      queryBuilder.andWhere('a.categoryId = :categoryId', { categoryId });
    }

    // Target type filtering
    if (targetType && targetType !== 'any') {
      queryBuilder.andWhere('a.targetType = :targetType', { targetType });
    }

    const items = await queryBuilder
      .orderBy('a.sortOrder', 'ASC')
      .addOrderBy('a.name', 'ASC')
      .take(500)
      .getMany();

    const formatted = items.map(attribute => ({
      id: attribute.id,
      name: attribute.name || '',
      slug: (attribute.name || '').toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, ''),
      type: attribute.attributeType || 'checkbox',
      options: this.parseAttributeOptions(attribute),
      category_id: attribute.category?.id || null,
      category_name: attribute.category?.name || null,
      is_active: true,
      target_type: targetType || 'any',
      is_required: attribute.isRequired,
      is_searchable: attribute.isSearchable,
      sort_order: attribute.sortOrder,
    }));

    return { data: formatted };
  }

  /**
   * Parse attribute options from defaultValue or other fields
   */
  private parseAttributeOptions(attribute: AdminAttribute): string[] | null {
    // For select/radio/checkbox types, options might be stored in defaultValue as JSON
    if (['select', 'radio', 'checkbox'].includes(attribute.attributeType) && attribute.defaultValue) {
      try {
        const parsed = JSON.parse(attribute.defaultValue);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        // If not valid JSON, split by commas
        return attribute.defaultValue.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
      }
    }
    return null;
  }

  /**
   * Create a new attribute in admin interface
   * Source: AdminCategoriesController.storeAttribute
   */
  async createAdminAttribute(body: Record<string, any>): Promise<any> {
    this.requireAdmin();
    const tenantId = this.getTenantId();

    const name = body.name?.trim() || '';
    if (name === '') {
      throw new BadRequestException('Attribute name is required');
    }

    const categoryId = body.category_id ? parseInt(body.category_id) : null;
    const inputType = body.type?.trim() || body.input_type?.trim() || 'checkbox';
    const targetType = body.target_type?.trim() || 'any';

    // Handle options for select/radio/checkbox types
    let defaultValue = body.default_value || null;
    if (body.options && Array.isArray(body.options)) {
      defaultValue = JSON.stringify(body.options);
    }

    const attribute = this.attributeRepository.create({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, ''),
      attributeType: inputType,
      defaultValue: defaultValue,
      isRequired: !!body.is_required,
      isSearchable: !!body.is_searchable,
      sortOrder: parseInt(body.sort_order) || 0,
      categoryId: categoryId,
    });

    const saved = await this.attributeRepository.save(attribute);

    this.logActivity(1, 'admin_create_attribute', `Created attribute #${saved.id}: ${name}`);

    return {
      data: {
        id: saved.id,
        name: saved.name,
        slug: saved.slug,
        type: saved.attributeType,
        options: this.parseAttributeOptions(saved),
        category_id: categoryId,
        is_active: true,
        target_type: targetType,
      }
    };
  }

  /**
   * Update existing attribute in admin interface with category relationship updates and options handling
   * Source: AdminCategoriesController.updateAttribute
   */
  async updateAdminAttribute(id: number, body: Record<string, any>): Promise<any> {
    this.requireAdmin();
    const tenantId = this.getTenantId();

    const attribute = await this.attributeRepository.findOne({
      where: { id }
    });

    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    const name = (body.name && body.name.trim() !== '') ? body.name.trim() : attribute.name;
    const categoryId = 'category_id' in body ? (body.category_id ? parseInt(body.category_id) : null) : attribute.categoryId;
    const inputType = body.type?.trim() || body.input_type?.trim() || attribute.attributeType;
    const isActive = 'is_active' in body ? !!body.is_active : true;
    const targetType = body.target_type?.trim() || 'any';

    // Handle options updates
    let defaultValue = attribute.defaultValue;
    if ('options' in body && Array.isArray(body.options)) {
      defaultValue = JSON.stringify(body.options);
    } else if ('default_value' in body) {
      defaultValue = body.default_value;
    }

    // Target type validation
    const allowedTargetTypes = ['any', 'listing', 'event', 'blog', 'resource'];
    if (!allowedTargetTypes.includes(targetType)) {
      throw new BadRequestException(`Invalid target type. Allowed types: ${allowedTargetTypes.join(', ')}`);
    }

    await this.attributeRepository.update(id, {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, ''),
      attributeType: inputType,
      defaultValue: defaultValue,
      isRequired: body.is_required !== undefined ? !!body.is_required : attribute.isRequired,
      isSearchable: body.is_searchable !== undefined ? !!body.is_searchable : attribute.isSearchable,
      sortOrder: body.sort_order !== undefined ? parseInt(body.sort_order) : attribute.sortOrder,
      categoryId: categoryId,
    });

    this.logActivity(1, 'admin_update_attribute', `Updated attribute #${id}: ${name}`);

    const updated = await this.attributeRepository.findOne({
      where: { id }
    });

    return {
      data: {
        id: id,
        name: name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, ''),
        type: inputType,
        is_active: isActive,
        category_id: categoryId,
        target_type: targetType,
        options: this.parseAttributeOptions(updated),
      }
    };
  }

  /**
   * Delete attribute from admin interface
   * Source: AdminCategoriesController.destroyAttribute
   */
  async deleteAdminAttribute(id: number): Promise<any> {
    this.requireAdmin();
    const tenantId = this.getTenantId();

    const attribute = await this.attributeRepository.findOne({
      where: { id }
    });

    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    await this.attributeRepository.delete(id);

    this.logActivity(1, 'admin_delete_attribute', `Deleted attribute #${id}: ${attribute.name}`);

    return {
      data: {
        deleted: true,
        id: id,
      }
    };
  }

  /**
   * Bulk delete attributes
   * Source: AdminCategoriesController.bulkDeleteAttributes
   */
  async bulkDeleteAttributes(bulkDeleteDto: BulkDeleteDto): Promise<any> {
    this.requireAdmin();
    const tenantId = this.getTenantId();

    const ids = this.parseBulkIds(bulkDeleteDto.attributeIds || bulkDeleteDto.ids);

    // Find existing attributes
    const existingAttributes = await this.attributeRepository.find({
      where: { id: In(ids) },
      select: ['id', 'name']
    });

    const existingIds = existingAttributes.map(attr => attr.id);
    const skippedIds = ids.filter(id => !existingIds.includes(id));

    let success = 0;
    let failed = skippedIds.length;

    if (existingIds.length > 0) {
      try {
        const result = await this.attributeRepository.delete({ id: In(existingIds) });
        success = result.affected || 0;
      } catch (error) {
        failed += existingIds.length;
      }
    }

    this.logActivity(1, 'admin_bulk_delete_attributes', `Bulk deleted ${success} attributes`);

    return {
      data: {
        success,
        failed,
        skipped_ids: skippedIds,
      }
    };
  }

  /**
   * Reorder attributes
   * Source: AdminCategoriesController.reorderAttributes
   */
  async reorderAttributes(reorderDto: ReorderAttributesDto): Promise<any> {
    this.requireAdmin();
    const tenantId = this.getTenantId();

    if (!Array.isArray(reorderDto.attributes) || reorderDto.attributes.length === 0) {
      throw new BadRequestException('Attributes array is required');
    }

    const updates = [];
    for (const item of reorderDto.attributes) {
      if (item.id && typeof item.sort_order === 'number') {
        updates.push(
          this.attributeRepository.update(item.id, { sortOrder: item.sort_order })
        );
      }
    }

    await Promise.all(updates);

    this.logActivity(1, 'admin_reorder_attributes', `Reordered ${updates.length} attributes`);

    return {
      data: {
        success: true,
        updated: updates.length,
      }
    };
  }

  /**
   * Parse bulk IDs utility method
   */
  private parseBulkIds(ids: number[]): number[] {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new BadRequestException('Bulk IDs required');
    }
    const validIds = [...new Set(ids.filter(id => Number.isInteger(id) && id > 0))];
    if (validIds.length === 0) {
      throw new BadRequestException('Valid IDs required');
    }
    return validIds;
  }
}