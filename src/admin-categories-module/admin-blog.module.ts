import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminBlogController } from './admin-blog.controller';
import { AdminBlogService } from './admin-blog.service';
import { BlogPost } from './entities/blog-post.entity';
import { SeoMetadata } from './entities/seo-metadata.entity';
import { User } from './entities/user.entity';
import { Category } from './entities/category.entity';
import { ActivityLog } from './entities/activity-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BlogPost,
      SeoMetadata,
      User,
      Category,
      ActivityLog
    ]),
  ],
  controllers: [AdminBlogController],
  providers: [AdminBlogService],
  exports: [AdminBlogService],
})
export class AdminBlogModule {}