import { IsOptional, IsNumber, IsString, IsBoolean } from 'class-validator';

export class CreateCategoriesModuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  parentId?: number | null;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  postCount?: number;

  @IsOptional()
  @IsNumber()
  updatedAt?: number;
}