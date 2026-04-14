import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostCategory } from './entities/post-category.entity';

@Injectable()
export class CategoryManagementService {
  constructor(
    @InjectRepository(PostCategory)
    private readonly postCategoryRepository: Repository<PostCategory>,
  ) {}

  /**
   * Get all categories with post counts
   */
  async getAllCategories(): Promise<any> {
    const categories = await this.postCategoryRepository.createQueryBuilder('category')
      .select(['category.categorySlug', 'category.categoryName'])
      .groupBy('category.categorySlug')
      .addGroupBy('category.categoryName')
      .getRawMany();

    return {
      data: categories.map(cat => ({
        id: cat.category_categorySlug,
        name: cat.category_categoryName,
        slug: cat.category_categorySlug,
        color: 'blue',
        post_count: 0,
      }))
    };
  }

  /**
   * Create a new category
   */
  async createCategory(categoryData: { name: string; slug: string }): Promise<any> {
    const category = this.postCategoryRepository.create({
      categoryName: categoryData.name,
      categorySlug: categoryData.slug,
      postId: 0, // Placeholder, will be updated when posts are assigned
    });

    const saved = await this.postCategoryRepository.save(category);
    return { data: saved };
  }

  /**
   * Update category information
   */
  async updateCategory(slug: string, updateData: { name?: string; slug?: string }): Promise<any> {
    const category = await this.postCategoryRepository.findOne({
      where: { categorySlug: slug }
    });

    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }

    if (updateData.name) {
      category.categoryName = updateData.name;
    }
    if (updateData.slug) {
      category.categorySlug = updateData.slug;
    }

    const updated = await this.postCategoryRepository.save(category);
    return { data: updated };
  }

  /**
   * Delete a category
   */
  async deleteCategory(slug: string): Promise<any> {
    const result = await this.postCategoryRepository.delete({ categorySlug: slug });
    
    if (result.affected === 0) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }

    return { data: { success: true, message: `Category "${slug}" deleted successfully` } };
  }
}