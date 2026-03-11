import {
  IsString,
  IsEnum,
  IsOptional,
  IsUrl,
  IsInt,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { LessonType } from '../../../generated/prisma';

export class UpdateInstructorLessonDto {
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
    description: 'Lesson content',
    example: 'Updated lesson content...',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: 'Video URL',
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
    description: 'Estimated completion time in minutes (stored as seconds internally)',
    example: 20,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  completionTime?: number;
}
