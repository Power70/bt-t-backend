import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({
    description: 'Google OAuth access token',
    example: 'ya29.a0AfH6SM...',
  })
  @IsNotEmpty()
  @IsString()
  accessToken: string;
}
