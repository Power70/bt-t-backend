import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ModuleEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  order: number;

  @ApiProperty()
  courseId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<ModuleEntity>) {
    Object.assign(this, partial);
  }
}

export class ModuleWithRelationsEntity extends ModuleEntity {
  @ApiPropertyOptional()
  course?: {
    id: string;
    title: string;
  };

  @ApiPropertyOptional()
  lessons?: any[];

  @ApiPropertyOptional()
  _count?: {
    lessons?: number;
  };

  constructor(partial: Partial<ModuleWithRelationsEntity>) {
    super(partial);
    Object.assign(this, partial);
  }
}
