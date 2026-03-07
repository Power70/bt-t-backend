import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateQuestionDto } from './create-question.dto';

export class AddQuestionDto extends CreateQuestionDto {
  @ApiProperty({
    description: 'Quiz ID to add this question to',
    example: 'cm123quiz456',
  })
  @IsString()
  @IsNotEmpty()
  quizId: string;
}
