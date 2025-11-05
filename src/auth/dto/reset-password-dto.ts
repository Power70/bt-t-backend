import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: "User's new password",
    example: 'StrongPassword123!',
  })
  @IsNotEmpty()
  @IsString()
  newPassword: string;

  @ApiProperty({
    description: "User's confirm password",
    example: 'StrongPassword123!',
  })
  @IsNotEmpty()
  @IsString()
  confirmPassword: string;
}
