import { IsOptional, IsNumber, IsString, IsBoolean } from 'class-validator';

export class UpdateAdminCategoriesModuleDto {
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
  @IsNumber()
  parentId?: number | null;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  metaTitle?: string | null;

  @IsOptional()
  @IsString()
  metaDescription?: string | null;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  type?: string;
}