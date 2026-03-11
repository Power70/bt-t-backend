import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma';
import { PaginatedFilterDto } from './dto/paginated-filter.dto';
import { BrowseCoursesFilterDto } from './dto/browse-courses-filter.dto';
import {
  PaginatedResult,
  createPaginatedResult,
} from './dto/paginated-result.dto';
import { LogActivityDto } from './dto/log-activity.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { DashboardSummaryDto } from './dto/responses/dashboard-summary.dto';
import { EnrollmentWithProgressDto } from './dto/responses/enrollment-with-progress.dto';
import { CourseDetailsDto } from './dto/responses/course-details.dto';
import { LessonCompletionResultDto } from './dto/responses/lesson-completion-result.dto';
import { ActivityLogResultDto } from './dto/responses/activity-log-result.dto';
import { CertificateDto } from './dto/responses/certificate.dto';
import { ModuleQuizDetailsDto } from './dto/responses/module-quiz-details.dto';
import { ModuleQuizSubmissionResultDto } from './dto/responses/module-quiz-submission-result.dto';
import { FinalAssessmentDetailsDto } from './dto/responses/final-assessment-details.dto';
import { FinalAssessmentSubmissionResultDto } from './dto/responses/final-assessment-submission-result.dto';
import { Status } from '../../generated/prisma';
import {
  EnrollmentNotFoundException,
  LessonNotFoundException,
  QuizNotFoundException,
  CertificateNotFoundException,
  InvalidQuizAnswersException,
  CourseNotFoundException,
  ModuleNotFoundException,
  ModuleQuizNotFoundException,
  FinalAssessmentNotFoundException,
  CertificateNotEligibleException,
  FinalAssessmentNotPassedException,
} from './exceptions/student.exceptions';

@Injectable()
export class StudentService {
  private readonly PASSING_THRESHOLD = 80; // 80% to pass a quiz

  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // DASHBOARD
  // ============================================

