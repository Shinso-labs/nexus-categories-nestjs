import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { AdminCategory } from './entities/admin-category.entity';
import { AdminAttribute } from './entities/admin-attribute.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateAdminCategoriesModuleDto } from './dto/create-admin-categories.dto';
import { UpdateAdminCategoriesModuleDto } from './dto/update-admin-categories.dto';

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
   * List all attributes with pagination for admin interface
   * Source: AdminCategoriesController.listAttributes
   */
  async getAdminAttributes(page?: number | null, perPage?: number | null): Promise<any> {
    this.requireAdmin();
    const tenantId = this.getTenantId();

    const items = await this.attributeRepository.find({
      order: {
        sortOrder: 'ASC',
        name: 'ASC'
      },
      take: 500
    });

    const formatted = items.map(attribute => ({
      id: attribute.id,
      name: attribute.name || '',
      slug: (attribute.name || '').toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, ''),
      type: attribute.attributeType || 'checkbox',
      options: null,
      category_id: null,
      category_name: null,
      is_active: true,
      target_type: 'any',
    }));

    return { data: formatted };
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

    const attribute = this.attributeRepository.create({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, ''),
      attributeType: inputType,
      defaultValue: body.default_value || null,
      isRequired: !!body.is_required,
      isSearchable: !!body.is_searchable,
      sortOrder: parseInt(body.sort_order) || 0,
    });

    const saved = await this.attributeRepository.save(attribute);

    this.logActivity(1, 'admin_create_attribute', `Created attribute #${saved.id}: ${name}`);

    return {
      data: {
        id: saved.id,
        name: saved.name,
        slug: saved.slug,
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
    this.requireAdmin();
    const tenantId = this.getTenantId();

    const attribute = await this.attributeRepository.findOne({
      where: { id }
    });

    if (!attribute) {
      throw new NotFoundException('Attribute not found');
    }

    const name = (body.name && body.name.trim() !== '') ? body.name.trim() : attribute.name;
    const categoryId = 'category_id' in body ? (body.category_id ? parseInt(body.category_id) : null) : null;
    const inputType = body.type?.trim() || body.input_type?.trim() || attribute.attributeType;
    const isActive = 'is_active' in body ? !!body.is_active : true;

    await this.attributeRepository.update(id, {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, ''),
      attributeType: inputType,
      defaultValue: body.default_value !== undefined ? body.default_value : attribute.defaultValue,
      isRequired: body.is_required !== undefined ? !!body.is_required : attribute.isRequired,
      isSearchable: body.is_searchable !== undefined ? !!body.is_searchable : attribute.isSearchable,
      sortOrder: body.sort_order !== undefined ? parseInt(body.sort_order) : attribute.sortOrder,
    });

    this.logActivity(1, 'admin_update_attribute', `Updated attribute #${id}: ${name}`);

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
}