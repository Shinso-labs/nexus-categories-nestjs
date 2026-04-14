import { Module } from '@nestjs/common';
import { AdminCategoriesModuleModule } from './admin-categories/admin-categories.module';

@Module({
  imports: [
    AdminCategoriesModuleModule,
  ],
})
export class AppModule {}
