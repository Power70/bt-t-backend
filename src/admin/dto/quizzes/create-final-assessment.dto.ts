import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateQuestionDto } from './create-question.dto';

export class CreateFinalAssessmentDto {
  @ApiProperty({
    description:
      'Array of questions for this final assessment (at least 1 question)',
    type: [CreateQuestionDto],
    example: [
      {
        text: 'What is the output of console.log(typeof null)?',
        options: [
          { text: 'object', isCorrect: true },
          { text: 'null', isCorrect: false },
          { text: 'undefined', isCorrect: false },
        ],
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  @ArrayMinSize(1, { message: 'Final assessment must have at least 1 question' })
  @IsOptional()
  questions?: CreateQuestionDto[];
}

