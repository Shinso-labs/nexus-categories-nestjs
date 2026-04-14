import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminCategoriesModuleController } from './admin-categories.controller';
import { AdminCategoriesModuleService } from './admin-categories.service';
import { AdminCategory } from './entities/admin-category.entity';
import { AdminCategoryIndex } from './entities/admin-category-index.entity';
import { AdminAttribute } from './entities/admin-attribute.entity';
import { AdminAttributeIndex } from './entities/admin-attribute-index.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { AdminBlogController } from './admin-blog.controller';
import { AdminBlogService } from './admin-blog.service';
import { BlogPost } from './entities/blog-post.entity';
import { SeoMetadata } from './entities/seo-metadata.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminCategory, 
      AdminCategoryIndex, 
      AdminAttribute, 
      AdminAttributeIndex, 
      ActivityLog,
      BlogPost,
      SeoMetadata
    ]),
  ],
  controllers: [AdminCategoriesModuleController, AdminBlogController],
  providers: [AdminCategoriesModuleService, AdminBlogService],
  exports: [AdminCategoriesModuleService, AdminBlogService],
})
export class AdminCategoriesModuleModule {}