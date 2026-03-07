import { ApiProperty } from '@nestjs/swagger';

export class QuizSubmissionResultDto {
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
    example: 80,
  })
  percentage: number;

  @ApiProperty({
    description: 'Whether the student passed the quiz (≥80%)',
    example: true,
  })
  passed: boolean;

  @ApiProperty({
    description: 'Message about the submission',
    example: 'Quiz submitted successfully. You passed!',
  })
  message: string;
}
