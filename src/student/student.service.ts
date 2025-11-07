import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma';
import { PaginatedFilterDto } from './dto/paginated-filter.dto';
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
    // Get total enrolled courses
    const totalEnrolled = await this.prisma.enrollment.count({
      where: { userId },
    });

    // Get total completed courses
    const totalCompleted = await this.prisma.enrollment.count({
      where: {
        userId,
        status: Status.Completed,
      },
    });

    // Calculate total study time for last 7 days
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
    const totalStudyTime = totalStudyTimeSeconds / 3600; // Convert to hours

    // Calculate average completion percentage
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
    if (enrollments.length > 0) {
      const progressPercentages = await Promise.all(
        enrollments.map(async (enrollment) => {
          const courseId = enrollment.course.id;

          // Count total lessons in the course
          const totalLessons = await this.prisma.lesson.count({
            where: {
              module: {
                courseId,
              },
            },
          });

          if (totalLessons === 0) return 0;

          // Count completed lessons for this user
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

          return (completedLessons / totalLessons) * 100;
        }),
      );

      avgCompletion =
        progressPercentages.reduce<number>((sum, pct) => sum + pct, 0) /
        progressPercentages.length;
    }

    return {
      totalEnrolled,
      totalCompleted,
      avgCompletion: Math.round(avgCompletion * 10) / 10, // Round to 1 decimal
      totalStudyTime: Math.round(totalStudyTime * 10) / 10, // Round to 1 decimal
    };
  }

  // ============================================
  // ENROLLMENTS
  // ============================================

  /**
   * Get all enrollments for a student with progress percentage
   * Supports pagination and search
   */
  async getMyEnrollments(
    userId: string,
    filterDto: PaginatedFilterDto,
  ): Promise<PaginatedResult<EnrollmentWithProgressDto>> {
    const { page = 1, limit = 10, search } = filterDto;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = { userId };

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

    // Get total count
    const total = await this.prisma.enrollment.count({ where });

    // Get enrollments with course details
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

    // Calculate progress for each enrollment
    const enrollmentsWithProgress: EnrollmentWithProgressDto[] =
      await Promise.all(
        enrollments.map(async (enrollment) => {
          const courseId = enrollment.course.id;

          // Count total lessons
          const totalLessons = await this.prisma.lesson.count({
            where: {
              module: {
                courseId,
              },
            },
          });

          // Count completed lessons
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

    return createPaginatedResult(enrollmentsWithProgress, total, page, limit);
  }

  /**
   * Get detailed course information with progress for enrolled student
   */
  async getCourseDetails(
    userId: string,
    courseId: string,
  ): Promise<CourseDetailsDto> {
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

    // Get course with all modules and lessons
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

    // Get all user progress for this course
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

    // Create a Set of completed lesson IDs for fast lookup
    const completedLessonIds = new Set(
      userProgressList.map((progress) => progress.lessonId),
    );

    // Transform modules and lessons with progress
    let totalLessons = 0;
    let completedLessons = 0;

    const modulesWithProgress = course.modules.map((module) => {
      // Calculate total module time
      const totalModuleTime = module.lessons.reduce<number>(
        (sum, lesson) => sum + (lesson.completionTime || 0),
        0,
      );

      // Transform lessons with completion status
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

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      imageUrl: course.imageUrl,
      price: course.price,
      isPublished: course.isPublished,
      completionTime: course.completionTime,
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
    // Find the lesson and its course
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

    // Find the enrollment
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

    // Use a transaction to ensure atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      // Update enrollment status from NotStarted to InProgress if needed
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

      // Create or update user progress
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

      // Check if all lessons are completed
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

      // If all lessons completed, mark course as completed and generate certificate
      if (totalLessons === completedLessons && totalLessons > 0) {
        updatedEnrollment = await tx.enrollment.update({
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

        // Generate certificate if not exists
        await this.generateCertificateInternal(userId, courseId, tx);
      }

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
      message:
        result.enrollment.status === Status.Completed
          ? 'Congratulations! You have completed the course. Your certificate is ready.'
          : 'Lesson marked as completed',
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
    // Verify module exists
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

    // Verify enrollment
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

    // Get quiz with questions and options (but not the isCorrect field)
    const quiz = await this.prisma.quiz.findUnique({
      where: { moduleId },
      include: {
        questions: {
          include: {
            options: {
              select: {
                id: true,
                text: true,
                // Explicitly exclude isCorrect to prevent cheating
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

    // Get quiz with correct answers
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
              where: {
                isCorrect: true,
              },
              select: {
                id: true,
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

    // Create a map of correct answers: questionId -> correctOptionId
    const correctAnswersMap = new Map<string, string>();
    quiz.questions.forEach(
      (question: { id: string; options: Array<{ id: string }> }) => {
        const correctOption = question.options[0]; // There should be exactly one correct option
        if (correctOption) {
          correctAnswersMap.set(question.id, correctOption.id);
        }
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
      const correctOptionId = correctAnswersMap.get(answer.questionId);
      if (correctOptionId === answer.optionId) {
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
            create: answers.map((answer) => ({
              questionId: answer.questionId,
              optionId: answer.optionId,
            })),
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

    return {
      submissionId: result.quizSubmission.id,
      score,
      total,
      percentage: Math.round(percentage * 10) / 10,
      passed,
      moduleId,
      isLastModuleQuiz: result.isLastModuleQuiz,
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
    // Verify course exists
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
                    // Explicitly exclude isCorrect to prevent cheating
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
                  where: {
                    isCorrect: true,
                  },
                  select: {
                    id: true,
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

    // Create a map of correct answers: questionId -> correctOptionId
    const correctAnswersMap = new Map<string, string>();
    quiz.questions.forEach(
      (question: { id: string; options: Array<{ id: string }> }) => {
        const correctOption = question.options[0];
        if (correctOption) {
          correctAnswersMap.set(question.id, correctOption.id);
        }
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
      const correctOptionId = correctAnswersMap.get(answer.questionId);
      if (correctOptionId === answer.optionId) {
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
            create: answers.map((answer) => ({
              questionId: answer.questionId,
              optionId: answer.optionId,
            })),
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

    return {
      submissionId: result.quizSubmission.id,
      score,
      total,
      percentage: Math.round(percentage * 10) / 10,
      passed,
      courseId,
      courseCompleted: result.courseCompleted,
      certificateId: result.certificateId,
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call
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
}
