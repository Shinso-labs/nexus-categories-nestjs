import { IsArray, IsNumber, IsOptional } from 'class-validator';

export class BulkDeleteDto {
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  postIds?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  attributeIds?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  ids?: number[];
}