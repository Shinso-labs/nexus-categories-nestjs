import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories-module/entities/category.entity';

@Injectable()
export class BlogCategoryManagementService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  /**
   * Get all public categories for blog display
   */
  async getPublicCategories(): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' }
    });
  }

  /**
   * Get category by ID for blog posts
   */
  async getCategoryById(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id, isActive: true }
    });
    
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    
    return category;
  }

  /**
   * Get category by slug for SEO-friendly URLs
   */
  async getCategoryBySlug(slug: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { slug, isActive: true }
    });
    
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    
    return category;
  }

  /**
   * Get categories by type for blog organization
   */
  async getCategoriesByType(type: string): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { type, isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' }
    });
  }

  /**
   * Get hierarchical category tree for blog navigation
   */
  async getCategoryTree(): Promise<any[]> {
    const categories = await this.categoryRepository.find({
      where: { isActive: true },
      order: { parentId: 'ASC', sortOrder: 'ASC', name: 'ASC' }
    });

    return this.buildCategoryTree(categories);
  }

  /**
   * Get categories with post counts for blog sidebars
   */
  async getCategoriesWithPostCounts(): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { isActive: true },
      order: { postCount: 'DESC', name: 'ASC' }
    });
  }

  /**
   * Get popular categories based on post count
   */
  async getPopularCategories(limit: number = 10): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { isActive: true },
      order: { postCount: 'DESC' },
      take: limit
    });
  }

  /**
   * Search categories for blog search functionality
   */
  async searchCategories(searchTerm: string): Promise<Category[]> {
    if (!searchTerm.trim()) {
      return [];
    }

    return await this.categoryRepository
      .createQueryBuilder('category')
      .where('category.isActive = :isActive', { isActive: true })
      .andWhere('(LOWER(category.name) LIKE LOWER(:searchTerm) OR LOWER(category.description) LIKE LOWER(:searchTerm))', 
        { searchTerm: `%${searchTerm}%` })
      .orderBy('category.name', 'ASC')
      .getMany();
  }

  /**
   * Get category breadcrumb trail
   */
  async getCategoryBreadcrumbs(categoryId: number): Promise<Category[]> {
    const breadcrumbs: Category[] = [];
    let currentCategory = await this.getCategoryById(categoryId);

    while (currentCategory) {
      breadcrumbs.unshift(currentCategory);
      
      if (currentCategory.parentId) {
        currentCategory = await this.getCategoryById(currentCategory.parentId);
      } else {
        currentCategory = null;
      }
    }

    return breadcrumbs;
  }

  /**
   * Get related categories based on type and parent
   */
  async getRelatedCategories(categoryId: number, limit: number = 5): Promise<Category[]> {
    const category = await this.getCategoryById(categoryId);
    
    const queryBuilder = this.categoryRepository.createQueryBuilder('category')
      .where('category.isActive = :isActive', { isActive: true })
      .andWhere('category.id != :categoryId', { categoryId });

    if (category.parentId) {
      queryBuilder.andWhere('category.parentId = :parentId', { parentId: category.parentId });
    } else if (category.type) {
      queryBuilder.andWhere('category.type = :type', { type: category.type });
    }

    return await queryBuilder
      .orderBy('category.postCount', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Get child categories for a parent category
   */
  async getChildCategories(parentId: number): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { parentId, isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' }
    });
  }

  /**
   * Get category summary for blog API
   */
  async getCategorySummary(): Promise<any> {
    const categories = await this.categoryRepository.find({
      select: ['id', 'name', 'slug', 'postCount'],
      where: { isActive: true },
      order: { name: 'ASC' }
    });

    return {
      total: categories.length,
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        postCount: cat.postCount
      }))
    };
  }

  /**
   * Build hierarchical category tree structure
   */
  private buildCategoryTree(categories: Category[]): any[] {
    const categoryMap = new Map();
    const tree = [];

    // Create map of all categories with children array
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] });
    });

    // Build tree structure
    categories.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id);
      if (category.parentId && categoryMap.has(category.parentId)) {
        categoryMap.get(category.parentId).children.push(categoryWithChildren);
      } else {
        tree.push(categoryWithChildren);
      }
    });

    return tree;
  }
}