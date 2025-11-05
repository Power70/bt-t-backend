import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma';
import { Exclude } from 'class-transformer';

export class UserEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @Exclude()
  password: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  isVerified: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  _count?: {
    taughtCourses?: number;
    enrollments?: number;
  };

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
