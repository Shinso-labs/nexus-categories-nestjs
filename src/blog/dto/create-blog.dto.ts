import { IsOptional, IsNumber, IsString, IsBoolean } from 'class-validator';

export class CreateBlogModuleDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  title?: string;

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
  @IsNumber()
  authorId?: number;

  @IsOptional()
  @IsString()
  categoryIds?: number[];

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  publishedAt?: number | null;

  @IsOptional()
  @IsNumber()
  updatedAt?: number;

  @IsOptional()
  @IsNumber()
  viewCount?: number;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsString()
  metaTitle?: string | null;

  @IsOptional()
  @IsString()
  metaDescription?: string | null;
}