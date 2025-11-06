import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../../generated/prisma';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User email address',
    example: 'newemail@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'User full name',
    example: 'John Updated',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'User password (minimum 6 characters)',
    example: 'NewPassword123!',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({
    description: 'User role',
    enum: UserRole,
    example: UserRole.INSTRUCTOR,
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'User verification status',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;
}
