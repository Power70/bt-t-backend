import { IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class OrderItem {
  @ApiProperty({ description: 'Item ID', example: 'clx1234567890abcdef' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'New order position', example: 1, minimum: 0 })
  @IsInt()
  @Min(0)
  order: number;
}

export class ReorderInstructorModulesDto {
  @ApiProperty({
    description: 'Array of module IDs with their new order positions',
    type: [OrderItem],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItem)
  modules: OrderItem[];
}

export class ReorderInstructorLessonsDto {
  @ApiProperty({
    description: 'Array of lesson IDs with their new order positions',
    type: [OrderItem],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItem)
  lessons: OrderItem[];
}
