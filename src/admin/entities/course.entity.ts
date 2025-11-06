import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '../../../generated/prisma';

export class CourseEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  imageUrl?: string;

  @ApiProperty()
  price: number;

  @ApiProperty()
  isPublished: boolean;

  @ApiProperty()
  status: Status;

  @ApiPropertyOptional()
  completionTime?: number;

  @ApiProperty()
  instructorId: string;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<CourseEntity>) {
    Object.assign(this, partial);
  }
}

export class CourseWithRelationsEntity extends CourseEntity {
  @ApiPropertyOptional()
  instructor?: {
    id: string;
    name: string;
    email: string;
  };

  @ApiPropertyOptional()
  category?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional()
  modules?: any[];

  @ApiPropertyOptional()
  _count?: {
    modules?: number;
    enrollments?: number;
  };

  constructor(partial: Partial<CourseWithRelationsEntity>) {
    super(partial);
    Object.assign(this, partial);
  }
}
