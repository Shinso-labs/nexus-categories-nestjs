import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  @IsIn(['listing', 'event', 'blog', 'resource', 'vol_opportunity'])
  type?: string;
}