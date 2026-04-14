import { IsString, IsOptional, IsIn } from 'class-validator';

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