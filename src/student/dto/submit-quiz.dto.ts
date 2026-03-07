import {
  IsArray,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class QuizAnswerDto {
  @ApiProperty({
    description: 'ID of the question being answered',
    example: 'cm123question456',
  })
  @IsString()
  questionId: string;

  @ApiProperty({
    description:
      'Array of selected option IDs (single for radio, multiple for checkbox)',
    example: ['cm123option789'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  optionIds: string[];
}

export class SubmitQuizDto {
  @ApiProperty({
    description: 'Array of answers submitted by the student',
    type: [QuizAnswerDto],
    example: [
      { questionId: 'cm123q1', optionIds: ['cm123opt1'] },
      { questionId: 'cm123q2', optionIds: ['cm123opt2', 'cm123opt3'] },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  @ArrayMinSize(1)
  answers: QuizAnswerDto[];
}
