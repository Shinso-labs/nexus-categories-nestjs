import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModuleController } from './categories.controller';
import { CategoriesModuleService } from './categories.service';
import { Category } from './entities/category.entity';
import { CategoryIndex } from './entities/category-index.entity';
import { CategorySummary } from './entities/category-summary.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, CategoryIndex, CategorySummary]),
  ],
  controllers: [CategoriesModuleController],
  providers: [CategoriesModuleService],
  exports: [CategoriesModuleService],
})
export class CategoriesModuleModule {}