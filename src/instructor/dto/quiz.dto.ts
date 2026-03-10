import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';

export class CreateInstructorOptionDto {
  @ApiProperty({ description: 'Option text', example: 'A programming language' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ description: 'Whether this option is correct', example: true })
  @IsBoolean()
  isCorrect: boolean;
}

export class CreateInstructorQuestionDto {
  @ApiProperty({ description: 'Question text', example: 'What is JavaScript?' })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    description: 'Array of options (at least 2)',
    type: [CreateInstructorOptionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInstructorOptionDto)
  @ArrayMinSize(2, { message: 'Each question must have at least 2 options' })
  options: CreateInstructorOptionDto[];
}

export class CreateInstructorQuizDto {
  @ApiProperty({
    description: 'Array of questions for this quiz (at least 1)',
    type: [CreateInstructorQuestionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInstructorQuestionDto)
  @ArrayMinSize(1, { message: 'Quiz must have at least 1 question' })
  @IsOptional()
  questions?: CreateInstructorQuestionDto[];
}

export class UpdateInstructorQuestionDto extends PartialType(
  CreateInstructorQuestionDto,
) {}
