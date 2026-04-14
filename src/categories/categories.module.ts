import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModuleController } from './categories.controller';
import { AdminCategoriesController } from './admin-categories.controller';
import { CategoriesModuleService } from './categories.service';
import { AdminCategoriesService } from './admin-categories.service';
import { Category } from './entities/category.entity';
import { CategoryIndex } from './entities/category-index.entity';
import { CategorySummary } from './entities/category-summary.entity';
import { Attribute } from './entities/attribute.entity';
import { ActivityLog } from '../activity-log/entities/activity-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category, 
      CategoryIndex, 
      CategorySummary, 
      Attribute,
      ActivityLog
    ]),
  ],
  controllers: [CategoriesModuleController, AdminCategoriesController],
  providers: [CategoriesModuleService, AdminCategoriesService],
  exports: [CategoriesModuleService, AdminCategoriesService],
})
export class CategoriesModuleModule {}