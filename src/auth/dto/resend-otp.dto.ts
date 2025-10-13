import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendOtpDto {
  @ApiProperty({
    description: 'User\'s email address to resend OTP to',
    example: 'user@example.com',
    format: 'email'
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}