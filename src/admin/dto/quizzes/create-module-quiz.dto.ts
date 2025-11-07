import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateQuestionDto } from './create-question.dto';

export class CreateModuleQuizDto {
  @ApiProperty({
    description:
      'Array of questions for this module quiz (at least 1 question)',
    type: [CreateQuestionDto],
    example: [
      {
        text: 'What is JavaScript?',
        options: [
          { text: 'A programming language', isCorrect: true },
          { text: 'A markup language', isCorrect: false },
        ],
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  @ArrayMinSize(1, { message: 'Quiz must have at least 1 question' })
  @IsOptional()
  questions?: CreateQuestionDto[];
}

