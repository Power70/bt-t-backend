import { IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class LessonOrderItem {
  @ApiProperty({
    description: 'Lesson ID',
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

export class ReorderLessonsDto {
  @ApiProperty({
    description: 'Array of lesson IDs with their new order positions',
    type: [LessonOrderItem],
    example: [
      { id: 'clx111', order: 0 },
      { id: 'clx222', order: 1 },
      { id: 'clx333', order: 2 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LessonOrderItem)
  lessons: LessonOrderItem[];
}
