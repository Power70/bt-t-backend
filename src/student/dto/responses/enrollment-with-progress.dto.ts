import { ApiProperty } from '@nestjs/swagger';
import { Status } from '../../../../generated/prisma';

class EnrollmentCourseInstructorDto {
  @ApiProperty({ example: 'cm123instructor' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;
}

class EnrollmentCourseCategoryDto {
  @ApiProperty({ example: 'cm123category' })
  id: string;

  @ApiProperty({ example: 'Web Development' })
  name: string;
}

class EnrollmentCourseDto {
  @ApiProperty({ example: 'cm123course' })
  id: string;

  @ApiProperty({ example: 'Complete JavaScript Course' })
  title: string;

  @ApiProperty({ example: 'complete-javascript-course' })
  slug: string;

  @ApiProperty({
    example: 'Learn JavaScript from scratch',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({ example: 'https://example.com/image.jpg', nullable: true })
  imageUrl: string | null;

  @ApiProperty({ example: 49.99 })
  price: number;

  @ApiProperty({ example: true })
  isPublished: boolean;

  @ApiProperty({ example: 3600, nullable: true })
  completionTime: number | null;

  @ApiProperty({ type: EnrollmentCourseInstructorDto })
  instructor: EnrollmentCourseInstructorDto;

  @ApiProperty({ type: EnrollmentCourseCategoryDto })
  category: EnrollmentCourseCategoryDto;
}

export class EnrollmentWithProgressDto {
  @ApiProperty({ example: 'cm123enrollment' })
  id: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  enrolledAt: Date;

  @ApiProperty({ example: 'cm123user' })
  userId: string;

  @ApiProperty({ example: 'cm123course' })
  courseId: string;

  @ApiProperty({ enum: Status, example: Status.InProgress })
  status: Status;

  @ApiProperty({ type: EnrollmentCourseDto })
  course: EnrollmentCourseDto;

  @ApiProperty({
    description: 'Progress percentage (0-100)',
    example: 65.5,
  })
  progressPercentage: number;
}
