import { Module } from '@nestjs/common';
import { BlogModuleModule } from './blog/blog.module';

@Module({
  imports: [
    BlogModuleModule,
  ],
})
export class AppModule {}
