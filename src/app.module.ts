import { Module } from '@nestjs/common';
import { CategoriesModuleModule } from './categories/categories.module';

@Module({
  imports: [
    CategoriesModuleModule,
  ],
})
export class AppModule {}
