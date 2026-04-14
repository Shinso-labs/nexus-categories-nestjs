import { Injectable, NotFoundException } from '@nestjs/common';
import { Category } from './entities/category.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class CategoriesModuleService {
  constructor(
    @InjectRepository(Category)
    private readonly repository: Repository<Category>,
  ) {}

  /**
   * Get all public categories with optional parent filtering
   * Source: CategoriesController.index
   */
  async getCategories(includeInactive?: boolean): Promise<any> {
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
   * Source: 
   */
  async getCategoryById(id: number): Promise<any> {
    const category = await this.repository.findOne({ where: { id } });
    
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    
    return { data: category };
  }

  /**
   * Get a specific category by slug
   * Source: 
   */
  async getCategoryBySlug(slug: string): Promise<any> {
    if (!slug) {
      throw new NotFoundException('Slug is required');
    }

    const category = await this.repository.findOne({ where: { slug } });
    
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    
    return { data: category };
  }

  /**
   * Get hierarchical category tree structure
   * Source: 
   */
  async getCategoryTree(): Promise<any> {
    const queryBuilder = this.repository.createQueryBuilder('category')
      .where('category.isActive = :isActive', { isActive: true })
      .orderBy('category.parentId', 'ASC')
      .addOrderBy('category.sortOrder', 'ASC')
      .addOrderBy('category.name', 'ASC');

    const categories = await queryBuilder.getMany();
    
    // Build tree structure
    const categoryMap = new Map();
    const tree = [];

    // First pass: create map of all categories
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // Second pass: build tree structure
    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id);
      if (category.parentId && categoryMap.has(category.parentId)) {
        categoryMap.get(category.parentId).children.push(categoryWithChildren);
      } else {
        tree.push(categoryWithChildren);
      }
    });

    return { data: tree };
  }

  /**
   * Format category data for API response
   * Source: 
   */
  async formatCategorySummary(includePostCount?: boolean): Promise<any> {
    const queryBuilder = this.repository.createQueryBuilder('category')
      .select(['category.id', 'category.name', 'category.slug', 'category.parentId'])
      .where('category.isActive = :isActive', { isActive: true });

    if (includePostCount) {
      queryBuilder.addSelect('category.postCount');
    }

    queryBuilder
      .orderBy('category.sortOrder', 'ASC')
      .addOrderBy('category.name', 'ASC');

    const categories = await queryBuilder.getMany();
    return { data: categories };
  }

  /**
   * Get categories filtered by type
   * Source: CategoryService.getByType
   */
  async getCategoriesByType(categoryType?: string, includeInactive?: boolean): Promise<any> {
    const queryBuilder = this.repository.createQueryBuilder('category');
    
    if (categoryType) {
      // Assuming there's a type column or similar field to filter by
      queryBuilder.where('category.type = :type', { type: categoryType });
    }
    
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
  async getAllCategoriesService(includeHierarchy?: boolean, sortBy?: string | null): Promise<any> {
    const queryBuilder = this.repository.createQueryBuilder('category')
      .where('category.isActive = :isActive', { isActive: true });

    // Apply sorting
    if (sortBy === 'name') {
      queryBuilder.orderBy('category.name', 'ASC');
    } else if (sortBy === 'postCount') {
      queryBuilder.orderBy('category.postCount', 'DESC');
    } else {
      // Default sorting like Laravel: type, sort_order, name
      queryBuilder
        .orderBy('category.sortOrder', 'ASC')
        .addOrderBy('category.name', 'ASC');
    }

    const categories = await queryBuilder.getMany();

    if (includeHierarchy) {
      // Build hierarchical structure
      const categoryMap = new Map();
      const tree = [];

      categories.forEach(category => {
        categoryMap.set(category.id, { ...category, children: [] });
      });

      categories.forEach(category => {
        const categoryWithChildren = categoryMap.get(category.id);
        if (category.parentId && categoryMap.has(category.parentId)) {
          categoryMap.get(category.parentId).children.push(categoryWithChildren);
        } else {
          tree.push(categoryWithChildren);
        }
      });

      return { data: tree };
    }

    return { data: categories };
  }
}