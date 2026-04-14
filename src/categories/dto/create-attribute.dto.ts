import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateAttributeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  category_id?: number;

  @IsOptional()
  @IsString()
  input_type?: string;
}