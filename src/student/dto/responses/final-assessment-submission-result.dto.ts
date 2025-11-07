import { ApiProperty } from '@nestjs/swagger';

export class QuestionFeedbackDto {
  @ApiProperty({
    description: 'Question ID',
    example: 'cm123question',
  })
  questionId: string;

  @ApiProperty({
    description: 'Question text',
    example: 'What is the capital of France?',
  })
  questionText: string;

  @ApiProperty({
    description: 'Whether the student answered this question correctly',
    example: true,
  })
  isCorrect: boolean;

  @ApiProperty({
    description: 'Option IDs selected by the student',
    example: ['cm123opt1', 'cm123opt2'],
    type: [String],
  })
  studentAnswers: string[];

  @ApiProperty({
    description: 'Option IDs that are correct',
    example: ['cm123opt1', 'cm123opt2'],
    type: [String],
  })
  correctAnswers: string[];

  @ApiProperty({
    description: 'All options for this question with their details',
    example: [
      { id: 'cm123opt1', text: 'Paris', isCorrect: true },
      { id: 'cm123opt2', text: 'London', isCorrect: false },
    ],
  })
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
}

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

  @ApiProperty({
    description:
      'Detailed feedback for each question showing correct/incorrect answers',
    type: [QuestionFeedbackDto],
  })
  feedback: QuestionFeedbackDto[];
}
