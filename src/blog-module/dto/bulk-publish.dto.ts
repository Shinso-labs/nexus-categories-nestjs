import { IsArray, IsNumber } from 'class-validator';

export class BulkPublishDto {
  @IsArray()
  @IsNumber({}, { each: true })
  post_ids: number[];
}