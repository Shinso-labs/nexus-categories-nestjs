import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminBlogModuleController } from './admin-blog.controller';
import { AdminBlogModuleService } from './admin-blog.service';
import { CategoryManagementService } from './category-management.service';
import { AdminCategoriesController } from './admin-categories.controller';
import { BaseApiController } from './base-api.controller';
import { AdminBlogPost } from './entities/admin-blog-post.entity';
import { AdminBlogIndex } from './entities/admin-blog-index.entity';
import { BulkOperation } from './entities/bulk-operation.entity';
import { Category } from './entities/category.entity';
import { SeoMetadata } from './entities/seo-metadata.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { AuditLogService } from './audit-log.service';
import { HtmlSanitizerService } from './html-sanitizer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdminBlogPost, AdminBlogIndex, BulkOperation, Category, SeoMetadata, ActivityLog]),
  ],
  controllers: [AdminBlogModuleController, AdminCategoriesController],
  providers: [AdminBlogModuleService, CategoryManagementService, BaseApiController, AuditLogService, HtmlSanitizerService],
  exports: [AdminBlogModuleService, CategoryManagementService, BaseApiController, AuditLogService, HtmlSanitizerService],
})
export class AdminBlogModuleModule {}