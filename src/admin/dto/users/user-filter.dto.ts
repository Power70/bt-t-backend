import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaginationDto } from '../common/pagination.dto';
import { UserRole } from '../../../../generated/prisma';

export class UserFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Universal search across name and email (partial match)',
    example: 'john',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by user name (partial match)',
    example: 'john',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by user email (partial match)',
    example: 'example.com',
  })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'Filter by user role',
    enum: UserRole,
    example: UserRole.INSTRUCTOR,
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Filter by verification status',
    example: true,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;
}
