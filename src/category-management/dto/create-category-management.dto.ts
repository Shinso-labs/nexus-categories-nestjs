import { IsOptional, IsString, IsNumber, IsBoolean, IsIn } from 'class-validator';

/**
 * DTO for creating a category.
 * Source: AdminCategoriesController.store() — inline validation
 */
export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsIn(['listing', 'event', 'blog', 'resource', 'vol_opportunity'])
  type?: string;
}

/**
 * DTO for updating a category (all fields optional).
 * Source: AdminCategoriesController.update()
 */
export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsIn(['listing', 'event', 'blog', 'resource', 'vol_opportunity'])
  type?: string;
}

/**
 * DTO for creating an attribute.
 * Source: AdminCategoriesController.storeAttribute()
 */
export class CreateAttributeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  category_id?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  input_type?: string;
}

/**
 * DTO for updating an attribute.
 * Source: AdminCategoriesController.updateAttribute()
 */
export class UpdateAttributeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  category_id?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  input_type?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}