import {
  IsString,
  IsEnum,
  IsOptional,
  IsUrl,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LessonType } from '../../../../generated/prisma';

export class UpdateLessonDto {
  @ApiPropertyOptional({
    description: 'Lesson title',
    example: 'Advanced Variables and Scoping',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Lesson type',
    enum: LessonType,
    example: LessonType.VIDEO,
  })
  @IsEnum(LessonType)
  @IsOptional()
  type?: LessonType;

  @ApiPropertyOptional({
    description: 'Lesson content (will be cleared if type changes to VIDEO)',
    example: 'Updated lesson content...',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: 'Video URL (will be cleared if type changes to TEXT or QUIZ)',
    example: 'https://www.youtube.com/watch?v=newvideo123',
  })
  @IsUrl()
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Lesson order',
    example: 2,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({
    description: 'Estimated completion time in seconds',
    example: 1200,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  completionTime?: number;
}
