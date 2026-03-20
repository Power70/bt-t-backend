import { IsString, IsOptional, IsNumber, Min, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInstructorCourseDto {
  @ApiPropertyOptional({
    description: 'Course title',
    example: 'Advanced TypeScript Patterns',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Course description',
    example: 'Master advanced TypeScript patterns and techniques',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Course image URL',
    example: 'https://example.com/images/typescript-advanced.jpg',
  })
  @IsUrl()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Course price in main currency unit',
    example: 149.99,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({
    description: 'Category name (must exist)',
    example: 'Web Development',
  })
  @IsString()
  @IsOptional()
  categoryName?: string;
}
