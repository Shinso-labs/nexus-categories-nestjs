import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Category } from './entities/category.entity';
import { CategorySummary } from './entities/category-summary.entity';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

@Injectable()
export class CategoriesModuleService {
  constructor(
    @InjectRepository(Category)
    private readonly repository: Repository<Category>,
    @InjectRepository(CategorySummary)
    private readonly categorySummaryRepository: Repository<CategorySummary>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get all public categories with optional parent filtering
   * Enhanced with tenant scoping and listing counts
   * Source: CategoriesController.index enhanced with Laravel patterns
   */
  async getCategories(includeInactive?: boolean, tenantId?: number): Promise<{ data: any[] }> {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    let whereClause = 'c.tenant_id = $1';
    const params: any[] = [tenantId];

    if (!includeInactive) {
      whereClause += ' AND c.is_active = $2';
      params.push(true);
    }

    const query = `
      SELECT c.*,
             (SELECT COUNT(*) FROM listings l WHERE l.category_id = c.id) as listing_count
      FROM categories c
      WHERE ${whereClause}
      ORDER BY c.sort_order ASC, c.name ASC
    `;

    const categories = await this.dataSource.query(query, params);
    
    const formatted = categories.map((category: any) => ({
      id: parseInt(category.id),
      name: category.name || '',
      slug: category.slug || '',
      color: category.color || 'blue',
      type: category.type || 'listing',
      listing_count: parseInt(category.listing_count) || 0,
      is_active: Boolean(category.is_active),
      sort_order: parseInt(category.sort_order) || 0,
      parent_id: category.parent_id ? parseInt(category.parent_id) : null,
      created_at: category.created_at,
    }));

    return { data: formatted };
  }

  /**
   * Get a specific category by ID with tenant scoping
   * Enhanced with tenant scoping and listing counts
   */
  async getCategoryById(id: number, tenantId?: number): Promise<{ data: any }> {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const query = `
      SELECT c.*,
             (SELECT COUNT(*) FROM listings l WHERE l.category_id = c.id) as listing_count
      FROM categories c
      WHERE c.id = $1 AND c.tenant_id = $2
    `;

    const result = await this.dataSource.query(query, [id, tenantId]);

    if (result.length === 0) {
      throw new NotFoundException('Category not found');
    }

    const category = result[0];
    return {
      data: {
        id: parseInt(category.id),
        name: category.name || '',
        slug: category.slug || '',
        color: category.color || 'blue',
        type: category.type || 'listing',
        listing_count: parseInt(category.listing_count) || 0,
        is_active: Boolean(category.is_active),
        sort_order: parseInt(category.sort_order) || 0,
        parent_id: category.parent_id ? parseInt(category.parent_id) : null,
        created_at: category.created_at,
      }
    };
  }

  /**
   * Get a specific category by slug with tenant scoping
   * Enhanced with tenant scoping and listing counts
   */
  async getCategoryBySlug(slug?: string, tenantId?: number): Promise<{ data: any }> {
    if (!slug) {
      throw new BadRequestException('Slug parameter is required');
    }
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const query = `
      SELECT c.*,
             (SELECT COUNT(*) FROM listings l WHERE l.category_id = c.id) as listing_count
      FROM categories c
      WHERE c.slug = $1 AND c.tenant_id = $2
    `;

    const result = await this.dataSource.query(query, [slug, tenantId]);

    if (result.length === 0) {
      throw new NotFoundException('Category not found');
    }

    const category = result[0];
    return {
      data: {
        id: parseInt(category.id),
        name: category.name || '',
        slug: category.slug || '',
        color: category.color || 'blue',
        type: category.type || 'listing',
        listing_count: parseInt(category.listing_count) || 0,
        is_active: Boolean(category.is_active),
        sort_order: parseInt(category.sort_order) || 0,
        parent_id: category.parent_id ? parseInt(category.parent_id) : null,
        created_at: category.created_at,
      }
    };
  }

  /**
   * Get hierarchical category tree structure with tenant scoping
   * Enhanced with tenant scoping
   */
  async getCategoryTree(tenantId?: number): Promise<{ data: any[] }> {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const categories = await this.dataSource.query(`
      SELECT c.*,
             (SELECT COUNT(*) FROM listings l WHERE l.category_id = c.id) as listing_count
      FROM categories c
      WHERE c.tenant_id = $1 AND c.is_active = true
      ORDER BY c.parent_id ASC, c.sort_order ASC, c.name ASC
    `, [tenantId]);

    // Build hierarchy
    const categoryMap = new Map();
    const rootCategories = [];

    // First pass: create all category nodes
    categories.forEach((category: any) => {
      categoryMap.set(category.id, {
        id: parseInt(category.id),
        name: category.name || '',
        slug: category.slug || '',
        color: category.color || 'blue',
        type: category.type || 'listing',
        listing_count: parseInt(category.listing_count) || 0,
        is_active: Boolean(category.is_active),
        sort_order: parseInt(category.sort_order) || 0,
        parent_id: category.parent_id ? parseInt(category.parent_id) : null,
        created_at: category.created_at,
        children: []
      });
    });

    // Second pass: build hierarchy
    categories.forEach((category: any) => {
      const categoryNode = categoryMap.get(parseInt(category.id));
      if (category.parent_id === null) {
        rootCategories.push(categoryNode);
      } else {
        const parent = categoryMap.get(parseInt(category.parent_id));
        if (parent) {
          parent.children.push(categoryNode);
        }
      }
    });

    return { data: rootCategories };
  }

  /**
   * Format category data for API response with tenant scoping
   * Enhanced with tenant scoping
   */
  async formatCategorySummary(includePostCount?: boolean, tenantId?: number): Promise<{ data: CategorySummary[] }> {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const queryBuilder = this.categorySummaryRepository.createQueryBuilder('summary')
      .where('summary.tenantId = :tenantId', { tenantId });
    
    if (includePostCount) {
      queryBuilder.addSelect(['summary.postCount']);
    }

    const summaries = await queryBuilder.getMany();
    return { data: summaries };
  }

  /**
   * Get categories filtered by type with tenant scoping
   * Enhanced with tenant scoping and listing counts
   * Source: CategoryService.getByType
   */
  async getCategoriesByType(categoryType?: string, tenantId?: number): Promise<{ data: any[] }> {
    if (!categoryType) {
      throw new BadRequestException('Category type is required');
    }
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const query = `
      SELECT c.*,
             (SELECT COUNT(*) FROM listings l WHERE l.category_id = c.id) as listing_count
      FROM categories c
      WHERE c.tenant_id = $1 AND c.type = $2 AND c.is_active = true
      ORDER BY c.sort_order ASC, c.name ASC
    `;

    const categories = await this.dataSource.query(query, [tenantId, categoryType]);

    const formatted = categories.map((category: any) => ({
      id: parseInt(category.id),
      name: category.name || '',
      slug: category.slug || '',
      color: category.color || 'blue',
      type: category.type || 'listing',
      listing_count: parseInt(category.listing_count) || 0,
      is_active: Boolean(category.is_active),
      sort_order: parseInt(category.sort_order) || 0,
      parent_id: category.parent_id ? parseInt(category.parent_id) : null,
      created_at: category.created_at,
    }));

    return { data: formatted };
  }

  /**
   * Get all categories with optional hierarchy and sorting with tenant scoping
   * Enhanced with tenant scoping and proper type ordering
   * Source: CategoryService.getAll
   */
  async getAllCategoriesService(tenantId?: number, includeHierarchy?: boolean, sortBy?: string | null): Promise<{ data: any[] }> {
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    let orderBy = 'c.sort_order ASC, c.name ASC';
    if (sortBy === 'type') {
      orderBy = 'c.type ASC, c.name ASC';
    }

    const query = `
      SELECT c.*,
             (SELECT COUNT(*) FROM listings l WHERE l.category_id = c.id) as listing_count
      FROM categories c
      WHERE c.tenant_id = $1 AND c.is_active = true
      ORDER BY ${orderBy}
    `;

    const categories = await this.dataSource.query(query, [tenantId]);

    const formatted = categories.map((category: any) => ({
      id: parseInt(category.id),
      name: category.name || '',
      slug: category.slug || '',
      color: category.color || 'blue',
      type: category.type || 'listing',
      listing_count: parseInt(category.listing_count) || 0,
      is_active: Boolean(category.is_active),
      sort_order: parseInt(category.sort_order) || 0,
      parent_id: category.parent_id ? parseInt(category.parent_id) : null,
      created_at: category.created_at,
    }));

    if (includeHierarchy) {
      // Build hierarchy similar to getCategoryTree
      const categoryMap = new Map();
      const rootCategories = [];

      formatted.forEach(category => {
        categoryMap.set(category.id, {
          ...category,
          children: []
        });
      });

      formatted.forEach(category => {
        const categoryNode = categoryMap.get(category.id);
        if (category.parent_id === null) {
          rootCategories.push(categoryNode);
        } else {
          const parent = categoryMap.get(category.parent_id);
          if (parent) {
            parent.children.push(categoryNode);
          }
        }
      });

      return { data: rootCategories };
    }

    return { data: formatted };
  }
}