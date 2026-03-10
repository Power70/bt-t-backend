import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInstructorProfileDto {
  @ApiPropertyOptional({ description: 'Instructor name', example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({
    description: 'New password (min 6 chars)',
    example: 'newPass123',
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
