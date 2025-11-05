import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LessonType } from '../../../generated/prisma';

export class LessonEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: LessonType })
  type: LessonType;

  @ApiPropertyOptional()
  content?: string;

  @ApiPropertyOptional()
  videoUrl?: string;

  @ApiProperty()
  order: number;

  @ApiPropertyOptional()
  completionTime?: number;

  @ApiProperty()
  moduleId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<LessonEntity>) {
    Object.assign(this, partial);
  }
}

export class LessonWithRelationsEntity extends LessonEntity {
  @ApiPropertyOptional()
  module?: {
    id: string;
    title: string;
    courseId: string;
  };

  @ApiPropertyOptional()
  _count?: {
    userProgress?: number;
  };

  constructor(partial: Partial<LessonWithRelationsEntity>) {
    super(partial);
    Object.assign(this, partial);
  }
}
