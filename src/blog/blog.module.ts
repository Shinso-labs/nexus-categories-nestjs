import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogModuleController, AdminBlogController } from './blog.controller';
import { BlogModuleService } from './blog.service';
import { BlogPost } from './entities/blog-post.entity';
import { Author } from './entities/author.entity';
import { BlogIndex } from './entities/blog-index.entity';
import { PostSummary } from './entities/post-summary.entity';
import { AuthorSummary } from './entities/author-summary.entity';
import { BlogConfig } from './entities/blog-config.entity';
import { CategoryIndex } from './entities/category-index.entity';
import { PostCategory } from './entities/post-category.entity';
import { PostMetrics } from './entities/post-metrics.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { SeoMetadata } from './entities/seo-metadata.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BlogPost, 
      Author, 
      BlogIndex, 
      PostSummary, 
      AuthorSummary, 
      BlogConfig, 
      CategoryIndex, 
      PostCategory, 
      PostMetrics,
      ActivityLog,
      SeoMetadata
    ]),
  ],
  controllers: [BlogModuleController, AdminBlogController],
  providers: [BlogModuleService],
  exports: [BlogModuleService],
})
export class BlogModuleModule {}