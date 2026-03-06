import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateOptionDto } from './create-option.dto';

export class CreateQuestionDto {
  @ApiProperty({
    description: 'Question text',
    example: 'What is JavaScript?',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    description: 'Array of options for this question (at least 2 options)',
    type: [CreateOptionDto],
    example: [
      { text: 'A programming language', isCorrect: true },
      { text: 'A markup language', isCorrect: false },
      { text: 'A database', isCorrect: false },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  @ArrayMinSize(2, { message: 'Each question must have at least 2 options' })
  options: CreateOptionDto[];
}
