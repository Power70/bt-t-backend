import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInstructorCourseDto {
  @ApiProperty({
    description: 'Course title',
    example: 'Introduction to TypeScript',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Course description',
    example: 'Learn TypeScript from scratch with hands-on examples',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Course image URL',
    example: 'https://example.com/images/typescript-course.jpg',
  })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Course price in main currency unit',
    example: 99.99,
    minimum: 0,
    default: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiProperty({
    description: 'Category name (must exist)',
    example: 'Web Development',
  })
  @IsString()
  @IsNotEmpty()
  categoryName: string;
}
