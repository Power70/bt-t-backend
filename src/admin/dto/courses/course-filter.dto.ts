import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationDto } from '../common/pagination.dto';
import { Status } from '../../../../generated/prisma';

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
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by course status',
    enum: Status,
    example: Status.InProgress,
  })
  @IsEnum(Status)
  @IsOptional()
  status?: Status;
}
