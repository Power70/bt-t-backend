import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { StudentService } from './student.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../generated/prisma';
import { PaginatedFilterDto } from './dto/paginated-filter.dto';
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

@ApiTags('Student')
@Controller('student')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@ApiBearerAuth()
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  // ============================================
  // DASHBOARD ENDPOINTS
  // ============================================

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get dashboard summary',
    description:
      'Returns enrollment statistics and total study time for the last 7 days for the authenticated student.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary retrieved successfully',
    type: DashboardSummaryDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User is not a student',
  })
  async getDashboardSummary(@Request() req: any): Promise<DashboardSummaryDto> {
    const userId = (req.user?.sub ?? req.user?.id) as string;
    return this.studentService.getDashboardSummary(userId);
  }

  // ============================================
  // ENROLLMENT ENDPOINTS
  // ============================================

  @Get('enrollments')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get my enrollments',
    description:
      'Returns a paginated list of all courses the student is enrolled in, with progress percentage for each course. Supports search by course title or description, and filtering by enrollment status (NotStarted, InProgress, Completed).',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollments retrieved successfully',
    type: [EnrollmentWithProgressDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User is not a student',
  })
  async getMyEnrollments(
    @Request() req: any,
    @Query() filterDto: PaginatedFilterDto,
  ) {
    const userId = (req.user?.sub ?? req.user?.id) as string;
    return this.studentService.getMyEnrollments(userId, filterDto);
  }

  @Get('courses/:courseId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get course details',
    description:
      'Returns detailed information about a specific course, including all modules, lessons, and progress status. Only accessible if the student is enrolled in the course.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'ID of the course',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Course details retrieved successfully',
    type: CourseDetailsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User is not a student',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Course not found or user not enrolled',
  })
  async getCourseDetails(
    @Request() req: any,
    @Param('courseId') courseId: string,
  ): Promise<CourseDetailsDto> {
    const userId = (req.user?.sub ?? req.user?.id) as string;
    return this.studentService.getCourseDetails(userId, courseId);
  }

  // ============================================
  // PROGRESS ENDPOINTS
  // ============================================

  @Post('progress/lessons/:lessonId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark lesson as completed',
    description:
      'Marks a lesson as completed for the authenticated student. Updates enrollment status from NotStarted to InProgress on first lesson completion. Automatically generates a certificate when all lessons are completed.',
  })
  @ApiParam({
    name: 'lessonId',
    description: 'ID of the lesson to mark as complete',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson marked as completed successfully',
    type: LessonCompletionResultDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User is not a student',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Lesson not found or user not enrolled in course',
  })
  async markLessonCompleted(
    @Request() req: any,
    @Param('lessonId') lessonId: string,
  ): Promise<LessonCompletionResultDto> {
    const userId = (req.user?.sub ?? req.user?.id) as string;
    return this.studentService.markLessonCompleted(userId, lessonId);
  }

  @Post('progress/activity')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log study activity',
    description:
      'Logs the time spent by a student studying a specific lesson. Used for tracking study time and analytics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity logged successfully',
    type: ActivityLogResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User is not a student',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Lesson not found',
  })
  async logActivity(
    @Request() req: any,
    @Body() logActivityDto: LogActivityDto,
  ): Promise<ActivityLogResultDto> {
    const userId = (req.user?.sub ?? req.user?.id) as string;
    return this.studentService.logActivity(userId, logActivityDto);
  }

  // ============================================
  // MODULE QUIZ ENDPOINTS
  // ============================================

  @Get('quizzes/module/:moduleId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get module quiz details',
    description:
      'Returns quiz questions and options for a specific module. Correct answers are not included to prevent cheating. Only accessible if the student is enrolled in the course.',
  })
  @ApiParam({
    name: 'moduleId',
    description: 'ID of the module containing the quiz',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Module quiz details retrieved successfully',
    type: ModuleQuizDetailsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User is not a student',
  })
  @ApiResponse({
    status: 404,
    description:
      'Not found - Module not found, quiz not found, or user not enrolled',
  })
  async getModuleQuizDetails(
    @Request() req: any,
    @Param('moduleId') moduleId: string,
  ): Promise<ModuleQuizDetailsDto> {
    const userId = (req.user?.sub ?? req.user?.id) as string;
    return this.studentService.getModuleQuizDetails(userId, moduleId);
  }

  @Post('quizzes/module/:quizId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit module quiz answers',
    description:
      'Submits answers for a module quiz and calculates the score. Records quiz completion if the score is 80% or higher. Students must pass all module quizzes before accessing the final assessment.',
  })
  @ApiParam({
    name: 'quizId',
    description: 'ID of the module quiz being submitted',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Module quiz submitted successfully',
    type: ModuleQuizSubmissionResultDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Invalid answers, missing questions, or duplicate answers',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User is not a student',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Quiz not found or user not enrolled',
  })
  async submitModuleQuiz(
    @Request() req: any,
    @Param('quizId') quizId: string,
    @Body() submitQuizDto: SubmitQuizDto,
  ): Promise<ModuleQuizSubmissionResultDto> {
    const userId = (req.user?.sub ?? req.user?.id) as string;
    return this.studentService.submitModuleQuiz(userId, quizId, submitQuizDto);
  }

  // ============================================
  // FINAL ASSESSMENT ENDPOINTS
  // ============================================

  @Get('courses/:courseId/final-assessment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get final assessment details',
    description:
      'Returns final assessment questions and options for a course. Correct answers are not included to prevent cheating. Only accessible if the student has passed all module quizzes and is enrolled in the course.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'ID of the course',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Final assessment details retrieved successfully',
    type: FinalAssessmentDetailsDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Module quizzes not completed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User is not a student',
  })
  @ApiResponse({
    status: 404,
    description:
      'Not found - Course not found, final assessment not found, or user not enrolled',
  })
  async getFinalAssessmentDetails(
    @Request() req: any,
    @Param('courseId') courseId: string,
  ): Promise<FinalAssessmentDetailsDto> {
    const userId = (req.user?.sub ?? req.user?.id) as string;
    return this.studentService.getFinalAssessmentDetails(userId, courseId);
  }

  @Post('courses/:courseId/final-assessment/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit final assessment answers',
    description:
      'Submits answers for the final assessment and calculates the score. Marks the course as completed and generates a certificate if the score is 80% or higher. Students must pass all module quizzes before submitting the final assessment.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'ID of the course',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Final assessment submitted successfully',
    type: FinalAssessmentSubmissionResultDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Invalid answers, missing questions, duplicate answers, or module quizzes not completed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User is not a student',
  })
  @ApiResponse({
    status: 404,
    description:
      'Not found - Course not found, final assessment not found, or user not enrolled',
  })
  async submitFinalAssessment(
    @Request() req: any,
    @Param('courseId') courseId: string,
    @Body() submitQuizDto: SubmitQuizDto,
  ): Promise<FinalAssessmentSubmissionResultDto> {
    const userId = (req.user?.sub ?? req.user?.id) as string;
    return this.studentService.submitFinalAssessment(
      userId,
      courseId,
      submitQuizDto,
    );
  }

  // ============================================
  // CERTIFICATE ENDPOINTS
  // ============================================

  @Get('certificates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get my certificates',
    description:
      'Returns all certificates earned by the authenticated student, ordered by issue date (most recent first).',
  })
  @ApiResponse({
    status: 200,
    description: 'Certificates retrieved successfully',
    type: [CertificateDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User is not a student',
  })
  async getMyCertificates(@Request() req: any): Promise<CertificateDto[]> {
    const userId = (req.user?.sub ?? req.user?.id) as string;
    return this.studentService.getMyCertificates(userId);
  }

  @Get('certificates/:certificateId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get certificate for download',
    description:
      'Returns a specific certificate for download. Only accessible by the student who owns the certificate.',
  })
  @ApiParam({
    name: 'certificateId',
    description: 'ID of the certificate',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Certificate retrieved successfully',
    type: CertificateDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User is not a student',
  })
  @ApiResponse({
    status: 404,
    description:
      'Not found - Certificate not found or does not belong to the user',
  })
  async getCertificateForDownload(
    @Request() req: any,
    @Param('certificateId') certificateId: string,
  ): Promise<CertificateDto> {
    const userId = (req.user?.sub ?? req.user?.id) as string;
    return this.studentService.getCertificateForDownload(userId, certificateId);
  }
}
