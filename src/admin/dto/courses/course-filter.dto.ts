import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../common/pagination.dto';

export class CourseFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description:
      'Universal search across title, instructor name/email, and category (partial match)',
    example: 'typescript',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by course title (partial match)',
    example: 'TypeScript',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Filter by instructor name or email (partial match)',
    example: 'john',
  })
  @IsString()
  @IsOptional()
  instructor?: string;

  @ApiPropertyOptional({
    description: 'Filter by category name (partial match)',
    example: 'Web',
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by published status',
    example: true,
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
