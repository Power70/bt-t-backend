import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateEnrollmentDto {
  @ApiProperty({
    description: 'Email address of the student',
    example: 'student@email.com',
    type: String,
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'ID of the course to enroll in',
    example: 'clx1234567890abcdef',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  courseId: string;
}
