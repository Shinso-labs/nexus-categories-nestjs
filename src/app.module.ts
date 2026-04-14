import { Module } from '@nestjs/common';
import { AdminBlogModuleModule } from './admin-blog/admin-blog.module';

@Module({
  imports: [
    AdminBlogModuleModule,
  ],
})
export class AppModule {}
