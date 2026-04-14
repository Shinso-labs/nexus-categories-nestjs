import { IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class AttributeOrderItem {
  @IsNumber()
  id: number;

  @IsNumber()
  sort_order: number;
}

export class ReorderAttributesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeOrderItem)
  attributes: AttributeOrderItem[];
}