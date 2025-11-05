import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  _count?: {
    courses?: number;
  };

  constructor(partial: Partial<CategoryEntity>) {
    Object.assign(this, partial);
  }
}
