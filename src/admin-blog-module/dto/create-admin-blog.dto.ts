import { IsOptional, IsNumber, IsString, IsBoolean } from 'class-validator';

export class CreateAdminBlogModuleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  featuredImage?: string | null;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  publishedAt?: number | null;

  @IsOptional()
  @IsNumber()
  authorId?: number;

  @IsOptional()
  @IsString()
  categoryId?: number | null;

  @IsOptional()
  @IsString()
  metaTitle?: string | null;

  @IsOptional()
  @IsString()
  metaDescription?: string | null;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsNumber()
  viewCount?: number;

  @IsOptional()
  @IsNumber()
  updatedAt?: number;
}