import { ApiProperty } from '@nestjs/swagger';

class QuizOptionDto {
  @ApiProperty({ example: 'cm123option' })
  id: string;

  @ApiProperty({ example: 'This is option A' })
  text: string;
}

class QuizQuestionDto {
  @ApiProperty({ example: 'cm123question' })
  id: string;

  @ApiProperty({ example: 'What is JavaScript?' })
  text: string;

  @ApiProperty({ type: [QuizOptionDto] })
  options: QuizOptionDto[];
}

export class ModuleQuizDetailsDto {
  @ApiProperty({ example: 'cm123quiz' })
  id: string;

  @ApiProperty({ example: 'cm123module' })
  moduleId: string;

  @ApiProperty({ example: 'Introduction to JavaScript' })
  moduleTitle: string;

  @ApiProperty({ type: [QuizQuestionDto] })
  questions: QuizQuestionDto[];
}
