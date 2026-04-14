import { IsArray, IsNumber, ArrayMaxSize, ArrayNotEmpty } from 'class-validator';

export class BulkDeleteDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsNumber({}, { each: true })
  post_ids: number[];
}