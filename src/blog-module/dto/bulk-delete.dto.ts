import { IsArray, IsNumber } from 'class-validator';

export class BulkDeleteDto {
  @IsArray()
  @IsNumber({}, { each: true })
  post_ids: number[];
}