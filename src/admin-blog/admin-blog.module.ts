import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminBlogModuleController } from './admin-blog.controller';
import { AdminBlogModuleService } from './admin-blog.service';
import { AdminBlogPost } from './entities/admin-blog-post.entity';
import { AdminBlogIndex } from './entities/admin-blog-index.entity';
import { BulkOperation } from './entities/bulk-operation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminBlogPost, AdminBlogIndex, BulkOperation]),
  ],
  controllers: [AdminBlogModuleController],
  providers: [AdminBlogModuleService],
  exports: [AdminBlogModuleService],
})
export class AdminBlogModuleModule {}
