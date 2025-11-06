import { IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ModuleOrderItem {
  @ApiProperty({
    description: 'Module ID',
    example: 'clx1234567890abcdef',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'New order position',
    example: 1,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  order: number;
}

export class ReorderModulesDto {
  @ApiProperty({
    description: 'Array of module IDs with their new order positions',
    type: [ModuleOrderItem],
    example: [
      { id: 'clx111', order: 0 },
      { id: 'clx222', order: 1 },
      { id: 'clx333', order: 2 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModuleOrderItem)
  modules: ModuleOrderItem[];
}
