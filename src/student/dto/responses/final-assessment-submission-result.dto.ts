import { ApiProperty } from '@nestjs/swagger';

export class FinalAssessmentSubmissionResultDto {
  @ApiProperty({
    description: 'ID of the quiz submission',
    example: 'cm123submission',
  })
  submissionId: string;

  @ApiProperty({
    description: 'Score achieved by the student',
    example: 8,
  })
  score: number;

  @ApiProperty({
    description: 'Total number of questions',
    example: 10,
  })
  total: number;

  @ApiProperty({
    description: 'Percentage score',
    example: 85,
  })
  percentage: number;

  @ApiProperty({
    description: 'Whether the student passed the final assessment (≥80%)',
    example: true,
  })
  passed: boolean;

  @ApiProperty({
    description: 'Message about the submission',
    example:
      'Congratulations! You have completed the course and your certificate is ready.',
  })
  message: string;

  @ApiProperty({
    description: 'Course ID',
    example: 'cm123course',
  })
  courseId: string;

  @ApiProperty({
    description: 'Whether the course is now completed',
    example: true,
  })
  courseCompleted: boolean;

  @ApiProperty({
    description: 'Certificate ID if generated',
    example: 'cm123certificate',
    nullable: true,
  })
  certificateId: string | null;
}