  /**
   * Get dashboard summary for a student
   * Returns enrollment stats and study time for the last 7 days
   */
  async getDashboardSummary(userId: string): Promise<DashboardSummaryDto> {
    const totalEnrolled = await this.prisma.enrollment.count({
      where: { userId },
    });

    // Count courses completed by enrollment status
    const statusCompleted = await this.prisma.enrollment.count({
      where: {
        userId,
        status: Status.Completed,
      },
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activityLogs = await this.prisma.userActivityLog.findMany({
      where: {
        userId,
        loggedAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        durationSeconds: true,
      },
    });

    const totalStudyTimeSeconds = activityLogs.reduce<number>(
      (sum, log) => sum + log.durationSeconds,
      0,
    );
    const totalStudyTime = totalStudyTimeSeconds / 3600;

    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
          },
        },
      },
    });

    let avgCompletion = 0;
    let lessonBasedCompleted = 0;
    if (enrollments.length > 0) {
      const progressPercentages = await Promise.all(
        enrollments.map(async (enrollment) => {
          const courseId = enrollment.course.id;

          const totalLessons = await this.prisma.lesson.count({
            where: {
              module: {
                courseId,
              },
            },
          });

          if (totalLessons === 0) return 0;

          const completedLessons = await this.prisma.userProgress.count({
            where: {
              userId,
              isCompleted: true,
              lesson: {
                module: {
                  courseId,
                },
              },
            },
          });

          // Count as completed if all lessons are done
          if (completedLessons >= totalLessons) {
            lessonBasedCompleted++;
          }

          return (completedLessons / totalLessons) * 100;
        }),
      );

      avgCompletion =
        progressPercentages.reduce<number>((sum, pct) => sum + pct, 0) /
        progressPercentages.length;
    }

    // Use the higher of status-based or lesson-based completed count
    const totalCompleted = Math.max(statusCompleted, lessonBasedCompleted);

    // Compute this week's study time from completed lesson times
    // Get lessons completed this week and sum their completionTime values
    const weekCompletedProgress = await this.prisma.userProgress.findMany({
      where: {
        userId,
        isCompleted: true,
        completedAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        lesson: {
          select: {
            completionTime: true,
          },
        },
      },
    });

    const weekLessonTimeSeconds = weekCompletedProgress.reduce<number>(
      (sum, p) => sum + (p.lesson.completionTime || 0),
      0,
    );

    // Use the higher of activity-logged time or lesson completion time
    const effectiveStudyTimeHours = Math.max(
      totalStudyTime,
      weekLessonTimeSeconds / 3600,
    );

    return {
      totalEnrolled,
      totalCompleted,
      avgCompletion: Math.round(avgCompletion * 10) / 10,
      totalStudyTime: Math.round(effectiveStudyTimeHours * 10) / 10,
    };
  }

  // ============================================
  // ENROLLMENTS
  // ============================================

  /**
   * Get all enrollments for a student with progress percentage
   * Supports pagination, search, and status filtering
   */
  async getMyEnrollments(
    userId: string,
    filterDto: PaginatedFilterDto,
  ): Promise<PaginatedResult<EnrollmentWithProgressDto>> {
    const { page = 1, limit = 10, search, status } = filterDto;
    const skip = (page - 1) * limit;

    console.log('[getMyEnrollments] Called with:', { userId, filterDto });

    // Build where clause
    const where: any = { userId };

    // Filter by status if provided
    if (status) {
      where.status = status;
    }

    if (search) {
      where.course = {
        OR: [
          {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      };
    }

    const total = await this.prisma.enrollment.count({ where });
    console.log('[getMyEnrollments] Total enrollments found:', total);

    const enrollments = await this.prisma.enrollment.findMany({
      where,
      skip,
      take: limit,
      include: {
        course: {
          include: {
            instructor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    });

    console.log(
      '[getMyEnrollments] Enrollments retrieved:',
      enrollments.length,
    );
    console.log(
      '[getMyEnrollments] First enrollment:',
      enrollments[0]
        ? {
            id: enrollments[0].id,
            courseTitle: enrollments[0].course?.title,
            status: enrollments[0].status,
          }
        : 'none',
    );

    // Calculate progress for each enrollment
    const enrollmentsWithProgress: EnrollmentWithProgressDto[] =
      await Promise.all(
        enrollments.map(async (enrollment) => {
          const courseId = enrollment.course.id;

          const totalLessons = await this.prisma.lesson.count({
            where: {
              module: {
                courseId,
              },
            },
          });

          const completedLessons = await this.prisma.userProgress.count({
            where: {
              userId,
              isCompleted: true,
              lesson: {
                module: {
                  courseId,
                },
              },
            },
          });

          const progressPercentage =
            totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

          return {
            ...enrollment,
            progressPercentage: Math.round(progressPercentage * 10) / 10,
          };
        }),
      );

    console.log(
      '[getMyEnrollments] Enrollments with progress calculated:',
      enrollmentsWithProgress.length,
    );

    const result = createPaginatedResult(
      enrollmentsWithProgress,
      total,
      page,
      limit,
    );
    console.log('[getMyEnrollments] Returning result:', {
      total: result.meta.total,
      page: result.meta.page,
      totalPages: result.meta.totalPages,
      enrollmentsCount: result.data.length,
    });

    return result;
  }

  /**
   * Get detailed course information with progress for enrolled student
   */
  async getCourseDetails(
    userId: string,
    courseId: string,
  ): Promise<CourseDetailsDto> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw new EnrollmentNotFoundException(userId, courseId);
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!course) {
      throw new CourseNotFoundException(courseId);
    }

    const userProgressList = await this.prisma.userProgress.findMany({
      where: {
        userId,
        lesson: {
          module: {
            courseId,
          },
        },
        isCompleted: true,
      },
      select: {
        lessonId: true,
      },
    });

    const completedLessonIds = new Set(
      userProgressList.map((progress) => progress.lessonId),
    );

    let totalLessons = 0;
    let completedLessons = 0;

    const modulesWithProgress = course.modules.map((module) => {
      const totalModuleTime = module.lessons.reduce<number>(
        (sum, lesson) => sum + (lesson.completionTime || 0),
        0,
      );

      const lessonsWithCompletion = module.lessons.map((lesson) => {
        totalLessons++;
        const isCompleted = completedLessonIds.has(lesson.id);
        if (isCompleted) completedLessons++;

        return {
          ...lesson,
          isCompleted,
        };
      });

      return {
        id: module.id,
        title: module.title,
        order: module.order,
        totalModuleTime,
        lessons: lessonsWithCompletion,
      };
    });

    // Compute total completionTime dynamically from all lessons
    const computedCompletionTime = modulesWithProgress.reduce(
      (sum, mod) => sum + mod.totalModuleTime,
      0,
    );

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      imageUrl: course.imageUrl,
      price: course.price,
      isPublished: course.isPublished,
      completionTime: computedCompletionTime || course.completionTime,
      instructor: course.instructor,
      category: course.category,
      modules: modulesWithProgress,
      totalLessons,
      completedLessons,
    };
  }

  // ============================================
  // PROGRESS
  // ============================================

  /**
   * Mark a lesson as completed for a student
   * Handles enrollment status updates and certificate generation
   */
  async markLessonCompleted(
    userId: string,
    lessonId: string,
  ): Promise<LessonCompletionResultDto> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          select: {
            courseId: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new LessonNotFoundException(lessonId);
    }

    const courseId = lesson.module.courseId;

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw new EnrollmentNotFoundException(userId, courseId);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let updatedEnrollment = enrollment;
      if (enrollment.status === Status.NotStarted) {
        updatedEnrollment = await tx.enrollment.update({
          where: {
            userId_courseId: {
              userId,
              courseId,
            },
          },
          data: {
            status: Status.InProgress,
          },
        });
      }

      await tx.userProgress.upsert({
        where: {
          userId_lessonId: {
            userId,
            lessonId,
          },
        },
        create: {
          userId,
          lessonId,
          isCompleted: true,
          completedAt: new Date(),
        },
        update: {
          isCompleted: true,
          completedAt: new Date(),
        },
      });

      const totalLessons = await tx.lesson.count({
        where: {
          module: {
            courseId,
          },
        },
      });

      const completedLessons = await tx.userProgress.count({
        where: {
          userId,
          isCompleted: true,
          lesson: {
            module: {
              courseId,
            },
          },
        },
      });

      // Note: Course is NOT marked as completed here
      // Completion only happens after passing all module quizzes and final assessment
      // in submitFinalAssessment method

      return {
        enrollment: updatedEnrollment,
        completed: completedLessons,
        total: totalLessons,
      };
    });

    return {
      status: 'success',
      newEnrollmentStatus: result.enrollment.status,
      completed: result.completed,
      total: result.total,
      message: 'Lesson marked as completed',
    };
  }

  /**
   * Log student activity for a lesson
   */
  async logActivity(
    userId: string,
    logActivityDto: LogActivityDto,
  ): Promise<ActivityLogResultDto> {
    const { lessonId, durationSeconds } = logActivityDto;

    // Verify lesson exists
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new LessonNotFoundException(lessonId);
    }

    // Create activity log
    const activityLog = await this.prisma.userActivityLog.create({
      data: {
        userId,
        lessonId,
        durationSeconds,
      },
    });

    return {
      status: 'success',
      message: 'Activity logged successfully',
      activityLogId: activityLog.id,
    };
  }

  // ============================================
  // MODULE-BASED QUIZZES
  // ============================================

  /**
   * Get quiz details for a module (without revealing correct answers)
   */
  async getModuleQuizDetails(
    userId: string,
    moduleId: string,
  ): Promise<ModuleQuizDetailsDto> {
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
      throw new ModuleNotFoundException(moduleId);
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: module.course.id,
        },
      },
    });

    if (!enrollment) {
      throw new EnrollmentNotFoundException(userId, module.course.id);
    }

    const quiz = await this.prisma.quiz.findUnique({
      where: { moduleId },
      include: {
        questions: {
          include: {
            options: {
              select: {
                id: true,
                text: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      throw new ModuleQuizNotFoundException(moduleId);
    }

    return {
      id: quiz.id,
      moduleId: module.id,
      moduleTitle: module.title,
      questions: quiz.questions,
    };
  }

  /**
   * Submit module quiz answers and calculate score
   * Automatically marks module quiz as completed if score >= 80%
   */
  async submitModuleQuiz(
    userId: string,
    quizId: string,
    submitQuizDto: SubmitQuizDto,
  ): Promise<ModuleQuizSubmissionResultDto> {
    const { answers } = submitQuizDto;

    // Fetch quiz with all options (for feedback)
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        module: {
          include: {
            course: {
              select: {
                id: true,
              },
            },
          },
        },
        questions: {
          include: {
            options: {
              select: {
                id: true,
                text: true,
                isCorrect: true,
                questionId: true,
              },
            },
          },
        },
      },
    });

    if (!quiz || !quiz.module) {
      throw new QuizNotFoundException(quizId);
    }

    const moduleId = quiz.module.id;
    const courseId = quiz.module.course.id;

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw new EnrollmentNotFoundException(userId, courseId);
    }

    // Build a map of question -> all correct option IDs (for module quiz)
    const correctAnswersMap = new Map<string, Set<string>>();
    quiz.questions.forEach(
      (question: {
        id: string;
        text: string;
        options: Array<{ id: string; text: string; isCorrect: boolean }>;
      }) => {
        const correctOptionIds = new Set(
          question.options.filter((opt) => opt.isCorrect).map((opt) => opt.id),
        );
        correctAnswersMap.set(question.id, correctOptionIds);
      },
    );

    // Validate that all questions have been answered
    const allQuestionIds = new Set(
      quiz.questions.map((q: { id: string }) => q.id),
    );
    const answeredQuestionIds = new Set(answers.map((a) => a.questionId));

    if (allQuestionIds.size !== answeredQuestionIds.size) {
      throw new InvalidQuizAnswersException(
        'You must answer all questions before submitting',
      );
    }

    // Check for duplicate answers
    if (answeredQuestionIds.size !== answers.length) {
      throw new InvalidQuizAnswersException(
        'Duplicate answers detected. Each question should be answered only once',
      );
    }

    // Validate that all question IDs are valid
    for (const answer of answers) {
      if (!allQuestionIds.has(answer.questionId)) {
        throw new InvalidQuizAnswersException(
          `Invalid question ID: ${answer.questionId}`,
        );
      }
    }

    // Calculate score
    let score = 0;
    answers.forEach((answer) => {
      const correctOptionIds = correctAnswersMap.get(answer.questionId);
      if (!correctOptionIds) return;

      // Convert student's answer to a Set for comparison
      const studentAnswerSet = new Set(answer.optionIds);

      // Question is correct only if student selected exactly all correct options
      // (no more, no less)
      const isCorrect =
        studentAnswerSet.size === correctOptionIds.size &&
        [...studentAnswerSet].every((id) => correctOptionIds.has(id));

      if (isCorrect) {
        score++;
      }
    });

    const total = quiz.questions.length;
    const percentage = (score / total) * 100;
    const passed = percentage >= this.PASSING_THRESHOLD;

    // Use transaction to save submission and mark module quiz complete if passed
    const result = await this.prisma.$transaction(async (tx) => {
      // Create quiz submission
      const quizSubmission = await tx.quizSubmission.create({
        data: {
          userId,
          quizId,
          score,
          userAnswers: {
            create: answers.flatMap((answer) =>
              answer.optionIds.map((optionId) => ({
                questionId: answer.questionId,
                optionId: optionId,
              })),
            ),
          },
        },
      });

      let isLastModuleQuiz = false;

      // If passed, save module quiz completion
      if (passed) {
        await tx.moduleQuizCompletion.upsert({
          where: {
            userId_moduleId: {
              userId,
              moduleId,
            },
          },
          create: {
            userId,
            moduleId,
            score,
            percentage,
            passed: true,
            completedAt: new Date(),
          },
          update: {
            score,
            percentage,
            passed: true,
            completedAt: new Date(),
          },
        });

        // Check if all module quizzes are completed
        const totalModules = await tx.module.count({
          where: {
            courseId,
          },
        });

        const completedModuleQuizzes = await tx.moduleQuizCompletion.count({
          where: {
            userId,
            passed: true,
            module: {
              courseId,
            },
          },
        });

        isLastModuleQuiz = totalModules === completedModuleQuizzes;

        // Update enrollment status if it was NotStarted
        if (enrollment.status === Status.NotStarted) {
          await tx.enrollment.update({
            where: {
              userId_courseId: {
                userId,
                courseId,
              },
            },
            data: {
              status: Status.InProgress,
            },
          });
        }
      }

      return {
        quizSubmission,
        isLastModuleQuiz,
      };
    });

    // Generate detailed feedback for each question
    const feedback = quiz.questions.map((question) => {
      const correctOptionIds = correctAnswersMap.get(question.id) || new Set();
      const studentAnswer = answers.find((a) => a.questionId === question.id);
      const studentAnswerSet = new Set(studentAnswer?.optionIds || []);

      const isCorrect =
        studentAnswerSet.size === correctOptionIds.size &&
        [...studentAnswerSet].every((id) => correctOptionIds.has(id));

      return {
        questionId: question.id,
        questionText: question.text,
        isCorrect,
        studentAnswers: studentAnswer?.optionIds || [],
        correctAnswers: [...correctOptionIds],
        options: question.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
        })),
      };
    });

    return {
      submissionId: result.quizSubmission.id,
      score,
      total,
      percentage: Math.round(percentage * 10) / 10,
      passed,
      moduleId,
      isLastModuleQuiz: result.isLastModuleQuiz,
      feedback,
      message: passed
        ? result.isLastModuleQuiz
          ? 'Congratulations! You have passed all module quizzes. You can now take the final assessment.'
          : 'Quiz submitted successfully. You passed!'
        : `Quiz submitted. You scored ${percentage.toFixed(1)}%. You need ${this.PASSING_THRESHOLD}% to pass.`,
    };
  }

  // ============================================
  // FINAL ASSESSMENT
  // ============================================

  /**
   * Get final assessment details for a course (without revealing correct answers)
   */
  async getFinalAssessmentDetails(
    userId: string,
    courseId: string,
  ): Promise<FinalAssessmentDetailsDto> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        finalAssessment: {
          include: {
            questions: {
              include: {
                options: {
                  select: {
                    id: true,
                    text: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new CourseNotFoundException(courseId);
    }

    // Verify enrollment
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw new EnrollmentNotFoundException(userId, courseId);
    }

    // Verify all module quizzes are completed
    await this.verifyAllModuleQuizzesCompleted(userId, courseId);

    if (!course.finalAssessment) {
      throw new FinalAssessmentNotFoundException(courseId);
    }

    return {
      id: course.finalAssessment.id,
      courseId: course.id,
      courseTitle: course.title,
      questions: course.finalAssessment.questions,
    };
  }

  /**
   * Submit final assessment answers and calculate score
   * Marks course as completed if score >= 80%
   */
  async submitFinalAssessment(
    userId: string,
    courseId: string,
    submitQuizDto: SubmitQuizDto,
  ): Promise<FinalAssessmentSubmissionResultDto> {
    const { answers } = submitQuizDto;

    // Verify all module quizzes are completed
    await this.verifyAllModuleQuizzesCompleted(userId, courseId);

    // Get course with final assessment
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        finalAssessment: {
          include: {
            questions: {
              include: {
                options: {
                  select: {
                    id: true,
                    text: true,
                    isCorrect: true,
                    questionId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new CourseNotFoundException(courseId);
    }

    if (!course.finalAssessment) {
      throw new FinalAssessmentNotFoundException(courseId);
    }

    // Verify enrollment
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!enrollment) {
      throw new EnrollmentNotFoundException(userId, courseId);
    }

    const quiz = course.finalAssessment;

    // Build a map of question -> all correct option IDs (for final assessment)
    const correctAnswersMap = new Map<string, Set<string>>();
    quiz.questions.forEach(
      (question: {
        id: string;
        text: string;
        options: Array<{ id: string; text: string; isCorrect: boolean }>;
      }) => {
        const correctOptionIds = new Set(
          question.options.filter((opt) => opt.isCorrect).map((opt) => opt.id),
        );
        correctAnswersMap.set(question.id, correctOptionIds);
      },
    );

    // Validate that all questions have been answered
    const allQuestionIds = new Set(
      quiz.questions.map((q: { id: string }) => q.id),
    );
    const answeredQuestionIds = new Set(answers.map((a) => a.questionId));

    if (allQuestionIds.size !== answeredQuestionIds.size) {
      throw new InvalidQuizAnswersException(
        'You must answer all questions before submitting',
      );
    }

    // Check for duplicate answers
    if (answeredQuestionIds.size !== answers.length) {
      throw new InvalidQuizAnswersException(
        'Duplicate answers detected. Each question should be answered only once',
      );
    }

    // Validate that all question IDs are valid
    for (const answer of answers) {
      if (!allQuestionIds.has(answer.questionId)) {
        throw new InvalidQuizAnswersException(
          `Invalid question ID: ${answer.questionId}`,
        );
      }
    }

    // Calculate score for final assessment
    let score = 0;
    answers.forEach((answer) => {
      const correctOptionIds = correctAnswersMap.get(answer.questionId);
      if (!correctOptionIds) return;

      // Convert student's answer to a Set for comparison
      const studentAnswerSet = new Set(answer.optionIds);

      // Question is correct only if student selected exactly all correct options
      // (no more, no less)
      const isCorrect =
        studentAnswerSet.size === correctOptionIds.size &&
        [...studentAnswerSet].every((id) => correctOptionIds.has(id));

      if (isCorrect) {
        score++;
      }
    });

    const total = quiz.questions.length;
    const percentage = (score / total) * 100;
    const passed = percentage >= this.PASSING_THRESHOLD;

    // Use transaction to save submission and mark course complete if passed
    const result = await this.prisma.$transaction(async (tx) => {
      // Create quiz submission
      const quizSubmission = await tx.quizSubmission.create({
        data: {
          userId,
          quizId: quiz.id,
          score,
          userAnswers: {
            create: answers.flatMap((answer) =>
              answer.optionIds.map((optionId) => ({
                questionId: answer.questionId,
                optionId: optionId,
              })),
            ),
          },
        },
      });

      let certificateId: string | null = null;
      let courseCompleted = false;

      // If passed, save final assessment completion
      if (passed) {
        await tx.finalAssessmentCompletion.upsert({
          where: {
            userId_courseId: {
              userId,
              courseId,
            },
          },
          create: {
            userId,
            courseId,
            score,
            percentage,
            passed: true,
            completedAt: new Date(),
          },
          update: {
            score,
            percentage,
            passed: true,
            completedAt: new Date(),
          },
        });

        // Mark course as completed
        await tx.enrollment.update({
          where: {
            userId_courseId: {
              userId,
              courseId,
            },
          },
          data: {
            status: Status.Completed,
          },
        });

        courseCompleted = true;

        // Generate certificate
        const certificate = await this.generateCertificateInternal(
          userId,
          courseId,
          tx,
        );
        certificateId = certificate?.id || null;
      }

      return {
        quizSubmission,
        certificateId,
        courseCompleted,
      };
    });

    // Generate detailed feedback for each question
    const feedback = quiz.questions.map((question) => {
      const correctOptionIds = correctAnswersMap.get(question.id) || new Set();
      const studentAnswer = answers.find((a) => a.questionId === question.id);
      const studentAnswerSet = new Set(studentAnswer?.optionIds || []);

      const isCorrect =
        studentAnswerSet.size === correctOptionIds.size &&
        [...studentAnswerSet].every((id) => correctOptionIds.has(id));

      return {
        questionId: question.id,
        questionText: question.text,
        isCorrect,
        studentAnswers: studentAnswer?.optionIds || [],
        correctAnswers: [...correctOptionIds],
        options: question.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
        })),
      };
    });

    return {
      submissionId: result.quizSubmission.id,
      score,
      total,
      percentage: Math.round(percentage * 10) / 10,
      passed,
      courseId,
      courseCompleted: result.courseCompleted,
      certificateId: result.certificateId,
      feedback,
      message: passed
        ? 'Congratulations! You have completed the course and your certificate is ready.'
        : `Final assessment submitted. You scored ${percentage.toFixed(1)}%. You need ${this.PASSING_THRESHOLD}% to pass and complete the course.`,
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Verify that all module quizzes have been completed with passing score
   */
  private async verifyAllModuleQuizzesCompleted(
    userId: string,
    courseId: string,
  ): Promise<void> {
    // Get all modules with quizzes
    const modulesWithQuizzes = await this.prisma.module.findMany({
      where: {
        courseId,
        quiz: {
          isNot: null,
        },
      },
      select: {
        id: true,
        title: true,
      },
    });

    // Get all passed module quiz completions
    const passedModuleQuizzes = await this.prisma.moduleQuizCompletion.findMany(
      {
        where: {
          userId,
          passed: true,
          module: {
            courseId,
          },
        },
        select: {
          moduleId: true,
        },
      },
    );

    const passedModuleIds = new Set(
      passedModuleQuizzes.map((completion) => completion.moduleId),
    );

    // Check if all modules with quizzes have been passed
    const unpassedModules = modulesWithQuizzes.filter(
      (module) => !passedModuleIds.has(module.id),
    );

    if (unpassedModules.length > 0) {
      const moduleNames = unpassedModules.map((m) => m.title).join(', ');
      throw new CertificateNotEligibleException(
        `You must pass all module quizzes before accessing the final assessment. Remaining modules: ${moduleNames}`,
      );
    }
  }

  /**
   * Check if student is eligible for certificate
   */
  private async checkCertificateEligibility(
    userId: string,
    courseId: string,
  ): Promise<void> {
    // Check all module quizzes passed
    await this.verifyAllModuleQuizzesCompleted(userId, courseId);

    // Check final assessment passed
    const finalAssessmentCompletion =
      await this.prisma.finalAssessmentCompletion.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId,
          },
        },
      });

    if (!finalAssessmentCompletion || !finalAssessmentCompletion.passed) {
      throw new FinalAssessmentNotPassedException();
    }
  }

  // ============================================
  // CERTIFICATES
  // ============================================

  /**
   * Generate a certificate for course completion
   * Internal method used by transaction
   */
  private async generateCertificateInternal(
    userId: string,
    courseId: string,
    tx: Prisma.TransactionClient,
  ): Promise<{ id: string } | null> {
    // Check if certificate already exists
    const existingCertificate = await tx.certificate.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingCertificate) {
      return existingCertificate; // Certificate already exists
    }

    // Create certificate with placeholder PDF URL
    // TODO: Integrate PDF generation service (puppeteer/pdf-lib)
    const certificate = await tx.certificate.create({
      data: {
        userId,
        courseId,
        pdfUrl: null, // Placeholder: Will be generated by PDF service in the future
      },
    });

    return certificate;
  }

  /**
   * Get all certificates for a student
   * Only returns certificates for courses where student has completed all requirements
   */
  async getMyCertificates(userId: string): Promise<CertificateDto[]> {
    const certificates = await this.prisma.certificate.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        issuedAt: 'desc',
      },
    });

    // Filter certificates to only include those that meet eligibility requirements
    const eligibleCertificates: CertificateDto[] = [];
    for (const certificate of certificates) {
      try {
        await this.checkCertificateEligibility(userId, certificate.courseId);
        eligibleCertificates.push(certificate);
      } catch {
        // Skip certificates that don't meet eligibility requirements
        continue;
      }
    }

    return eligibleCertificates;
  }

  /**
   * Get a specific certificate for download
   * Only accessible if student has completed all module quizzes and final assessment
   */
  async getCertificateForDownload(
    userId: string,
    certificateId: string,
  ): Promise<CertificateDto> {
    const certificate = await this.prisma.certificate.findFirst({
      where: {
        id: certificateId,
        userId,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!certificate) {
      throw new CertificateNotFoundException(certificateId, userId);
    }

    // Check certificate eligibility
    await this.checkCertificateEligibility(userId, certificate.courseId);

    return certificate;
  }

  // ============================================
  // BROWSE COURSES
  // ============================================

  /**
   * Get all published courses for browsing
   * Available to students for course discovery and enrollment
   */
  async getPublishedCourses(
    filterDto: BrowseCoursesFilterDto,
  ): Promise<PaginatedResult<any>> {
    const { page = 1, limit = 10, search, category } = filterDto;

    const skip = (page - 1) * limit;

    const where: any = {
      isPublished: true, // Only show published courses
    };

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
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          instructor: {
            name: {
              contains: search,
              mode: 'insensitive',
            },
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

    // Filter by category
    if (category) {
      where.category = {
        name: {
          contains: category,
          mode: 'insensitive',
        },
      };
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
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          modules: {
            include: {
              lessons: {
                select: {
                  completionTime: true,
                },
              },
            },
          },
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

    // Compute completionTime dynamically from lessons
    const coursesWithComputedTime = courses.map((course) => {
      const computedTime = course.modules.reduce(
        (courseSum, mod) =>
          courseSum +
          mod.lessons.reduce(
            (modSum, lesson) => modSum + (lesson.completionTime || 0),
            0,
          ),
        0,
      );
      // Remove modules from output (not needed for browse), keep computed time
      const { modules, ...courseWithoutModules } = course;
      return {
        ...courseWithoutModules,
        completionTime: computedTime || course.completionTime,
      };
    });

    return createPaginatedResult(coursesWithComputedTime, total, page, limit);
  }
}
