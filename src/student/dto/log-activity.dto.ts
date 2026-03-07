import { IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogActivityDto {
  @ApiProperty({
    description: 'ID of the lesson being studied',
    example: 'cm123abc456def789',
  })
  @IsString()
  lessonId: string;

  @ApiProperty({
    description: 'Duration of the study session in seconds',
    example: 300,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  durationSeconds: number;
}
