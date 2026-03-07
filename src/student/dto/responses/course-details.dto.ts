import { ApiProperty } from '@nestjs/swagger';
import { LessonType } from '../../../../generated/prisma';

class CourseInstructorDto {
  @ApiProperty({ example: 'cm123instructor' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;
}

class CourseCategoryDto {
  @ApiProperty({ example: 'cm123category' })
  id: string;

  @ApiProperty({ example: 'Web Development' })
  name: string;
}

class LessonDetailsDto {
  @ApiProperty({ example: 'cm123lesson' })
  id: string;

  @ApiProperty({ example: 'Introduction to Variables' })
  title: string;

  @ApiProperty({ enum: LessonType, example: LessonType.VIDEO })
  type: LessonType;

  @ApiProperty({ example: 'Lesson content here', nullable: true })
  content: string | null;

  @ApiProperty({
    example: 'https://example.com/video.mp4',
    nullable: true,
  })
  videoUrl: string | null;

  @ApiProperty({ example: 1 })
  order: number;

  @ApiProperty({ example: 600, nullable: true })
  completionTime: number | null;

  @ApiProperty({
    description: 'Whether the student has completed this lesson',
    example: true,
  })
  isCompleted: boolean;
}

class ModuleDetailsDto {
  @ApiProperty({ example: 'cm123module' })
  id: string;

  @ApiProperty({ example: 'Getting Started' })
  title: string;

  @ApiProperty({ example: 1 })
  order: number;

  @ApiProperty({
    description:
      'Total time required to complete all lessons in this module (seconds)',
    example: 3600,
  })
  totalModuleTime: number;

  @ApiProperty({ type: [LessonDetailsDto] })
  lessons: LessonDetailsDto[];
}

export class CourseDetailsDto {
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

  @ApiProperty({ example: 7200, nullable: true })
  completionTime: number | null;

  @ApiProperty({ type: CourseInstructorDto })
  instructor: CourseInstructorDto;

  @ApiProperty({ type: CourseCategoryDto })
  category: CourseCategoryDto;

  @ApiProperty({ type: [ModuleDetailsDto] })
  modules: ModuleDetailsDto[];

  @ApiProperty({
    description: 'Total number of lessons in the course',
    example: 20,
  })
  totalLessons: number;

  @ApiProperty({
    description: 'Number of lessons the student has completed',
    example: 15,
  })
  completedLessons: number;
}
