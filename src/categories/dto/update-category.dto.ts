import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  @IsIn(['listing', 'event', 'blog', 'resource', 'vol_opportunity'])
  type?: string;
}