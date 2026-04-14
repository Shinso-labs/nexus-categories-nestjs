import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminCategoriesModuleController } from './admin-categories.controller';
import { AdminCategoriesModuleService } from './admin-categories.service';
import { AdminCategory } from './entities/admin-category.entity';
import { AdminCategoryIndex } from './entities/admin-category-index.entity';
import { AdminAttribute } from './entities/admin-attribute.entity';
import { AdminAttributeIndex } from './entities/admin-attribute-index.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminCategory, 
      AdminCategoryIndex, 
      AdminAttribute, 
      AdminAttributeIndex
    ]),
  ],
  controllers: [AdminCategoriesModuleController],
  providers: [AdminCategoriesModuleService],
  exports: [AdminCategoriesModuleService],
})
export class AdminCategoriesModule {}