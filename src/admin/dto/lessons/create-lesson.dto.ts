import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsUrl,
  IsInt,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LessonType } from '../../../../generated/prisma';

export class CreateLessonDto {
  @ApiProperty({
    description: 'Lesson title',
    example: 'Introduction to Variables',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Lesson type',
    enum: LessonType,
    example: LessonType.VIDEO,
  })
  @IsEnum(LessonType)
  type: LessonType;

  @ApiPropertyOptional({
    description: 'Lesson content (required for TEXT and QUIZ types)',
    example: 'In this lesson, we will learn about variables in TypeScript...',
  })
  @ValidateIf((o) => o.type === LessonType.TEXT || o.type === LessonType.QUIZ)
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: 'Video URL (required for VIDEO type)',
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  })
  @ValidateIf((o) => o.type === LessonType.VIDEO)
  @IsUrl()
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional({
    description: 'Lesson order (auto-calculated if not provided)',
    example: 1,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({
    description:
      'Estimated completion time in minutes (stored as seconds internally)',
    example: 15,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  completionTime?: number;
}
