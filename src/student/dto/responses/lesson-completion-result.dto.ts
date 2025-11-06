import { ApiProperty } from '@nestjs/swagger';
import { Status } from '../../../../generated/prisma';

export class LessonCompletionResultDto {
  @ApiProperty({ example: 'success' })
  status: string;

  @ApiProperty({
    enum: Status,
    example: Status.InProgress,
    description: 'Updated enrollment status',
  })
  newEnrollmentStatus: Status;

  @ApiProperty({
    description: 'Number of lessons completed',
    example: 15,
  })
  completed: number;

  @ApiProperty({
    description: 'Total number of lessons in the course',
    example: 20,
  })
  total: number;

  @ApiProperty({
    description: 'Message about the completion',
    example: 'Lesson marked as completed',
  })
  message: string;
}

