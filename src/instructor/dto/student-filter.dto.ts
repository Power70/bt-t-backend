import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../admin/dto/common/pagination.dto';
import { Status } from '../../../generated/prisma';

export class InstructorStudentFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search by student name or email',
    example: 'john',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by enrollment status',
    enum: Status,
    example: Status.InProgress,
  })
  @IsEnum(Status)
  @IsOptional()
  status?: Status;
}
