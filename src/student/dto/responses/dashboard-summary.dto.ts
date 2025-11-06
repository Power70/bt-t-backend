import { ApiProperty } from '@nestjs/swagger';

export class DashboardSummaryDto {
  @ApiProperty({
    description: 'Total number of courses the student is enrolled in',
    example: 5,
  })
  totalEnrolled: number;

  @ApiProperty({
    description: 'Total number of courses the student has completed',
    example: 2,
  })
  totalCompleted: number;

  @ApiProperty({
    description: 'Average completion percentage across all enrolled courses',
    example: 65.5,
  })
  avgCompletion: number;

  @ApiProperty({
    description: 'Total study time in hours over the last 7 days',
    example: 12.5,
  })
  totalStudyTime: number;
}

