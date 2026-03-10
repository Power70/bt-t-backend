import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateSlug } from '../admin/utils/slug.util';
import { UserRole, LessonType } from '../../generated/prisma';
import { PaginatedResult } from '../admin/dto/common/pagination.dto';
import { CreateInstructorCourseDto } from './dto/create-course.dto';
import { UpdateInstructorCourseDto } from './dto/update-course.dto';
import { InstructorCourseFilterDto } from './dto/course-filter.dto';
import { CreateInstructorModuleDto } from './dto/create-module.dto';
import { UpdateInstructorModuleDto } from './dto/update-module.dto';
import {
  ReorderInstructorModulesDto,
  ReorderInstructorLessonsDto,
} from './dto/reorder.dto';
import { CreateInstructorLessonDto } from './dto/create-lesson.dto';
import { UpdateInstructorLessonDto } from './dto/update-lesson.dto';
import {
  CreateInstructorQuizDto,
  UpdateInstructorQuestionDto,
} from './dto/quiz.dto';
import { InstructorStudentFilterDto } from './dto/student-filter.dto';
import { UpdateInstructorProfileDto } from './dto/update-profile.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class InstructorService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // OWNERSHIP HELPERS
  // ============================================

  private async ensureCourseOwnership(instructorId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Course not found');
    if (course.instructorId !== instructorId)
      throw new ForbiddenException('You do not own this course');
    return course;
  }

  private async ensureModuleOwnership(instructorId: string, moduleId: string) {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: { select: { instructorId: true, id: true } } },
    });
    if (!module) throw new NotFoundException('Module not found');
    if (module.course.instructorId !== instructorId)
      throw new ForbiddenException('You do not own this module');
    return module;
  }

  private async ensureLessonOwnership(instructorId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: { course: { select: { instructorId: true, id: true } } },
        },
      },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.module.course.instructorId !== instructorId)
      throw new ForbiddenException('You do not own this lesson');
    return lesson;
  }

  private async ensureQuizOwnership(instructorId: string, quizId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        module: {
          include: { course: { select: { instructorId: true, id: true } } },
        },
        course: { select: { instructorId: true, id: true } },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    const ownerId =
      quiz.module?.course.instructorId ?? quiz.course?.instructorId;
    if (ownerId !== instructorId)
      throw new ForbiddenException('You do not own this quiz');
    return quiz;
  }

  private async ensureQuestionOwnership(
    instructorId: string,
    questionId: string,
  ) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          include: {
            module: {
              include: {
                course: { select: { instructorId: true, id: true } },
              },
            },
            course: { select: { instructorId: true, id: true } },
          },
        },
      },
    });
    if (!question) throw new NotFoundException('Question not found');
    const ownerId =
      question.quiz.module?.course.instructorId ??
      question.quiz.course?.instructorId;
    if (ownerId !== instructorId)
      throw new ForbiddenException('You do not own this question');
    return question;
  }

  private async calculateCourseCompletionTime(courseId: string): Promise<number> {
    const lessons = await this.prisma.lesson.findMany({
      where: { module: { courseId } },
      select: { completionTime: true },
    });
    return lessons.reduce(
      (total, lesson) => total + (lesson.completionTime || 0),
      0,
    );
  }

  // ============================================
  // DASHBOARD
  // ============================================

  async getDashboardOverview(instructorId: string) {
    const courses = await this.prisma.course.findMany({
      where: { instructorId },
      include: {
        enrollments: { select: { id: true, status: true } },
        modules: {
          include: { lessons: { select: { id: true } } },
        },
      },
    });

    const totalCourses = courses.length;
    const publishedCourses = courses.filter((c) => c.isPublished).length;
    const draftCourses = totalCourses - publishedCourses;

    const allEnrollments = courses.flatMap((c) => c.enrollments);
    const totalStudents = new Set(allEnrollments.map((e) => e.id)).size;
    const totalEnrollments = allEnrollments.length;

    const completedEnrollments = allEnrollments.filter(
      (e) => e.status === 'Completed',
    ).length;
    const completionRate =
      totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollments) * 100)
        : 0;

    const totalRevenue = await this.prisma.enrollment
      .findMany({
        where: { course: { instructorId } },
        include: { course: { select: { price: true } } },
      })
      .then((enrollments) =>
        enrollments.reduce((sum, e) => sum + e.course.price, 0),
      );

    const totalLessons = courses.reduce(
      (sum, c) =>
        sum + c.modules.reduce((ms, m) => ms + m.lessons.length, 0),
      0,
    );

    return {
      totalCourses,
      publishedCourses,
      draftCourses,
      totalStudents,
      totalEnrollments,
      completionRate,
      totalRevenue,
      totalLessons,
    };
  }

  // ============================================
  // PROFILE
  // ============================================

  async getProfile(instructorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: instructorId },
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

    if (!user) throw new NotFoundException('User not found');

    const courses = await this.prisma.course.findMany({
      where: { instructorId },
      include: {
        modules: { include: { lessons: { select: { completionTime: true } } } },
        enrollments: { select: { id: true } },
      },
    });

    const totalCourses = courses.length;
    const publishedCourses = courses.filter((c) => c.isPublished).length;
    const totalStudents = courses.reduce(
      (sum, c) => sum + c.enrollments.length,
      0,
    );
    const totalHoursOfContent = Math.round(
      courses.reduce(
        (sum, c) =>
          sum +
          c.modules.reduce(
            (ms, m) =>
              ms +
              m.lessons.reduce((ls, l) => ls + (l.completionTime || 0), 0),
            0,
          ),
        0,
      ) / 60,
    );

    return {
      ...user,
      stats: {
        totalCourses,
        publishedCourses,
        totalStudents,
        totalHoursOfContent,
      },
    };
  }

  async updateProfile(instructorId: string, dto: UpdateInstructorProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: instructorId },
    });
    if (!user) throw new NotFoundException('User not found');

    const updateData: Record<string, unknown> = {};

    if (dto.name) {
      updateData.name = dto.name;
    }

    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return { message: 'No changes to update' };
    }

    await this.prisma.user.update({
      where: { id: instructorId },
      data: updateData,
    });

    return { message: 'Profile updated successfully' };
  }

  // ============================================
  // COURSE MANAGEMENT
  // ============================================

  async createCourse(
    instructorId: string,
    dto: CreateInstructorCourseDto,
  ) {
    const { categoryName, title, ...data } = dto;

    const category = await this.prisma.category.findUnique({
      where: { name: categoryName },
    });
    if (!category)
      throw new NotFoundException(`Category '${categoryName}' not found`);

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
        instructorId,
        categoryId: category.id,
        isPublished: false,
      },
      include: {
        instructor: { select: { id: true, name: true, email: true } },
        category: true,
        _count: { select: { modules: true, enrollments: true } },
      },
    });

    return course;
  }

  async getMyCourses(
    instructorId: string,
    filterDto: InstructorCourseFilterDto,
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 10, search, categoryId, isPublished } = filterDto;
    const skip = (page - 1) * limit;

    const where: any = { instructorId };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (typeof isPublished === 'boolean') where.isPublished = isPublished;

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        include: {
          instructor: { select: { id: true, name: true, email: true } },
          category: true,
          _count: { select: { modules: true, enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
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

  async getCourseById(instructorId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: { select: { id: true, name: true, email: true } },
        category: true,
        modules: {
          include: {
            lessons: { orderBy: { order: 'asc' } },
            quiz: { select: { id: true, _count: { select: { questions: true } } } },
          },
          orderBy: { order: 'asc' },
        },
        _count: { select: { enrollments: true, attachments: true } },
      },
    });

    if (!course) throw new NotFoundException('Course not found');
    if (course.instructorId !== instructorId)
      throw new ForbiddenException('You do not own this course');

    const totalCompletionTime = await this.calculateCourseCompletionTime(
      courseId,
    );

    return { ...course, completionTime: totalCompletionTime };
  }

  async updateCourse(
    instructorId: string,
    courseId: string,
    dto: UpdateInstructorCourseDto,
  ) {
    const course = await this.ensureCourseOwnership(instructorId, courseId);

    const { categoryName, title, ...data } = dto;
    let categoryId: string | undefined;

    if (categoryName) {
      const category = await this.prisma.category.findUnique({
        where: { name: categoryName },
      });
      if (!category)
        throw new NotFoundException(`Category '${categoryName}' not found`);
      categoryId = category.id;
    }

    let slug = course.slug;
    if (title && title !== course.title) {
      slug = generateSlug(title);
      let counter = 0;
      while (
        await this.prisma.course.findFirst({
          where: { slug, id: { not: courseId } },
        })
      ) {
        counter++;
        slug = `${generateSlug(title)}-${counter}`;
      }
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        ...data,
        ...(title && { title }),
        ...(title && { slug }),
        ...(categoryId && { categoryId }),
      },
      include: {
        instructor: { select: { id: true, name: true, email: true } },
        category: true,
        _count: { select: { modules: true, enrollments: true } },
      },
    });
  }

  async deleteCourse(instructorId: string, courseId: string) {
    await this.ensureCourseOwnership(instructorId, courseId);
    await this.prisma.course.delete({ where: { id: courseId } });
    return { message: 'Course deleted successfully' };
  }

  async toggleCoursePublish(instructorId: string, courseId: string) {
    const course = await this.ensureCourseOwnership(instructorId, courseId);
    return this.prisma.course.update({
      where: { id: courseId },
      data: { isPublished: !course.isPublished },
      include: {
        instructor: { select: { id: true, name: true, email: true } },
        category: true,
      },
    });
  }

  async duplicateCourse(instructorId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: { orderBy: { order: 'asc' } },
            quiz: {
              include: {
                questions: { include: { options: true } },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        finalAssessment: {
          include: {
            questions: { include: { options: true } },
          },
        },
      },
    });

    if (!course) throw new NotFoundException('Course not found');
    if (course.instructorId !== instructorId)
      throw new ForbiddenException('You do not own this course');

    let slug = generateSlug(`${course.title} copy`);
    let counter = 0;
    while (await this.prisma.course.findUnique({ where: { slug } })) {
      counter++;
      slug = `${generateSlug(`${course.title} copy`)}-${counter}`;
    }

    return this.prisma.$transaction(async (tx) => {
      // Create new course
      const newCourse = await tx.course.create({
        data: {
          title: `${course.title} (Copy)`,
          slug,
          description: course.description,
          imageUrl: course.imageUrl,
          price: course.price,
          isPublished: false,
          instructorId,
          categoryId: course.categoryId,
          completionTime: course.completionTime,
        },
      });

      // Clone modules, lessons, quizzes
      for (const mod of course.modules) {
        const newModule = await tx.module.create({
          data: {
            title: mod.title,
            order: mod.order,
            courseId: newCourse.id,
          },
        });

        // Clone lessons
        for (const lesson of mod.lessons) {
          await tx.lesson.create({
            data: {
              title: lesson.title,
              type: lesson.type,
              content: lesson.content,
              videoUrl: lesson.videoUrl,
              order: lesson.order,
              completionTime: lesson.completionTime,
              moduleId: newModule.id,
            },
          });
        }

        // Clone module quiz
        if (mod.quiz) {
          const newQuiz = await tx.quiz.create({
            data: { moduleId: newModule.id },
          });
          for (const q of mod.quiz.questions) {
            const newQuestion = await tx.question.create({
              data: { text: q.text, quizId: newQuiz.id },
            });
            await tx.option.createMany({
              data: q.options.map((opt) => ({
                text: opt.text,
                isCorrect: opt.isCorrect,
                questionId: newQuestion.id,
              })),
            });
          }
        }
      }

      // Clone final assessment
      if (course.finalAssessment) {
        const newAssessment = await tx.quiz.create({ data: {} });
        for (const q of course.finalAssessment.questions) {
          const newQuestion = await tx.question.create({
            data: { text: q.text, quizId: newAssessment.id },
          });
          await tx.option.createMany({
            data: q.options.map((opt) => ({
              text: opt.text,
              isCorrect: opt.isCorrect,
              questionId: newQuestion.id,
            })),
          });
        }
        await tx.course.update({
          where: { id: newCourse.id },
          data: { finalAssessmentId: newAssessment.id },
        });
      }

      return tx.course.findUnique({
        where: { id: newCourse.id },
        include: {
          instructor: { select: { id: true, name: true, email: true } },
          category: true,
          _count: { select: { modules: true, enrollments: true } },
        },
      });
    });
  }

  async previewCourse(instructorId: string, courseId: string) {
    await this.ensureCourseOwnership(instructorId, courseId);

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: { select: { id: true, name: true, email: true } },
        category: true,
        modules: {
          include: {
            lessons: { orderBy: { order: 'asc' } },
            quiz: { select: { id: true, _count: { select: { questions: true } } } },
          },
          orderBy: { order: 'asc' },
        },
        finalAssessment: {
          select: { id: true, _count: { select: { questions: true } } },
        },
      },
    });

    if (!course) throw new NotFoundException('Course not found');

    const totalLessons = course.modules.reduce(
      (sum, m) => sum + m.lessons.length,
      0,
    );

    return {
      ...course,
      totalLessons,
      totalModules: course.modules.length,
      hasFinalAssessment: !!course.finalAssessment,
    };
  }

  // ============================================
  // MODULE MANAGEMENT
  // ============================================

  async createModule(
    instructorId: string,
    courseId: string,
    dto: CreateInstructorModuleDto,
  ) {
    await this.ensureCourseOwnership(instructorId, courseId);

    let order = dto.order;
    if (order === undefined) {
      const lastModule = await this.prisma.module.findFirst({
        where: { courseId },
        orderBy: { order: 'desc' },
      });
      order = lastModule ? lastModule.order + 1 : 0;
    }

    return this.prisma.module.create({
      data: { title: dto.title, order, courseId },
      include: {
        course: { select: { id: true, title: true } },
        _count: { select: { lessons: true } },
      },
    });
  }

  async getModulesByCourse(instructorId: string, courseId: string) {
    await this.ensureCourseOwnership(instructorId, courseId);
    return this.prisma.module.findMany({
      where: { courseId },
      include: {
        _count: { select: { lessons: true } },
        quiz: { select: { id: true, _count: { select: { questions: true } } } },
      },
      orderBy: { order: 'asc' },
    });
  }

  async getModuleById(instructorId: string, moduleId: string) {
    const module = await this.ensureModuleOwnership(instructorId, moduleId);
    return this.prisma.module.findUnique({
      where: { id: module.id },
      include: {
        course: { select: { id: true, title: true } },
        lessons: { orderBy: { order: 'asc' } },
        _count: { select: { lessons: true } },
      },
    });
  }

  async updateModule(
    instructorId: string,
    moduleId: string,
    dto: UpdateInstructorModuleDto,
  ) {
    await this.ensureModuleOwnership(instructorId, moduleId);
    return this.prisma.module.update({
      where: { id: moduleId },
      data: dto,
      include: {
        course: { select: { id: true, title: true } },
        _count: { select: { lessons: true } },
      },
    });
  }

  async deleteModule(instructorId: string, moduleId: string) {
    await this.ensureModuleOwnership(instructorId, moduleId);
    await this.prisma.module.delete({ where: { id: moduleId } });
    return { message: 'Module deleted successfully' };
  }

  async reorderModules(
    instructorId: string,
    courseId: string,
    dto: ReorderInstructorModulesDto,
  ) {
    await this.ensureCourseOwnership(instructorId, courseId);

    const moduleIds = dto.modules.map((m) => m.id);
    const modules = await this.prisma.module.findMany({
      where: { id: { in: moduleIds }, courseId },
    });
    if (modules.length !== moduleIds.length)
      throw new BadRequestException(
        'Some modules do not belong to this course',
      );

    await this.prisma.$transaction(
      dto.modules.map((item) =>
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

  async createLesson(
    instructorId: string,
    moduleId: string,
    dto: CreateInstructorLessonDto,
  ) {
    const module = await this.ensureModuleOwnership(instructorId, moduleId);

    const { type, content, videoUrl, ...data } = dto;

    if (type === LessonType.VIDEO && !videoUrl)
      throw new BadRequestException('Video URL is required for VIDEO lessons');
    if (
      (type === LessonType.TEXT || type === LessonType.QUIZ) &&
      !content
    )
      throw new BadRequestException(`Content is required for ${type} lessons`);

    let order = dto.order;
    if (order === undefined) {
      const lastLesson = await this.prisma.lesson.findFirst({
        where: { moduleId },
        orderBy: { order: 'desc' },
      });
      order = lastLesson ? lastLesson.order + 1 : 0;
    }

    const lesson = await this.prisma.lesson.create({
      data: {
        ...data,
        type,
        order,
        moduleId,
        content: type === LessonType.VIDEO ? null : content,
        videoUrl: type === LessonType.VIDEO ? videoUrl : null,
      },
      include: {
        module: { select: { id: true, title: true, courseId: true } },
      },
    });

    const totalCompletionTime = await this.calculateCourseCompletionTime(
      module.course.id,
    );
    await this.prisma.course.update({
      where: { id: module.course.id },
      data: { completionTime: totalCompletionTime },
    });

    return lesson;
  }

  async getLessonsByModule(instructorId: string, moduleId: string) {
    await this.ensureModuleOwnership(instructorId, moduleId);
    return this.prisma.lesson.findMany({
      where: { moduleId },
      include: { _count: { select: { userProgress: true } } },
      orderBy: { order: 'asc' },
    });
  }

  async getLessonById(instructorId: string, lessonId: string) {
    await this.ensureLessonOwnership(instructorId, lessonId);
    return this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: { select: { id: true, title: true, courseId: true } },
        _count: { select: { userProgress: true } },
      },
    });
  }

  async updateLesson(
    instructorId: string,
    lessonId: string,
    dto: UpdateInstructorLessonDto,
  ) {
    const lesson = await this.ensureLessonOwnership(instructorId, lessonId);

    const { type, content, videoUrl, ...data } = dto;
    const updateData: any = { ...data };

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
      if (content !== undefined) updateData.content = content;
      if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
    }

    const updatedLesson = await this.prisma.lesson.update({
      where: { id: lessonId },
      data: updateData,
      include: {
        module: { select: { id: true, title: true, courseId: true } },
      },
    });

    if (dto.completionTime !== undefined) {
      const totalCompletionTime = await this.calculateCourseCompletionTime(
        lesson.module.course.id,
      );
      await this.prisma.course.update({
        where: { id: lesson.module.course.id },
        data: { completionTime: totalCompletionTime },
      });
    }

    return updatedLesson;
  }

  async deleteLesson(instructorId: string, lessonId: string) {
    const lesson = await this.ensureLessonOwnership(instructorId, lessonId);
    const courseId = lesson.module.course.id;

    await this.prisma.lesson.delete({ where: { id: lessonId } });

    const totalCompletionTime =
      await this.calculateCourseCompletionTime(courseId);
    await this.prisma.course.update({
      where: { id: courseId },
      data: { completionTime: totalCompletionTime },
    });

    return { message: 'Lesson deleted successfully' };
  }

  async reorderLessons(
    instructorId: string,
    moduleId: string,
    dto: ReorderInstructorLessonsDto,
  ) {
    await this.ensureModuleOwnership(instructorId, moduleId);

    const lessonIds = dto.lessons.map((l) => l.id);
    const lessons = await this.prisma.lesson.findMany({
      where: { id: { in: lessonIds }, moduleId },
    });
    if (lessons.length !== lessonIds.length)
      throw new BadRequestException(
        'Some lessons do not belong to this module',
      );

    await this.prisma.$transaction(
      dto.lessons.map((item) =>
        this.prisma.lesson.update({
          where: { id: item.id },
          data: { order: item.order },
        }),
      ),
    );
    return { message: 'Lessons reordered successfully' };
  }

  // ============================================
  // QUIZ MANAGEMENT
  // ============================================

  async createQuiz(
    instructorId: string,
    parentType: 'module' | 'course',
    parentId: string,
    quizDto: CreateInstructorQuizDto,
  ) {
    if (parentType === 'module') {
      await this.ensureModuleOwnership(instructorId, parentId);
    } else {
      await this.ensureCourseOwnership(instructorId, parentId);
    }

    const parent =
      parentType === 'module'
        ? await this.prisma.module.findUnique({
            where: { id: parentId },
            include: { quiz: true },
          })
        : await this.prisma.course.findUnique({
            where: { id: parentId },
            include: { finalAssessment: true },
          });

    const existingQuiz =
      parentType === 'module'
        ? (parent as any).quiz
        : (parent as any).finalAssessment;

    const result = await this.prisma.$transaction(async (tx) => {
      let quiz: any;

      if (existingQuiz) {
        quiz = existingQuiz;
      } else {
        const quizData: any = {};
        if (parentType === 'module') quizData.moduleId = parentId;
        quiz = await tx.quiz.create({ data: quizData });
        if (parentType === 'course') {
          await tx.course.update({
            where: { id: parentId },
            data: { finalAssessmentId: quiz.id },
          });
        }
      }

      if (quizDto.questions && quizDto.questions.length > 0) {
        for (const questionDto of quizDto.questions) {
          const question = await tx.question.create({
            data: { text: questionDto.text, quizId: quiz.id },
          });
          await tx.option.createMany({
            data: questionDto.options.map((opt) => ({
              text: opt.text,
              isCorrect: opt.isCorrect,
              questionId: question.id,
            })),
          });
        }
      }

      return tx.quiz.findUnique({
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

  async getQuiz(
    instructorId: string,
    parentType: 'module' | 'course',
    parentId: string,
  ) {
    if (parentType === 'module') {
      await this.ensureModuleOwnership(instructorId, parentId);
      const module = await this.prisma.module.findUnique({
        where: { id: parentId },
        include: {
          quiz: { include: { questions: { include: { options: true } } } },
          course: { select: { id: true, title: true } },
        },
      });
      if (!module?.quiz)
        throw new NotFoundException('No quiz found for this module');
      return {
        ...module.quiz,
        module: { id: module.id, title: module.title },
        course: module.course,
      };
    } else {
      await this.ensureCourseOwnership(instructorId, parentId);
      const course = await this.prisma.course.findUnique({
        where: { id: parentId },
        include: {
          finalAssessment: {
            include: { questions: { include: { options: true } } },
          },
        },
      });
      if (!course?.finalAssessment)
        throw new NotFoundException(
          'No final assessment found for this course',
        );
      return {
        ...course.finalAssessment,
        course: { id: course.id, title: course.title },
      };
    }
  }

  async updateQuestionText(
    instructorId: string,
    questionId: string,
    text: string,
  ) {
    const question = await this.ensureQuestionOwnership(
      instructorId,
      questionId,
    );

    const fullQuestion = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: { include: { submissions: { select: { id: true } } } },
      },
    });

    if (fullQuestion!.quiz.submissions.length > 0) {
      throw new BadRequestException(
        `Cannot update question. Quiz has ${fullQuestion!.quiz.submissions.length} student submissions.`,
      );
    }

    const updated = await this.prisma.question.update({
      where: { id: questionId },
      data: { text },
      include: { options: true },
    });

    return { message: 'Question text updated successfully', question: updated };
  }

  async updateQuestionOptions(
    instructorId: string,
    questionId: string,
    dto: UpdateInstructorQuestionDto,
  ) {
    await this.ensureQuestionOwnership(instructorId, questionId);

    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: { include: { submissions: { select: { id: true } } } },
        userAnswers: { select: { id: true } },
      },
    });

    if (
      question!.quiz.submissions.length > 0 ||
      question!.userAnswers.length > 0
    ) {
      throw new BadRequestException(
        'Cannot update question options. Students have already submitted answers.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.text) {
        await tx.question.update({
          where: { id: questionId },
          data: { text: dto.text },
        });
      }
      if (dto.options) {
        await tx.option.deleteMany({ where: { questionId } });
        await tx.option.createMany({
          data: dto.options.map((opt) => ({
            text: opt.text,
            isCorrect: opt.isCorrect,
            questionId,
          })),
        });
      }
    });

    return this.prisma.question.findUnique({
      where: { id: questionId },
      include: { options: true },
    });
  }

  async deleteQuiz(
    instructorId: string,
    parentType: 'module' | 'course',
    quizId: string,
  ) {
    await this.ensureQuizOwnership(instructorId, quizId);

    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        module: true,
        course: true,
        submissions: { select: { id: true } },
        questions: { include: { userAnswers: { select: { id: true } } } },
      },
    });

    if (!quiz) throw new NotFoundException('Quiz not found');

    if (parentType === 'module' && !quiz.module)
      throw new BadRequestException('This is not a module quiz');
    if (parentType === 'course' && !quiz.course)
      throw new BadRequestException('This is not a final assessment');

    const totalSubmissions = quiz.submissions.length;
    const totalAnswers = quiz.questions.reduce(
      (sum, q) => sum + q.userAnswers.length,
      0,
    );

    if (totalSubmissions > 0 || totalAnswers > 0) {
      throw new BadRequestException(
        `Cannot delete quiz. It has ${totalSubmissions} submissions and ${totalAnswers} answers.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (parentType === 'course' && quiz.course) {
        await tx.course.update({
          where: { id: quiz.course.id },
          data: { finalAssessmentId: null },
        });
      }
      await tx.quiz.delete({ where: { id: quizId } });
    });

    return {
      message: `${parentType === 'module' ? 'Module quiz' : 'Final assessment'} deleted successfully.`,
    };
  }

  // ============================================
  // STUDENT MANAGEMENT
  // ============================================

  async getEnrolledStudents(
    instructorId: string,
    filterDto: InstructorStudentFilterDto,
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 10, search, status } = filterDto;
    const skip = (page - 1) * limit;

    const where: any = { course: { instructorId } };
    if (status) where.status = status;
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: {
            select: {
              id: true,
              title: true,
              modules: {
                include: { lessons: { select: { id: true } } },
              },
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    // Calculate progress per enrollment
    const data = await Promise.all(
      enrollments.map(async (enrollment) => {
        const lessonIds = enrollment.course.modules.flatMap((m) =>
          m.lessons.map((l) => l.id),
        );
        const totalLessons = lessonIds.length;

        const completedCount = totalLessons > 0
          ? await this.prisma.userProgress.count({
              where: {
                userId: enrollment.userId,
                lessonId: { in: lessonIds },
                isCompleted: true,
              },
            })
          : 0;

        // Get last activity
        const lastActivity = await this.prisma.userActivityLog.findFirst({
          where: {
            userId: enrollment.userId,
            lesson: { module: { courseId: enrollment.courseId } },
          },
          orderBy: { loggedAt: 'desc' },
          select: { loggedAt: true },
        });

        return {
          enrollmentId: enrollment.id,
          enrolledAt: enrollment.enrolledAt,
          status: enrollment.status,
          user: enrollment.user,
          course: {
            id: enrollment.course.id,
            title: enrollment.course.title,
          },
          progress:
            totalLessons > 0
              ? Math.round((completedCount / totalLessons) * 100)
              : 0,
          completedLessons: completedCount,
          totalLessons,
          lastAccessedAt: lastActivity?.loggedAt || null,
        };
      }),
    );

    const totalPages = Math.ceil(total / limit);
    return {
      data,
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

  async getCourseStudents(
    instructorId: string,
    courseId: string,
    filterDto: InstructorStudentFilterDto,
  ): Promise<PaginatedResult<any>> {
    await this.ensureCourseOwnership(instructorId, courseId);

    const { page = 1, limit = 10, search, status } = filterDto;
    const skip = (page - 1) * limit;

    const where: any = { courseId };
    if (status) where.status = status;
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { enrolledAt: 'desc' },
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { modules: { include: { lessons: { select: { id: true } } } } },
    });

    const lessonIds = course!.modules.flatMap((m) =>
      m.lessons.map((l) => l.id),
    );
    const totalLessons = lessonIds.length;

    const data = await Promise.all(
      enrollments.map(async (enrollment) => {
        const completedCount = totalLessons > 0
          ? await this.prisma.userProgress.count({
              where: {
                userId: enrollment.userId,
                lessonId: { in: lessonIds },
                isCompleted: true,
              },
            })
          : 0;

        const lastActivity = await this.prisma.userActivityLog.findFirst({
          where: {
            userId: enrollment.userId,
            lesson: { module: { courseId } },
          },
          orderBy: { loggedAt: 'desc' },
          select: { loggedAt: true },
        });

        // Get quiz performance
        const quizSubmissions = await this.prisma.quizSubmission.findMany({
          where: {
            userId: enrollment.userId,
            quiz: {
              OR: [
                { module: { courseId } },
                { course: { id: courseId } },
              ],
            },
          },
          select: { score: true },
        });

        const avgQuizScore =
          quizSubmissions.length > 0
            ? Math.round(
                quizSubmissions.reduce((sum, s) => sum + s.score, 0) /
                  quizSubmissions.length,
              )
            : null;

        return {
          enrollmentId: enrollment.id,
          enrolledAt: enrollment.enrolledAt,
          status: enrollment.status,
          user: enrollment.user,
          progress:
            totalLessons > 0
              ? Math.round((completedCount / totalLessons) * 100)
              : 0,
          completedLessons: completedCount,
          totalLessons,
          lastAccessedAt: lastActivity?.loggedAt || null,
          avgQuizScore,
        };
      }),
    );

    const totalPages = Math.ceil(total / limit);
    return {
      data,
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

  async getStudentProgress(
    instructorId: string,
    courseId: string,
    userId: string,
  ) {
    await this.ensureCourseOwnership(instructorId, courseId);

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment)
      throw new BadRequestException('Student is not enrolled in this course');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: { lessons: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });

    const lessonIds = course!.modules.flatMap((m) =>
      m.lessons.map((l) => l.id),
    );

    const progressRecords = await this.prisma.userProgress.findMany({
      where: { userId, lessonId: { in: lessonIds } },
    });

    const progressMap = new Map(progressRecords.map((p) => [p.lessonId, p]));

    const modules = course!.modules.map((mod) => ({
      moduleId: mod.id,
      moduleTitle: mod.title,
      totalLessons: mod.lessons.length,
      completedLessons: mod.lessons.filter(
        (l) => progressMap.get(l.id)?.isCompleted,
      ).length,
      progress:
        mod.lessons.length > 0
          ? Math.round(
              (mod.lessons.filter((l) => progressMap.get(l.id)?.isCompleted)
                .length /
                mod.lessons.length) *
                100,
            )
          : 0,
    }));

    const totalLessons = lessonIds.length;
    const completedLessons = progressRecords.filter(
      (p) => p.isCompleted,
    ).length;

    return {
      user,
      courseId,
      courseTitle: course!.title,
      enrollmentStatus: enrollment.status,
      enrolledAt: enrollment.enrolledAt,
      totalLessons,
      completedLessons,
      overallProgress:
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0,
      modules,
    };
  }

  // ============================================
  // REVENUE
  // ============================================

  async getRevenueOverview(instructorId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { course: { instructorId } },
      include: {
        course: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
        user: { select: { name: true, email: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const totalRevenue = enrollments.reduce(
      (sum, e) => sum + e.course.price,
      0,
    );
    const totalPayments = enrollments.length;
    const averageTransactionValue =
      totalPayments > 0 ? totalRevenue / totalPayments : 0;

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const currentMonthEnrollments = enrollments.filter(
      (e) => e.enrolledAt >= currentMonthStart,
    );
    const lastMonthEnrollments = enrollments.filter(
      (e) => e.enrolledAt >= lastMonthStart && e.enrolledAt < currentMonthStart,
    );

    const monthlyRevenue = currentMonthEnrollments.reduce(
      (sum, e) => sum + e.course.price,
      0,
    );
    const lastMonthRevenue = lastMonthEnrollments.reduce(
      (sum, e) => sum + e.course.price,
      0,
    );

    const revenueGrowth =
      lastMonthRevenue > 0
        ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : monthlyRevenue > 0
          ? 100
          : 0;

    // Per-course earnings
    const courseRevenue = new Map<string, any>();
    enrollments.forEach((e) => {
      const cid = e.course.id;
      if (courseRevenue.has(cid)) {
        const d = courseRevenue.get(cid)!;
        d.count += 1;
        d.revenue += e.course.price;
      } else {
        courseRevenue.set(cid, {
          courseId: cid,
          title: e.course.title,
          price: e.course.price,
          count: 1,
          revenue: e.course.price,
        });
      }
    });

    const earningsPerCourse = Array.from(courseRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .map((c) => ({
        courseId: c.courseId,
        title: c.title,
        enrollmentCount: c.count,
        revenue: c.revenue,
        price: c.price,
      }));

    // Monthly trend (last 12 months)
    const revenueByMonth: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
      );
      const monthEnrollments = enrollments.filter(
        (e) => e.enrolledAt >= monthDate && e.enrolledAt <= monthEnd,
      );
      revenueByMonth.push({
        month: monthDate.toLocaleString('default', { month: 'short' }),
        revenue: monthEnrollments.reduce(
          (sum, e) => sum + e.course.price,
          0,
        ),
        enrollments: monthEnrollments.length,
        year: monthDate.getFullYear(),
      });
    }

    // Revenue by category
    const categoryRevenue = new Map<string, any>();
    enrollments.forEach((e) => {
      const catId = e.course.category.id;
      if (categoryRevenue.has(catId)) {
        const d = categoryRevenue.get(catId)!;
        d.revenue += e.course.price;
        d.enrollmentCount += 1;
        d.courses.add(e.course.id);
      } else {
        categoryRevenue.set(catId, {
          categoryId: catId,
          categoryName: e.course.category.name,
          revenue: e.course.price,
          enrollmentCount: 1,
          courses: new Set([e.course.id]),
        });
      }
    });

    const revenueByCategory = Array.from(categoryRevenue.values())
      .map((cat) => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        revenue: cat.revenue,
        enrollmentCount: cat.enrollmentCount,
        courseCount: cat.courses.size,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Recent transactions
    const recentTransactions = enrollments.slice(0, 10).map((e) => ({
      id: e.id,
      enrolledAt: e.enrolledAt,
      userName: e.user.name,
      userEmail: e.user.email,
      courseTitle: e.course.title,
      price: e.course.price,
    }));

    return {
      totalRevenue,
      totalPayments,
      averageTransactionValue,
      monthlyRevenue,
      revenueGrowth,
      earningsPerCourse,
      revenueByMonth,
      revenueByCategory,
      recentTransactions,
    };
  }

  // ============================================
  // ANALYTICS
  // ============================================

  async getCourseAnalytics(instructorId: string) {
    const courses = await this.prisma.course.findMany({
      where: { instructorId },
      include: {
        category: true,
        modules: {
          include: { lessons: { select: { id: true, completionTime: true } } },
        },
        enrollments: {
          include: {
            user: { select: { id: true } },
          },
        },
      },
    });

    const courseMetrics = await Promise.all(
      courses.map(async (course) => {
        const lessonIds = course.modules.flatMap((m) =>
          m.lessons.map((l) => l.id),
        );
        const totalLessons = lessonIds.length;
        const enrollmentCount = course.enrollments.length;

        // Completion rate
        const completedEnrollments = course.enrollments.filter(
          (e) => e.status === 'Completed',
        ).length;
        const completionRate =
          enrollmentCount > 0
            ? Math.round((completedEnrollments / enrollmentCount) * 100)
            : 0;

        // Average time to complete
        const totalTime = course.modules.reduce(
          (sum, m) =>
            sum +
            m.lessons.reduce((ls, l) => ls + (l.completionTime || 0), 0),
          0,
        );

        // Quiz performance
        const quizSubmissions = await this.prisma.quizSubmission.findMany({
          where: {
            quiz: {
              OR: [
                { module: { courseId: course.id } },
                { course: { id: course.id } },
              ],
            },
          },
          select: { score: true },
        });

        const avgQuizScore =
          quizSubmissions.length > 0
            ? Math.round(
                quizSubmissions.reduce((sum, s) => sum + s.score, 0) /
                  quizSubmissions.length,
              )
            : 0;

        const passRate =
          quizSubmissions.length > 0
            ? Math.round(
                (quizSubmissions.filter((s) => s.score >= 70).length /
                  quizSubmissions.length) *
                  100,
              )
            : 0;

        // Enrollment status breakdown
        const statusBreakdown = {
          notStarted: course.enrollments.filter(
            (e) => e.status === 'NotStarted',
          ).length,
          inProgress: course.enrollments.filter(
            (e) => e.status === 'InProgress',
          ).length,
          completed: completedEnrollments,
        };

        return {
          courseId: course.id,
          title: course.title,
          isPublished: course.isPublished,
          category: course.category.name,
          enrollmentCount,
          completionRate,
          totalLessons,
          totalModules: course.modules.length,
          estimatedTime: totalTime,
          avgQuizScore,
          passRate,
          statusBreakdown,
          revenue: enrollmentCount * course.price,
        };
      }),
    );

    // Overall stats
    const totalEnrollments = courseMetrics.reduce(
      (sum, c) => sum + c.enrollmentCount,
      0,
    );
    const avgCompletionRate =
      courseMetrics.length > 0
        ? Math.round(
            courseMetrics.reduce((sum, c) => sum + c.completionRate, 0) /
              courseMetrics.length,
          )
        : 0;

    return {
      overview: {
        totalCourses: courses.length,
        totalEnrollments,
        avgCompletionRate,
        totalRevenue: courseMetrics.reduce((sum, c) => sum + c.revenue, 0),
      },
      courses: courseMetrics,
    };
  }

  // ============================================
  // CATEGORIES (Read-only for instructors)
  // ============================================

  async getCategories() {
    return this.prisma.category.findMany({
      include: { _count: { select: { courses: true } } },
      orderBy: { name: 'asc' },
    });
  }
}
