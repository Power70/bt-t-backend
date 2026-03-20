import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Email address to send the invitation to',
    example: 'instructor@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
