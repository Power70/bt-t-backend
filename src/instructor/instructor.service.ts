import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InstructorCreateCourseDto } from './dto/create-course.dto';
import { InstructorUpdateCourseDto } from './dto/update-course.dto';
import { InstructorCourseFilterDto } from './dto/course-filter.dto';
import { generateSlug } from '../admin/utils/slug.util';

@Injectable()
export class InstructorService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // COURSE MANAGEMENT
  // ============================================

  /**
   * Calculate total completion time for a course (sum of all lesson completion times)
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
   * Verify instructor owns the course
   */
  private async verifyInstructorOwnership(
    instructorId: string,
    courseId: string,
  ): Promise<void> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID '${courseId}' not found`);
    }

    if (course.instructorId !== instructorId) {
      throw new ForbiddenException(
        'You do not have permission to access this course',
      );
    }
  }

  /**
   * Create a new course
   */
  async createCourse(instructorId: string, createCourseDto: InstructorCreateCourseDto) {
    const { title, categoryId, ...data } = createCourseDto;

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category not found`);
    }

    // Generate unique slug
    let slug = generateSlug(title);
    let slugExists = await this.prisma.course.findUnique({
      where: { slug },
    });

    let counter = 1;
    while (slugExists) {
      slug = `${generateSlug(title)}-${counter}`;
      slugExists = await this.prisma.course.findUnique({
        where: { slug },
      });
      counter++;
    }

    const course = await this.prisma.course.create({
      data: {
        title,
        slug,
        instructorId,
        categoryId,
        ...data,
      },
      include: {
        category: true,
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
   * Get all courses for an instructor with filters and pagination
   */
  async getInstructorCourses(
    instructorId: string,
    filters: InstructorCourseFilterDto,
  ) {
    const {
      search,
      isPublished,
      categoryId,
      page = 1,
      limit = 10,
    } = filters;

    const skip = (page - 1) * limit;

    const where: any = {
      instructorId,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isPublished !== undefined) {
      where.isPublished = isPublished;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          instructor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              modules: true,
              enrollments: true,
            },
          },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      data: courses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get a single course with detailed information
   */
  async getCourseById(instructorId: string, courseId: string) {
    await this.verifyInstructorOwnership(instructorId, courseId);

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        category: true,
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
            },
            quiz: {
              include: {
                questions: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course not found`);
    }

    // Calculate total completion time from all lessons
    const totalCompletionTime = await this.calculateCourseCompletionTime(courseId);

    // Update the course completion time in database
    await this.prisma.course.update({
      where: { id: courseId },
      data: { completionTime: totalCompletionTime },
    });

    return {
      ...course,
      completionTime: totalCompletionTime,
    };
  }

  /**
   * Update a course
   */
  async updateCourse(
    instructorId: string,
    courseId: string,
    updateCourseDto: InstructorUpdateCourseDto,
  ) {
    await this.verifyInstructorOwnership(instructorId, courseId);

    const { title, categoryId, ...data } = updateCourseDto;

    const updateData: any = { ...data };

    if (title) {
      updateData.title = title;
      // Generate new slug if title changes
      let slug = generateSlug(title);
      let slugExists = await this.prisma.course.findFirst({
        where: { slug, NOT: { id: courseId } },
      });

      let counter = 1;
      while (slugExists) {
        slug = `${generateSlug(title)}-${counter}`;
        slugExists = await this.prisma.course.findFirst({
          where: { slug, NOT: { id: courseId } },
        });
        counter++;
      }
      updateData.slug = slug;
    }

    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Category not found`);
      }
      updateData.categoryId = categoryId;
    }

    const course = await this.prisma.course.update({
      where: { id: courseId },
      data: updateData,
      include: {
        category: true,
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
   * Delete a course
   */
  async deleteCourse(instructorId: string, courseId: string) {
    await this.verifyInstructorOwnership(instructorId, courseId);

    await this.prisma.course.delete({
      where: { id: courseId },
    });

    return { message: 'Course deleted successfully' };
  }

  /**
   * Duplicate a course
   */
  async duplicateCourse(instructorId: string, courseId: string) {
    await this.verifyInstructorOwnership(instructorId, courseId);

    const originalCourse = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: true,
            quiz: {
              include: {
                questions: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
        attachments: true,
      },
    });

    if (!originalCourse) {
      throw new NotFoundException(`Course not found`);
    }

    // Generate new title and slug
    const newTitle = `${originalCourse.title} (Copy)`;
    let slug = generateSlug(newTitle);
    let slugExists = await this.prisma.course.findUnique({
      where: { slug },
    });

    let counter = 1;
    while (slugExists) {
      slug = `${generateSlug(newTitle)}-${counter}`;
      slugExists = await this.prisma.course.findUnique({
        where: { slug },
      });
      counter++;
    }

    // Create new course with nested modules, lessons, and quizzes
    const newCourse = await this.prisma.course.create({
      data: {
        title: newTitle,
        slug,
        description: originalCourse.description,
        imageUrl: originalCourse.imageUrl,
        price: originalCourse.price,
        isPublished: false, // Set to draft by default
        instructorId,
        categoryId: originalCourse.categoryId,
        completionTime: originalCourse.completionTime,
        modules: {
          create: originalCourse.modules.map((module) => ({
            title: module.title,
            order: module.order,
            lessons: {
              create: module.lessons.map((lesson) => ({
                title: lesson.title,
                type: lesson.type,
                content: lesson.content,
                videoUrl: lesson.videoUrl,
                order: lesson.order,
                completionTime: lesson.completionTime,
              })),
            },
            quiz: module.quiz
              ? {
                  create: {
                    questions: {
                      create: module.quiz.questions.map((question) => ({
                        text: question.text,
                        options: {
                          create: question.options.map((option) => ({
                            text: option.text,
                            isCorrect: option.isCorrect,
                          })),
                        },
                      })),
                    },
                  },
                }
              : undefined,
          })),
        },
        attachments: {
          create: originalCourse.attachments.map((attachment) => ({
            name: attachment.name,
            url: attachment.url,
          })),
        },
      },
      include: {
        category: true,
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
    });

    return newCourse;
  }

  /**
   * Toggle course publish status
   */
  async togglePublishStatus(instructorId: string, courseId: string) {
    await this.verifyInstructorOwnership(instructorId, courseId);

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { isPublished: true },
    });

    if (!course) {
      throw new NotFoundException(`Course not found`);
    }

    const updatedCourse = await this.prisma.course.update({
      where: { id: courseId },
      data: { isPublished: !course.isPublished },
      include: {
        category: true,
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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

  // ============================================
  // STUDENT MANAGEMENT & TRACKING
  // ============================================

  /**
   * Get all students enrolled in instructor's courses
   */
  async getEnrolledStudents(instructorId: string, courseId?: string) {
    const where: any = {
      course: {
        instructorId,
      },
    };

    if (courseId) {
      await this.verifyInstructorOwnership(instructorId, courseId);
      where.courseId = courseId;
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    return enrollments;
  }

  /**
   * Get detailed student progress for a specific course
   */
  async getStudentProgress(
    instructorId: string,
    courseId: string,
    studentId?: string,
  ) {
    await this.verifyInstructorOwnership(instructorId, courseId);

    const where: any = {
      courseId,
    };

    if (studentId) {
      where.userId = studentId;
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            progress: {
              where: {
                lesson: {
                  module: {
                    courseId,
                  },
                },
              },
              include: {
                lesson: {
                  include: {
                    module: {
                      select: {
                        id: true,
                        title: true,
                      },
                    },
                  },
                },
              },
            },
            activityLogs: {
              where: {
                lesson: {
                  module: {
                    courseId,
                  },
                },
              },
              orderBy: {
                loggedAt: 'desc',
              },
              take: 1,
            },
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            modules: {
              include: {
                lessons: true,
              },
            },
          },
        },
      },
    });

    // Calculate progress percentage for each student
    const studentsWithProgress = enrollments.map((enrollment) => {
      const totalLessons = enrollment.course.modules.reduce(
        (sum, module) => sum + module.lessons.length,
        0,
      );
      const completedLessons = enrollment.user.progress.filter(
        (p) => p.isCompleted,
      ).length;
      const progressPercentage =
        totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

      const lastActivity =
        enrollment.user.activityLogs.length > 0
          ? enrollment.user.activityLogs[0].loggedAt
          : null;

      return {
        enrollmentId: enrollment.id,
        enrolledAt: enrollment.enrolledAt,
        status: enrollment.status,
        student: {
          id: enrollment.user.id,
          name: enrollment.user.name,
          email: enrollment.user.email,
        },
        progress: {
          totalLessons,
          completedLessons,
          progressPercentage: Math.round(progressPercentage * 100) / 100,
          completedItems: enrollment.user.progress.map((p) => ({
            lessonId: p.lesson.id,
            lessonTitle: p.lesson.title,
            moduleTitle: p.lesson.module.title,
            completedAt: p.completedAt,
          })),
        },
        lastActivity,
      };
    });

    return studentsWithProgress;
  }

  /**
   * Get quiz performance for students in a course
   */
  async getQuizPerformance(instructorId: string, courseId: string) {
    await this.verifyInstructorOwnership(instructorId, courseId);

    const quizSubmissions = await this.prisma.quizSubmission.findMany({
      where: {
        quiz: {
          OR: [
            {
              module: {
                courseId,
              },
            },
            {
              course: {
                id: courseId,
              },
            },
          ],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        quiz: {
          include: {
            module: {
              select: {
                id: true,
                title: true,
              },
            },
            questions: true,
          },
        },
        userAnswers: {
          include: {
            question: true,
            option: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    // Group by student and calculate stats
    const studentStats = quizSubmissions.reduce((acc, submission) => {
      const userId = submission.user.id;
      if (!acc[userId]) {
        acc[userId] = {
          student: submission.user,
          totalAttempts: 0,
          totalScore: 0,
          quizzes: [],
        };
      }

      acc[userId].totalAttempts++;
      acc[userId].totalScore += submission.score;
      acc[userId].quizzes.push({
        submissionId: submission.id,
        moduleTitle: submission.quiz.module?.title || 'Final Assessment',
        score: submission.score,
        totalQuestions: submission.quiz.questions.length,
        submittedAt: submission.submittedAt,
        answers: submission.userAnswers.map((answer) => ({
          question: answer.question.text,
          selectedOption: answer.option.text,
          isCorrect: answer.option.isCorrect,
        })),
      });

      return acc;
    }, {} as any);

    return Object.values(studentStats).map((stats: any) => ({
      student: stats.student,
      totalAttempts: stats.totalAttempts,
      averageScore:
        stats.totalAttempts > 0
          ? Math.round((stats.totalScore / stats.totalAttempts) * 100) / 100
          : 0,
      quizzes: stats.quizzes,
    }));
  }

  // ============================================
  // REVENUE & ANALYTICS
  // ============================================

  /**
   * Get revenue analytics for instructor
   */
  async getRevenueAnalytics(instructorId: string, courseId?: string) {
    const where: any = {
      course: {
        instructorId,
      },
    };

    if (courseId) {
      await this.verifyInstructorOwnership(instructorId, courseId);
      where.courseId = courseId;
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            price: true,
          },
        },
      },
    });

    const totalRevenue = enrollments.reduce(
      (sum, enrollment) => sum + enrollment.course.price,
      0,
    );

    // Group by month
    const monthlyRevenue = enrollments.reduce((acc, enrollment) => {
      const month = new Date(enrollment.enrolledAt).toISOString().slice(0, 7);
      if (!acc[month]) {
        acc[month] = {
          month,
          revenue: 0,
          enrollments: 0,
        };
      }
      acc[month].revenue += enrollment.course.price;
      acc[month].enrollments++;
      return acc;
    }, {} as any);

    // Group by course
    const courseRevenue = enrollments.reduce((acc, enrollment) => {
      const courseId = enrollment.course.id;
      if (!acc[courseId]) {
        acc[courseId] = {
          courseId,
          courseTitle: enrollment.course.title,
          price: enrollment.course.price,
          enrollments: 0,
          revenue: 0,
        };
      }
      acc[courseId].enrollments++;
      acc[courseId].revenue += enrollment.course.price;
      return acc;
    }, {} as any);

    return {
      totalRevenue,
      totalEnrollments: enrollments.length,
      averageRevenuePerEnrollment:
        enrollments.length > 0
          ? Math.round((totalRevenue / enrollments.length) * 100) / 100
          : 0,
      monthlyRevenue: Object.values(monthlyRevenue).sort(
        (a: any, b: any) => a.month.localeCompare(b.month),
      ),
      courseRevenue: Object.values(courseRevenue).sort(
        (a: any, b: any) => b.revenue - a.revenue,
      ),
    };
  }

  /**
   * Get course performance metrics
   */
  async getCoursePerformance(instructorId: string, courseId?: string) {
    const where: any = {
      instructorId,
    };

    if (courseId) {
      await this.verifyInstructorOwnership(instructorId, courseId);
      where.id = courseId;
    }

    const courses = await this.prisma.course.findMany({
      where,
      include: {
        enrollments: {
          include: {
            user: {
              select: {
                progress: {
                  where: {
                    lesson: {
                      module: {
                        courseId: courseId || undefined,
                      },
                    },
                  },
                },
                activityLogs: {
                  where: {
                    lesson: {
                      module: {
                        courseId: courseId || undefined,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });

    const performanceData = courses.map((course) => {
      const totalLessons = course.modules.reduce(
        (sum, module) => sum + module.lessons.length,
        0,
      );

      let totalCompletedLessons = 0;
      let totalStudyTime = 0;
      let completedStudents = 0;

      course.enrollments.forEach((enrollment) => {
        const completedLessons = enrollment.user.progress.filter(
          (p) => p.isCompleted,
        ).length;
        totalCompletedLessons += completedLessons;

        const studyTime = enrollment.user.activityLogs.reduce(
          (sum, log) => sum + log.durationSeconds,
          0,
        );
        totalStudyTime += studyTime;

        if (completedLessons === totalLessons && totalLessons > 0) {
          completedStudents++;
        }
      });

      const enrollmentCount = course.enrollments.length;
      const completionRate =
        enrollmentCount > 0
          ? (completedStudents / enrollmentCount) * 100
          : 0;

      const averageProgress =
        enrollmentCount > 0 && totalLessons > 0
          ? (totalCompletedLessons / (enrollmentCount * totalLessons)) * 100
          : 0;

      const averageTimeToComplete =
        completedStudents > 0 ? totalStudyTime / completedStudents : 0;

      return {
        courseId: course.id,
        courseTitle: course.title,
        enrollmentCount,
        completionRate: Math.round(completionRate * 100) / 100,
        averageProgress: Math.round(averageProgress * 100) / 100,
        averageTimeToComplete: Math.round(averageTimeToComplete),
        totalStudyTime: Math.round(totalStudyTime),
        completedStudents,
      };
    });

    return performanceData;
  }

  /**
   * Get instructor dashboard overview
   */
  async getDashboardOverview(instructorId: string) {
    // Get all instructor courses
    const courses = await this.prisma.course.findMany({
      where: { instructorId },
      include: {
        enrollments: true,
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });

    const totalCourses = courses.length;
    const publishedCourses = courses.filter((c) => c.isPublished).length;
    const draftCourses = totalCourses - publishedCourses;

    // Get total enrollments and revenue
    const allEnrollments = courses.flatMap((c) => c.enrollments);
    const totalStudents = allEnrollments.length;
    const totalRevenue = allEnrollments.reduce(
      (sum, e) =>
        sum + (courses.find((c) => c.id === e.courseId)?.price || 0),
      0,
    );

    // Calculate total content
    const totalModules = courses.reduce(
      (sum, c) => sum + c.modules.length,
      0,
    );
    const totalLessons = courses.reduce(
      (sum, c) =>
        sum + c.modules.reduce((s, m) => s + m.lessons.length, 0),
      0,
    );

    // Get recent enrollments (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentEnrollments = allEnrollments.filter(
      (e) => new Date(e.enrolledAt) >= thirtyDaysAgo,
    );

    return {
      courses: {
        total: totalCourses,
        published: publishedCourses,
        draft: draftCourses,
      },
      students: {
        total: totalStudents,
        recentEnrollments: recentEnrollments.length,
      },
      revenue: {
        total: totalRevenue,
        averagePerCourse:
          totalCourses > 0
            ? Math.round((totalRevenue / totalCourses) * 100) / 100
            : 0,
      },
      content: {
        totalModules,
        totalLessons,
      },
    };
  }

  /**
   * Get instructor profile stats
   */
  async getInstructorStats(instructorId: string) {
    const courses = await this.prisma.course.findMany({
      where: { instructorId },
      include: {
        enrollments: true,
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });

    const totalStudents = courses.reduce(
      (sum, c) => sum + c.enrollments.length,
      0,
    );

    const totalHours = courses.reduce((sum, c) => {
      const courseMinutes = c.modules.reduce((s, m) => {
        return (
          s +
          m.lessons.reduce((ls, l) => ls + (l.completionTime || 0), 0)
        );
      }, 0);
      return sum + courseMinutes;
    }, 0);

    const instructor = await this.prisma.user.findUnique({
      where: { id: instructorId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return {
      instructor,
      stats: {
        totalCourses: courses.length,
        totalStudents,
        totalHoursOfContent: Math.round((totalHours / 60) * 100) / 100,
        memberSince: instructor?.createdAt,
      },
    };
  }
}
