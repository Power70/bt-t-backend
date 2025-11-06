import { IsArray, IsString, ValidateNested, ArrayMinSize } from 'class-validator';
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
    description: 'ID of the selected option',
    example: 'cm123option789',
  })
  @IsString()
  optionId: string;
}

export class SubmitQuizDto {
  @ApiProperty({
    description: 'Array of answers submitted by the student',
    type: [QuizAnswerDto],
    example: [
      { questionId: 'cm123q1', optionId: 'cm123opt1' },
      { questionId: 'cm123q2', optionId: 'cm123opt2' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  @ArrayMinSize(1)
  answers: QuizAnswerDto[];
}

