import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

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

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}