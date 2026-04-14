import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class UpdateAttributeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  category_id?: number;

  @IsOptional()
  @IsString()
  input_type?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}