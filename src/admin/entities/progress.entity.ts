import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserProgressEntity {
  @ApiProperty()
  id: string;

  @ApiProperty()
  isCompleted: boolean;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  lessonId: string;

  constructor(partial: Partial<UserProgressEntity>) {
    Object.assign(this, partial);
  }
}

export class CourseProgressSummaryEntity {
  @ApiProperty()
  courseId: string;

  @ApiProperty()
  courseTitle: string;

  @ApiProperty()
  totalLessons: number;

  @ApiProperty()
  totalEnrollments: number;

  @ApiProperty({ type: [Object] })
  userProgress: {
    userId: string;
    userName: string;
    userEmail: string;
    completedLessons: number;
    progressPercentage: number;
  }[];

  constructor(partial: Partial<CourseProgressSummaryEntity>) {
    Object.assign(this, partial);
  }
}

export class UserCourseProgressEntity {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  userName: string;

  @ApiProperty()
  userEmail: string;

  @ApiProperty()
  courseId: string;

  @ApiProperty()
  courseTitle: string;

  @ApiProperty()
  totalLessons: number;

  @ApiProperty()
  completedLessons: number;

  @ApiProperty()
  progressPercentage: number;

  @ApiProperty({ type: [Object] })
  lessonProgress: {
    lessonId: string;
    lessonTitle: string;
    lessonType: string;
    moduleTitle: string;
    order: number;
    isCompleted: boolean;
    completedAt?: Date;
  }[];

  constructor(partial: Partial<UserCourseProgressEntity>) {
    Object.assign(this, partial);
  }
}

export class ProgressOverviewEntity {
  @ApiProperty()
  totalCourses: number;

  @ApiProperty()
  totalStudents: number;

  @ApiProperty()
  totalEnrollments: number;

  @ApiProperty({ type: [Object] })
  courseStats: {
    courseId: string;
    courseTitle: string;
    totalLessons: number;
    enrollmentCount: number;
    averageProgress: number;
  }[];

  constructor(partial: Partial<ProgressOverviewEntity>) {
    Object.assign(this, partial);
  }
}
