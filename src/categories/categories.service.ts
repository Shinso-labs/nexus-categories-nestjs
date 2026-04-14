import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Category } from './entities/category.entity';
import { CategorySummary } from './entities/category-summary.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CategoriesModuleService {
  constructor(
    @InjectRepository(Category)
    private readonly repository: Repository<Category>,
    @InjectRepository(CategorySummary)
    private readonly categorySummaryRepository: Repository<CategorySummary>,
  ) {}

  /**
   * Get all public categories with optional parent filtering
   * Source: CategoriesController.index
   */
  async getCategories(includeInactive?: boolean): Promise<{ data: Category[] }> {
    const queryBuilder = this.repository.createQueryBuilder('category');
    
    if (!includeInactive) {
      queryBuilder.where('category.isActive = :isActive', { isActive: true });
    }
    
    queryBuilder
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('category.name', 'ASC');

    const categories = await queryBuilder.getMany();
    return { data: categories };
  }

  /**
   * Get a specific category by ID
   */
  async getCategoryById(id: number): Promise<{ data: Category }> {
    const category = await this.repository.createQueryBuilder('category')
      .where('category.id = :id', { id })
      .getOne();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return { data: category };
  }

  /**
   * Get a specific category by slug
   */
  async getCategoryBySlug(slug?: string): Promise<{ data: Category }> {
    if (!slug) {
      throw new BadRequestException('Slug parameter is required');
    }

    const category = await this.repository.createQueryBuilder('category')
      .where('category.slug = :slug', { slug })
      .getOne();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return { data: category };
  }

  /**
   * Get hierarchical category tree structure
   */
  async getCategoryTree(): Promise<{ data: any[] }> {
    const categories = await this.repository.createQueryBuilder('category')
      .where('category.isActive = :isActive', { isActive: true })
      .orderBy('category.parentId', 'ASC')
      .addOrderBy('category.sortOrder', 'ASC')
      .addOrderBy('category.name', 'ASC')
      .getMany();

    // Build hierarchy
    const categoryMap = new Map();
    const rootCategories = [];

    // First pass: create all category nodes
    categories.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        children: []
      });
    });

    // Second pass: build hierarchy
    categories.forEach(category => {
      const categoryNode = categoryMap.get(category.id);
      if (category.parentId === null) {
        rootCategories.push(categoryNode);
      } else {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(categoryNode);
        }
      }
    });

    return { data: rootCategories };
  }

  /**
   * Format category data for API response
   */
  async formatCategorySummary(includePostCount?: boolean): Promise<{ data: CategorySummary[] }> {
    const queryBuilder = this.categorySummaryRepository.createQueryBuilder('summary');
    
    if (includePostCount) {
      queryBuilder.addSelect(['summary.postCount']);
    }

    const summaries = await queryBuilder.getMany();
    return { data: summaries };
  }

  /**
   * Get categories filtered by type
   * Source: CategoryService.getByType
   */
  async getCategoriesByType(categoryType?: string, includeInactive?: boolean): Promise<{ data: Category[] }> {
    if (!categoryType) {
      throw new BadRequestException('Category type is required');
    }

    const queryBuilder = this.repository.createQueryBuilder('category');

    // Note: The Laravel code uses ->ofType() which suggests there's a type field
    // Since our entity doesn't have a type field, we'll use name pattern matching
    // or you may need to add a type field to the Category entity
    queryBuilder.where('LOWER(category.name) LIKE :type', { 
      type: `%${categoryType.toLowerCase()}%` 
    });

    if (!includeInactive) {
      queryBuilder.andWhere('category.isActive = :isActive', { isActive: true });
    }

    queryBuilder
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('category.name', 'ASC');

    const categories = await queryBuilder.getMany();
    return { data: categories };
  }

  /**
   * Get all categories with optional hierarchy and sorting
   * Source: CategoryService.getAll
   */
  async getAllCategoriesService(includeHierarchy?: boolean, sortBy?: string | null): Promise<{ data: Category[] | any[] }> {
    const queryBuilder = this.repository.createQueryBuilder('category')
      .where('category.isActive = :isActive', { isActive: true });

    // Apply sorting based on sortBy parameter
    if (sortBy === 'type') {
      // Note: Laravel code orders by 'type' first, but our entity doesn't have type
      // You may need to add a type field or modify this logic
      queryBuilder
        .orderBy('category.name', 'ASC') // fallback to name ordering
        .addOrderBy('category.sortOrder', 'ASC');
    } else {
      queryBuilder
        .orderBy('category.sortOrder', 'ASC')
        .addOrderBy('category.name', 'ASC');
    }

    const categories = await queryBuilder.getMany();

    if (includeHierarchy) {
      // Build hierarchy similar to getCategoryTree
      const categoryMap = new Map();
      const rootCategories = [];

      categories.forEach(category => {
        categoryMap.set(category.id, {
          ...category,
          children: []
        });
      });

      categories.forEach(category => {
        const categoryNode = categoryMap.get(category.id);
        if (category.parentId === null) {
          rootCategories.push(categoryNode);
        } else {
          const parent = categoryMap.get(category.parentId);
          if (parent) {
            parent.children.push(categoryNode);
          }
        }
      });

      return { data: rootCategories };
    }

    return { data: categories };
  }
}