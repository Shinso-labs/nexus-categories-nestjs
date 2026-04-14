import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminCategoriesController } from './admin-categories.controller';
import { PublicCategoriesController } from './public-categories.controller';
import { CategoryManagementService } from './category-management.service';
import { Category } from './entities/category.entity';
import { Attribute } from './entities/category-attribute.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Attribute]),
  ],
  controllers: [AdminCategoriesController, PublicCategoriesController],
  providers: [CategoryManagementService],
  exports: [CategoryManagementService],
})
export class CategoryManagementModule {}