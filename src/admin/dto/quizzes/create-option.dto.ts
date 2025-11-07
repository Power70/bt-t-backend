import { IsString, IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOptionDto {
  @ApiProperty({
    description: 'Option text',
    example: 'JavaScript is a programming language',
  })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({
    description: 'Whether this option is correct',
    example: true,
  })
  @IsBoolean()
  isCorrect: boolean;
}

