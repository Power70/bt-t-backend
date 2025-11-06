import { ApiProperty } from '@nestjs/swagger';

export class ActivityLogResultDto {
  @ApiProperty({ example: 'success' })
  status: string;

  @ApiProperty({
    description: 'Message about the activity logging',
    example: 'Activity logged successfully',
  })
  message: string;

  @ApiProperty({
    description: 'ID of the created activity log',
    example: 'cm123activitylog',
  })
  activityLogId: string;
}

