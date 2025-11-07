import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import * as bcrypt from 'bcrypt';
import { generateSlug } from './utils/slug.util';
import { UserRole, LessonType } from '../../generated/prisma';
import { PaginatedResult } from './dto/common/pagination.dto';
import { CreateCourseDto } from './dto/courses/create-course.dto';
import { UpdateCourseDto } from './dto/courses/update-course.dto';
import { CourseFilterDto } from './dto/courses/course-filter.dto';
import { CreateModuleDto } from './dto/modules/create-module.dto';
import { UpdateModuleDto } from './dto/modules/update-module.dto';
import { ReorderModulesDto } from './dto/modules/reorder-modules.dto';
import { CreateLessonDto } from './dto/lessons/create-lesson.dto';
import { UpdateLessonDto } from './dto/lessons/update-lesson.dto';
import { ReorderLessonsDto } from './dto/lessons/reorder-lessons.dto';
import { CreateCategoryDto } from './dto/categories/create-category.dto';
import { UpdateCategoryDto } from './dto/categories/update-category.dto';
import { CreateAdminDto } from './dto/users/create-admin.dto';
import { CreateInstructorDto } from './dto/users/create-instructor.dto';
import { UpdateUserDto } from './dto/users/update-user.dto';
import { UserFilterDto } from './dto/users/user-filter.dto';
import { CreateModuleQuizDto } from './dto/quizzes/create-module-quiz.dto';
import { CreateFinalAssessmentDto } from './dto/quizzes/create-final-assessment.dto';
import { UpdateQuestionDto } from './dto/quizzes/update-question.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
  ) {}

  // ============================================
  // COURSE MANAGEMENT
  // ============================================

  /**
   * Calculate total completion time for a course (sum of all lesson completion times)
   * @param courseId Course ID
   * @returns Total completion time in seconds
   */
  private async calculateCourseCompletionTime(
    courseId: string,
  ): Promise<number> {
    const lessons = await this.prisma.lesson.findMany({
      where: {
        module: {
          courseId,
        },
      },
      select: {
        completionTime: true,
      },
    });

    return lessons.reduce(
      (total, lesson) => total + (lesson.completionTime || 0),
      0,
    );
  }

  /**
   * Create a new course with auto-generated slug
   */
  async createCourse(createCourseDto: CreateCourseDto) {
    const { instructorEmail, categoryName, title, ...data } = createCourseDto;

    // Verify instructor exists and has correct role
    const instructor = await this.prisma.user.findUnique({
      where: { email: instructorEmail },
    });

    if (!instructor) {
      throw new NotFoundException(
        `Instructor with email '${instructorEmail}' not found`,
      );
    }

    if (instructor.role !== UserRole.INSTRUCTOR) {
      throw new BadRequestException(
        `User '${instructorEmail}' is not an instructor`,
      );
    }

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { name: categoryName },
    });

    if (!category) {
      throw new NotFoundException(`Category '${categoryName}' not found`);
    }

    // Generate unique slug
    let slug = generateSlug(title);
    let counter = 0;

    while (await this.prisma.course.findUnique({ where: { slug } })) {
      counter++;
      slug = `${generateSlug(title)}-${counter}`;
    }

    const course = await this.prisma.course.create({
      data: {
        ...data,
        title,
        slug,
        instructorId: instructor.id,
        categoryId: category.id,
        isPublished: false,
      },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: true,
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
    });

    return course;
  }

  /**
   * Get all courses with filtering and pagination
   */
  async getCourses(filterDto: CourseFilterDto): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 10,
      search,
      title,
      instructor,
      category,
      isPublished,
    } = filterDto;

    const skip = (page - 1) * limit;

    const where: any = {};

    // Universal search across multiple fields
    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          instructor: {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                email: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            ],
          },
        },
        {
          category: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    // Specific field filters
    if (title) {
      where.title = {
        contains: title,
        mode: 'insensitive',
      };
    }

    if (instructor) {
      where.instructor = {
        OR: [
          {
            name: {
              contains: instructor,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: instructor,
              mode: 'insensitive',
            },
          },
        ],
      };
    }

    if (category) {
      where.category = {
        name: {
          contains: category,
          mode: 'insensitive',
        },
      };
    }

    if (typeof isPublished === 'boolean') {
      where.isPublished = isPublished;
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          category: true,
          _count: {
            select: {
              modules: true,
              enrollments: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: courses,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get a single course with all modules and lessons
   */
  async getCourseById(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: true,
        modules: {
          include: {
            lessons: {
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            enrollments: true,
            attachments: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Calculate total completion time from all lessons
    const totalCompletionTime = await this.calculateCourseCompletionTime(id);

    // Update the course completion time in database
    await this.prisma.course.update({
      where: { id },
      data: { completionTime: totalCompletionTime },
    });

    return {
      ...course,
      completionTime: totalCompletionTime,
    };
  }

  /**
   * Update a course (regenerate slug if title changes)
   */
  async updateCourse(id: string, updateCourseDto: UpdateCourseDto) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const { instructorEmail, categoryName, title, ...data } = updateCourseDto;

    let instructorId: string | undefined;
    let categoryId: string | undefined;

    // Verify instructor if provided
    if (instructorEmail) {
      const instructor = await this.prisma.user.findUnique({
        where: { email: instructorEmail },
      });

      if (!instructor) {
        throw new NotFoundException(
          `Instructor with email '${instructorEmail}' not found`,
        );
      }

      if (instructor.role !== UserRole.INSTRUCTOR) {
        throw new BadRequestException(
          `User '${instructorEmail}' is not an instructor`,
        );
      }

      instructorId = instructor.id;
    }

    // Verify category if provided
    if (categoryName) {
      const category = await this.prisma.category.findUnique({
        where: { name: categoryName },
      });

      if (!category) {
        throw new NotFoundException(`Category '${categoryName}' not found`);
      }

      categoryId = category.id;
    }

    // Regenerate slug if title changes
    let slug = course.slug;
    if (title && title !== course.title) {
      slug = generateSlug(title);
      let counter = 0;

      while (
        await this.prisma.course.findFirst({
          where: { slug, id: { not: id } },
        })
      ) {
        counter++;
        slug = `${generateSlug(title)}-${counter}`;
      }
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: {
        ...data,
        ...(title && { title }),
        ...(title && { slug }),
        ...(instructorId && { instructorId }),
        ...(categoryId && { categoryId }),
      },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: true,
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
    });

    return updatedCourse;
  }

  /**
   * Delete a course (cascade to modules, lessons, enrollments)
   */
  async deleteCourse(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.prisma.course.delete({
      where: { id },
    });

    return { message: 'Course deleted successfully' };
  }

  /**
   * Toggle the publish status of a course
   */
  async toggleCoursePublish(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data: { isPublished: !course.isPublished },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: true,
      },
    });

    return updatedCourse;
  }

  // ============================================
  // MODULE MANAGEMENT
  // ============================================

  /**
   * Create a new module for a course (auto-calculate order)
   */
  async createModule(courseId: string, createModuleDto: CreateModuleDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    let order = createModuleDto.order;

    // Auto-calculate order if not provided
    if (order === undefined) {
      const lastModule = await this.prisma.module.findFirst({
        where: { courseId },
        orderBy: { order: 'desc' },
      });

      order = lastModule ? lastModule.order + 1 : 0;
    }

    const module = await this.prisma.module.create({
      data: {
        title: createModuleDto.title,
        order,
        courseId,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            lessons: true,
          },
        },
      },
    });

    return module;
  }

  /**
   * Get all modules for a course
   */
  async getModulesByCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const modules = await this.prisma.module.findMany({
      where: { courseId },
      include: {
        _count: {
          select: {
            lessons: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    return modules;
  }

  /**
   * Get a single module by ID
   */
  async getModuleById(id: string) {
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        lessons: {
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            lessons: true,
          },
        },
      },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    return module;
  }

  /**
   * Update a module
   */
  async updateModule(id: string, updateModuleDto: UpdateModuleDto) {
    const module = await this.prisma.module.findUnique({
      where: { id },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    const updatedModule = await this.prisma.module.update({
      where: { id },
      data: updateModuleDto,
      include: {
        course: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            lessons: true,
          },
        },
      },
    });

    return updatedModule;
  }

  /**
   * Delete a module
   */
  async deleteModule(id: string) {
    const module = await this.prisma.module.findUnique({
      where: { id },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    await this.prisma.module.delete({
      where: { id },
    });

    return { message: 'Module deleted successfully' };
  }

  /**
   * Reorder modules within a course (transaction)
   */
  async reorderModules(courseId: string, reorderDto: ReorderModulesDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Verify all modules belong to this course
    const moduleIds = reorderDto.modules.map((m) => m.id);
    const modules = await this.prisma.module.findMany({
      where: {
        id: { in: moduleIds },
        courseId,
      },
    });

    if (modules.length !== moduleIds.length) {
      throw new BadRequestException(
        'Some modules do not belong to this course',
      );
    }

    // Update in transaction
    await this.prisma.$transaction(
      reorderDto.modules.map((item) =>
        this.prisma.module.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );

    return { message: 'Modules reordered successfully' };
  }

  // ============================================
  // LESSON MANAGEMENT
  // ============================================

  /**
   * Create a new lesson for a module (auto-calculate order)
   */
  async createLesson(moduleId: string, createLessonDto: CreateLessonDto) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        course: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    const { type, content, videoUrl, ...data } = createLessonDto;

    // Validate content based on lesson type
    if (type === LessonType.VIDEO && !videoUrl) {
      throw new BadRequestException('Video URL is required for VIDEO lessons');
    }

    if ((type === LessonType.TEXT || type === LessonType.QUIZ) && !content) {
      throw new BadRequestException(`Content is required for ${type} lessons`);
    }

    let order = createLessonDto.order;

    // Auto-calculate order if not provided
    if (order === undefined) {
      const lastLesson = await this.prisma.lesson.findFirst({
        where: { moduleId },
        orderBy: { order: 'desc' },
      });

      order = lastLesson ? lastLesson.order + 1 : 0;
    }

    // Set content/videoUrl based on type
    const lessonData: any = {
      ...data,
      type,
      order,
      moduleId,
      content: type === LessonType.VIDEO ? null : content,
      videoUrl: type === LessonType.VIDEO ? videoUrl : null,
    };

    const lesson = await this.prisma.lesson.create({
      data: lessonData,
      include: {
        module: {
          select: {
            id: true,
            title: true,
            courseId: true,
          },
        },
      },
    });

    // Recalculate and update course completion time
    const totalCompletionTime = await this.calculateCourseCompletionTime(
      module.course.id,
    );
    await this.prisma.course.update({
      where: { id: module.course.id },
      data: { completionTime: totalCompletionTime },
    });

    return lesson;
  }

  /**
   * Get all lessons for a module
   */
  async getLessonsByModule(moduleId: string) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    const lessons = await this.prisma.lesson.findMany({
      where: { moduleId },
      include: {
        _count: {
          select: {
            userProgress: true,
          },
        },
      },
      orderBy: {
        order: 'asc',
      },
    });

    return lessons;
  }

  /**
   * Get a single lesson by ID
   */
  async getLessonById(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          select: {
            id: true,
            title: true,
            courseId: true,
          },
        },
        _count: {
          select: {
            userProgress: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return lesson;
  }

  /**
   * Update a lesson (handle type changes)
   */
  async updateLesson(id: string, updateLessonDto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          select: {
            courseId: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const { type, content, videoUrl, ...data } = updateLessonDto;

    const updateData: any = { ...data };

    // Handle type changes
    if (type) {
      updateData.type = type;

      if (type === LessonType.VIDEO) {
        updateData.content = null;
        if (videoUrl) updateData.videoUrl = videoUrl;
      } else {
        updateData.videoUrl = null;
        if (content) updateData.content = content;
      }
    } else {
      // No type change, update content/videoUrl if provided
      if (content !== undefined) updateData.content = content;
      if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
    }

    const updatedLesson = await this.prisma.lesson.update({
      where: { id },
      data: updateData,
      include: {
        module: {
          select: {
            id: true,
            title: true,
            courseId: true,
          },
        },
      },
    });

    // Recalculate and update course completion time if completionTime changed
    if (updateLessonDto.completionTime !== undefined) {
      const totalCompletionTime = await this.calculateCourseCompletionTime(
        lesson.module.courseId,
      );
      await this.prisma.course.update({
        where: { id: lesson.module.courseId },
        data: { completionTime: totalCompletionTime },
      });
    }

    return updatedLesson;
  }

  /**
   * Delete a lesson
   */
  async deleteLesson(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          select: {
            courseId: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const courseId = lesson.module.courseId;

    await this.prisma.lesson.delete({
      where: { id },
    });

    // Recalculate and update course completion time
    const totalCompletionTime =
      await this.calculateCourseCompletionTime(courseId);
    await this.prisma.course.update({
      where: { id: courseId },
      data: { completionTime: totalCompletionTime },
    });

    return { message: 'Lesson deleted successfully' };
  }

  /**
   * Reorder lessons within a module (transaction)
   */
  async reorderLessons(moduleId: string, reorderDto: ReorderLessonsDto) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    // Verify all lessons belong to this module
    const lessonIds = reorderDto.lessons.map((l) => l.id);
    const lessons = await this.prisma.lesson.findMany({
      where: {
        id: { in: lessonIds },
        moduleId,
      },
    });

    if (lessons.length !== lessonIds.length) {
      throw new BadRequestException(
        'Some lessons do not belong to this module',
      );
    }

    // Update in transaction
    await this.prisma.$transaction(
      reorderDto.lessons.map((item) =>
        this.prisma.lesson.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );

    return { message: 'Lessons reordered successfully' };
  }

  // ============================================
  // PROGRESS MONITORING
  // ============================================

  /**
   * Get aggregate progress summary for a course
   */
  async getCourseProgressSummary(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Calculate total lessons
    const totalLessons = course.modules.reduce(
      (sum, module) => sum + module.lessons.length,
      0,
    );

    // Get all enrollments with status
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Get all lesson IDs for this course
    const lessonIds = course.modules.flatMap((module) =>
      module.lessons.map((lesson) => lesson.id),
    );

    // Calculate progress for each enrolled user
    const userProgress = await Promise.all(
      enrollments.map(async (enrollment) => {
        const completedCount = await this.prisma.userProgress.count({
          where: {
            userId: enrollment.userId,
            lessonId: { in: lessonIds },
            isCompleted: true,
          },
        });

        const progressPercentage =
          totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

        return {
          userId: enrollment.user.id,
          userName: enrollment.user.name,
          userEmail: enrollment.user.email,
          completedLessons: completedCount,
          progressPercentage: Math.round(progressPercentage * 100) / 100,
          status: enrollment.status, // Include enrollment status
        };
      }),
    );

    return {
      courseId: course.id,
      courseTitle: course.title,
      totalLessons,
      totalEnrollments: enrollments.length,
      userProgress,
    };
  }

  /**
   * Get detailed progress for a specific user in a course
   */
  async getUserCourseProgress(userId: string, courseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: {
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if user is enrolled
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw new BadRequestException('User is not enrolled in this course');
    }

    // Get all lesson IDs
    const lessonIds = course.modules.flatMap((module) =>
      module.lessons.map((lesson) => lesson.id),
    );

    // Get user progress for all lessons
    const progressRecords = await this.prisma.userProgress.findMany({
      where: {
        userId,
        lessonId: { in: lessonIds },
      },
    });

    const progressMap = new Map(progressRecords.map((p) => [p.lessonId, p]));

    // Build lesson progress array
    const lessonProgress = course.modules.flatMap((module) =>
      module.lessons.map((lesson) => {
        const progress = progressMap.get(lesson.id);
        return {
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          lessonType: lesson.type,
          moduleTitle: module.title,
          order: lesson.order,
          isCompleted: progress?.isCompleted || false,
          completedAt: progress?.completedAt || null,
        };
      }),
    );

    const totalLessons = lessonIds.length;
    const completedLessons = lessonProgress.filter((l) => l.isCompleted).length;
    const progressPercentage =
      totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

    return {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      courseId: course.id,
      courseTitle: course.title,
      enrollmentStatus: enrollment.status, // Include enrollment status
      totalLessons,
      completedLessons,
      progressPercentage: Math.round(progressPercentage * 100) / 100,
      lessonProgress,
    };
  }

  /**
   * Get overview of progress across all courses
   */
  async getProgressOverview() {
    const [totalCourses, totalStudents, totalEnrollments] = await Promise.all([
      this.prisma.course.count(),
      this.prisma.user.count({ where: { role: UserRole.STUDENT } }),
      this.prisma.enrollment.count(),
    ]);

    const courses = await this.prisma.course.findMany({
      include: {
        modules: {
          include: {
            lessons: true,
          },
        },
        enrollments: {
          select: {
            status: true,
          },
        },
      },
    });

    const courseStats = courses.map((course) => {
      if (!course.modules || !course.enrollments) {
        return {
          courseId: course.id,
          courseTitle: course.title,
          totalLessons: 0,
          enrollmentCount: 0,
          statusBreakdown: {
            notStarted: 0,
            inProgress: 0,
            completed: 0,
          },
        };
      }

      const modules = course.modules;
      const enrollments = course.enrollments;

      const totalLessons = modules.reduce(
        (sum: number, module: any) => sum + (module.lessons?.length || 0),
        0,
      );

      const enrollmentCount = enrollments.length;

      // Count enrollments by status
      const statusCounts = enrollments.reduce(
        (acc: Record<string, number>, enrollment: any) => {
          acc[enrollment.status] = (acc[enrollment.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        courseId: course.id,
        courseTitle: course.title,
        totalLessons,
        enrollmentCount,
        statusBreakdown: {
          notStarted: statusCounts['NotStarted'] || 0,
          inProgress: statusCounts['InProgress'] || 0,
          completed: statusCounts['Completed'] || 0,
        },
      };
    });

    return {
      totalCourses,
      totalStudents,
      totalEnrollments,
      courseStats,
    };
  }

  // ============================================
  // CATEGORY MANAGEMENT
  // ============================================

  /**
   * Create a new category
   */
  async createCategory(createCategoryDto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { name: createCategoryDto.name },
    });

    if (existing) {
      throw new ConflictException('Category with this name already exists');
    }

    const category = await this.prisma.category.create({
      data: createCategoryDto,
      include: {
        _count: {
          select: {
            courses: true,
          },
        },
      },
    });

    return category;
  }

  /**
   * Get all categories
   */
  async getCategories() {
    const categories = await this.prisma.category.findMany({
      include: {
        _count: {
          select: {
            courses: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return categories;
  }

  /**
   * Update a category
   */
  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (updateCategoryDto.name) {
      const existing = await this.prisma.category.findFirst({
        where: {
          name: updateCategoryDto.name,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
      include: {
        _count: {
          select: {
            courses: true,
          },
        },
      },
    });

    return updatedCategory;
  }

  /**
   * Delete a category (only if no courses)
   */
  async deleteCategory(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            courses: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category._count.courses > 0) {
      throw new BadRequestException(
        'Cannot delete category with associated courses',
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return { message: 'Category deleted successfully' };
  }

  // ============================================
  // USER MANAGEMENT
  // ============================================

  /**
   * Create a new admin user
   */
  async createAdmin(createAdminDto: CreateAdminDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: createAdminDto.email },
    });

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);

    const admin = await this.prisma.user.create({
      data: {
        email: createAdminDto.email,
        name: createAdminDto.name,
        password: hashedPassword,
        role: UserRole.ADMIN,
        isVerified: false,
      },
    });

    // Generate and store OTP using AuthService
    const { token: otpCode } = await this.authService.createAndStoreOtpForUser(
      admin.id,
    );

    // Send welcome email with OTP
    await this.mailService.sendWelcomeEmail(createAdminDto.email, otpCode);

    return {
      message: 'Admin account created successfully',
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isVerified: admin.isVerified,
      },
    };
  }

  /**
   * Create a new instructor user
   */
  async createInstructor(createInstructorDto: CreateInstructorDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: createInstructorDto.email },
    });

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createInstructorDto.password, 10);

    const instructor = await this.prisma.user.create({
      data: {
        email: createInstructorDto.email,
        name: createInstructorDto.name,
        password: hashedPassword,
        role: UserRole.INSTRUCTOR,
        isVerified: false,
      },
    });

    // Generate and store OTP using AuthService
    const { token: otpCode } = await this.authService.createAndStoreOtpForUser(
      instructor.id,
    );

    // Send welcome email with OTP
    await this.mailService.sendWelcomeEmail(createInstructorDto.email, otpCode);

    return {
      message: 'Instructor account created successfully',
      user: {
        id: instructor.id,
        email: instructor.email,
        name: instructor.name,
        role: instructor.role,
        isVerified: instructor.isVerified,
      },
    };
  }

  /**
   * Get all users with filtering and pagination
   */
  async getUsers(filterDto: UserFilterDto): Promise<PaginatedResult<any>> {
    const {
      page = 1,
      limit = 10,
      search,
      name,
      email,
      role,
      isVerified,
    } = filterDto;

    const skip = (page - 1) * limit;

    const where: any = {};

    // Universal search
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Specific field filters
    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      };
    }

    if (email) {
      where.email = {
        contains: email,
        mode: 'insensitive',
      };
    }

    if (role) {
      where.role = role;
    }

    if (typeof isVerified === 'boolean') {
      where.isVerified = isVerified;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              taughtCourses: true,
              enrollments: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get a single user by ID
   */
  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            taughtCourses: true,
            enrollments: true,
            progress: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update a user
   */
  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, email, ...data } = updateUserDto;

    // Check email uniqueness if changed
    if (email && email !== user.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existing) {
        throw new ConflictException('Email is already in use');
      }
    }

    const updateData: any = { ...data };

    if (email) {
      updateData.email = email;
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Delete a user
   */
  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }

  // ============================================
  // QUIZ MANAGEMENT (Module & Final Assessment)
  // ============================================

  /**
   * Create or update quiz for module or course
   * Uses upsert to preserve student submissions
   */
  async createQuiz(
    parentType: 'module' | 'course',
    parentId: string,
    quizDto: CreateModuleQuizDto | CreateFinalAssessmentDto,
  ) {
    // Verify parent exists
    const parent =
      parentType === 'module'
        ? await this.prisma.module.findUnique({
            where: { id: parentId },
            include: {
              quiz: true,
              course: { select: { id: true, title: true } },
            },
          })
        : await this.prisma.course.findUnique({
            where: { id: parentId },
            include: { finalAssessment: true },
          });

    if (!parent) {
      throw new NotFoundException(
        `${parentType === 'module' ? 'Module' : 'Course'} not found`,
      );
    }

    // Get existing quiz
    const existingQuiz =
      parentType === 'module'
        ? (parent as any).quiz
        : (parent as any).finalAssessment;

    const result = await this.prisma.$transaction(async (tx) => {
      let quiz;

      if (existingQuiz) {
        // Quiz exists - just update metadata if needed
        quiz = existingQuiz;
      } else {
        // Create new quiz
        const quizData: any = {};
        if (parentType === 'module') {
          quizData.moduleId = parentId;
        }

        quiz = await tx.quiz.create({
          data: quizData,
        });

        // Link to course if final assessment
        if (parentType === 'course') {
          await tx.course.update({
            where: { id: parentId },
            data: { finalAssessmentId: quiz.id },
          });
        }
      }

      // Handle questions if provided
      if (quizDto.questions && quizDto.questions.length > 0) {
        for (const questionDto of quizDto.questions) {
          // Create question
          const question = await tx.question.create({
            data: {
              text: questionDto.text,
              quizId: quiz.id,
            },
          });

          // Create options
          await tx.option.createMany({
            data: questionDto.options.map((opt) => ({
              text: opt.text,
              isCorrect: opt.isCorrect,
              questionId: question.id,
            })),
          });
        }
      }

      // Return complete quiz
      return await tx.quiz.findUnique({
        where: { id: quiz.id },
        include: {
          questions: { include: { options: true } },
          module: {
            select: {
              id: true,
              title: true,
              course: { select: { id: true, title: true } },
            },
          },
          course: { select: { id: true, title: true } },
        },
      });
    });

    return {
      message: `${parentType === 'module' ? 'Module quiz' : 'Final assessment'} ${existingQuiz ? 'updated' : 'created'} successfully`,
      quiz: result,
    };
  }

  /**
   * Get quiz by module or course ID
   */
  async getQuiz(parentType: 'module' | 'course', parentId: string) {
    if (parentType === 'module') {
      const module = await this.prisma.module.findUnique({
        where: { id: parentId },
        include: {
          quiz: {
            include: {
              questions: { include: { options: true } },
            },
          },
          course: { select: { id: true, title: true } },
        },
      });

      if (!module) {
        throw new NotFoundException('Module not found');
      }

      if (!module.quiz) {
        throw new NotFoundException('No quiz found for this module');
      }

      return {
        ...module.quiz,
        module: { id: module.id, title: module.title },
        course: module.course,
      };
    } else {
      const course = await this.prisma.course.findUnique({
        where: { id: parentId },
        include: {
          finalAssessment: {
            include: {
              questions: { include: { options: true } },
            },
          },
        },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      if (!course.finalAssessment) {
        throw new NotFoundException(
          'No final assessment found for this course',
        );
      }

      return {
        ...course.finalAssessment,
        course: { id: course.id, title: course.title },
      };
    }
  }

  /**
   * Update question text only (safe - preserves all student data)
   * Options cannot be updated once students have submitted answers
   */
  async updateQuestionText(questionId: string, text: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          include: {
            submissions: { select: { id: true } },
          },
        },
        options: true,
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Check if quiz has any submissions
    if (question.quiz.submissions.length > 0) {
      throw new BadRequestException(
        `Cannot update question. Quiz has ${question.quiz.submissions.length} student submissions. ` +
          'Updating questions would invalidate existing student answers and cause data loss. ' +
          'Please create a new quiz version instead.',
      );
    }

    const updatedQuestion = await this.prisma.question.update({
      where: { id: questionId },
      data: { text },
      include: { options: true },
    });

    return {
      message: 'Question text updated successfully',
      question: updatedQuestion,
    };
  }

  /**
   * Update question options (only allowed if no student submissions exist)
   * This prevents data loss by rejecting updates to active quizzes
   */
  async updateQuestionOptions(
    questionId: string,
    updateQuestionDto: UpdateQuestionDto,
  ) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          include: {
            submissions: { select: { id: true } },
          },
        },
        options: true,
        userAnswers: { select: { id: true } },
      },
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Critical: Check for any student data
    if (
      question.quiz.submissions.length > 0 ||
      question.userAnswers.length > 0
    ) {
      throw new BadRequestException(
        `Cannot update question options. This question has ${question.quiz.submissions.length} quiz submissions ` +
          `and ${question.userAnswers.length} student answers. ` +
          'Modifying options would destroy student submission data. ' +
          'Options are immutable once students have submitted answers. ' +
          'To make changes, please create a new quiz version.',
      );
    }

    // Safe to update if no submissions exist
    await this.prisma.$transaction(async (tx) => {
      // Update question text if provided
      if (updateQuestionDto.text) {
        await tx.question.update({
          where: { id: questionId },
          data: { text: updateQuestionDto.text },
        });
      }

      // Update options - only safe because we verified no submissions exist
      if (updateQuestionDto.options) {
        await tx.option.deleteMany({ where: { questionId } });
        await tx.option.createMany({
          data: updateQuestionDto.options.map((opt) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
            questionId,
          })),
        });
      }
    });

    return await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });
  }

  /**
   * Delete quiz - ONLY allowed if no student data exists
   * This is a hard delete, not a soft delete, because we never delete quizzes with student data
   */
  async deleteQuiz(parentType: 'module' | 'course', quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        module: true,
        course: true,
        submissions: { select: { id: true } },
        questions: {
          include: {
            userAnswers: { select: { id: true } },
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Verify quiz type matches
    if (parentType === 'module' && !quiz.module) {
      throw new BadRequestException('This is not a module quiz');
    }
    if (parentType === 'course' && !quiz.course) {
      throw new BadRequestException('This is not a final assessment');
    }

    // Count all student data
    const totalSubmissions = quiz.submissions.length;
    const totalAnswers = quiz.questions.reduce(
      (sum, q) => sum + q.userAnswers.length,
      0,
    );

    // Critical: Prevent deletion if ANY student data exists
    if (totalSubmissions > 0 || totalAnswers > 0) {
      throw new BadRequestException(
        `Cannot delete quiz. This quiz has:\n` +
          `- ${totalSubmissions} student submission(s)\n` +
          `- ${totalAnswers} student answer(s)\n\n` +
          'Deleting this quiz would permanently destroy student data and invalidate their progress records. ' +
          'Quizzes with student submissions cannot be deleted. ' +
          'If you need to make changes, create a new quiz version instead.',
      );
    }

    // Only safe to delete if no student data exists
    await this.prisma.$transaction(async (tx) => {
      // Unlink from parent
      if (parentType === 'course' && quiz.course) {
        await tx.course.update({
          where: { id: quiz.course.id },
          data: { finalAssessmentId: null },
        });
      }

      // Delete quiz (cascade will handle questions and options)
      await tx.quiz.delete({ where: { id: quizId } });
    });

    return {
      message: `${parentType === 'module' ? 'Module quiz' : 'Final assessment'} deleted successfully. No student data was affected.`,
    };
  }
}
