import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { InstructorService } from './instructor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../generated/prisma';
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

@ApiTags('Instructor')
@Controller('instructor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
@ApiBearerAuth()
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  private getUserId(req: any): string {
    return (req.user?.sub ?? req.user?.id) as string;
  }

  // ============================================
  // DASHBOARD
  // ============================================

  @Get('dashboard')
  @ApiOperation({ summary: 'Get instructor dashboard overview' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved' })
  async getDashboard(@Request() req: any) {
    return this.instructorService.getDashboardOverview(this.getUserId(req));
  }

  // ============================================
  // PROFILE
  // ============================================

  @Get('profile')
  @ApiOperation({ summary: 'Get instructor profile with stats' })
  @ApiResponse({ status: 200, description: 'Profile retrieved' })
  async getProfile(@Request() req: any) {
    return this.instructorService.getProfile(this.getUserId(req));
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update instructor profile (name and/or password)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async updateProfile(
    @Request() req: any,
    @Body() dto: UpdateInstructorProfileDto,
  ) {
    return this.instructorService.updateProfile(this.getUserId(req), dto);
  }

  // ============================================
  // CATEGORIES (Read-only)
  // ============================================

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved' })
  async getCategories() {
    return this.instructorService.getCategories();
  }

  // ============================================
  // COURSE MANAGEMENT
  // ============================================

  @Post('courses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new course' })
  @ApiResponse({ status: 201, description: 'Course created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createCourse(
    @Request() req: any,
    @Body() dto: CreateInstructorCourseDto,
  ) {
    return this.instructorService.createCourse(this.getUserId(req), dto);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Get my courses' })
  @ApiResponse({ status: 200, description: 'Courses retrieved' })
  async getMyCourses(
    @Request() req: any,
    @Query() filterDto: InstructorCourseFilterDto,
  ) {
    return this.instructorService.getMyCourses(this.getUserId(req), filterDto);
  }

  @Get('courses/:id')
  @ApiOperation({ summary: 'Get course by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Course retrieved' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 403, description: 'Not your course' })
  async getCourseById(@Request() req: any, @Param('id') id: string) {
    return this.instructorService.getCourseById(this.getUserId(req), id);
  }

  @Get('courses/:id/preview')
  @ApiOperation({ summary: 'Preview course as student would see it' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Course preview' })
  async previewCourse(@Request() req: any, @Param('id') id: string) {
    return this.instructorService.previewCourse(this.getUserId(req), id);
  }

  @Patch('courses/:id')
  @ApiOperation({ summary: 'Update a course' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Course updated' })
  async updateCourse(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateInstructorCourseDto,
  ) {
    return this.instructorService.updateCourse(this.getUserId(req), id, dto);
  }

  @Delete('courses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a course' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Course deleted' })
  async deleteCourse(@Request() req: any, @Param('id') id: string) {
    return this.instructorService.deleteCourse(this.getUserId(req), id);
  }

  @Patch('courses/:id/publish')
  @ApiOperation({ summary: 'Toggle course publish status' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Publish status toggled' })
  async togglePublish(@Request() req: any, @Param('id') id: string) {
    return this.instructorService.toggleCoursePublish(this.getUserId(req), id);
  }

  @Post('courses/:id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Duplicate a course (deep clone)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 201, description: 'Course duplicated' })
  async duplicateCourse(@Request() req: any, @Param('id') id: string) {
    return this.instructorService.duplicateCourse(this.getUserId(req), id);
  }

  // ============================================
  // MODULE MANAGEMENT
  // ============================================

  @Post('courses/:courseId/modules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a module' })
  @ApiParam({ name: 'courseId', type: String })
  @ApiResponse({ status: 201, description: 'Module created' })
  async createModule(
    @Request() req: any,
    @Param('courseId') courseId: string,
    @Body() dto: CreateInstructorModuleDto,
  ) {
    return this.instructorService.createModule(
      this.getUserId(req),
      courseId,
      dto,
    );
  }

  @Get('courses/:courseId/modules')
  @ApiOperation({ summary: 'Get modules for a course' })
  @ApiParam({ name: 'courseId', type: String })
  @ApiResponse({ status: 200, description: 'Modules retrieved' })
  async getModules(@Request() req: any, @Param('courseId') courseId: string) {
    return this.instructorService.getModulesByCourse(
      this.getUserId(req),
      courseId,
    );
  }

  @Get('modules/:id')
  @ApiOperation({ summary: 'Get module by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Module retrieved' })
  async getModuleById(@Request() req: any, @Param('id') id: string) {
    return this.instructorService.getModuleById(this.getUserId(req), id);
  }

  @Patch('modules/:id')
  @ApiOperation({ summary: 'Update a module' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Module updated' })
  async updateModule(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateInstructorModuleDto,
  ) {
    return this.instructorService.updateModule(this.getUserId(req), id, dto);
  }

  @Delete('modules/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a module' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Module deleted' })
  async deleteModule(@Request() req: any, @Param('id') id: string) {
    return this.instructorService.deleteModule(this.getUserId(req), id);
  }

  @Patch('courses/:courseId/modules/reorder')
  @ApiOperation({ summary: 'Reorder modules' })
  @ApiParam({ name: 'courseId', type: String })
  @ApiResponse({ status: 200, description: 'Modules reordered' })
  async reorderModules(
    @Request() req: any,
    @Param('courseId') courseId: string,
    @Body() dto: ReorderInstructorModulesDto,
  ) {
    return this.instructorService.reorderModules(
      this.getUserId(req),
      courseId,
      dto,
    );
  }

  // ============================================
  // LESSON MANAGEMENT
  // ============================================

  @Post('modules/:moduleId/lessons')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a lesson' })
  @ApiParam({ name: 'moduleId', type: String })
  @ApiResponse({ status: 201, description: 'Lesson created' })
  async createLesson(
    @Request() req: any,
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateInstructorLessonDto,
  ) {
    return this.instructorService.createLesson(
      this.getUserId(req),
      moduleId,
      dto,
    );
  }

  @Get('modules/:moduleId/lessons')
  @ApiOperation({ summary: 'Get lessons for a module' })
  @ApiParam({ name: 'moduleId', type: String })
  @ApiResponse({ status: 200, description: 'Lessons retrieved' })
  async getLessons(@Request() req: any, @Param('moduleId') moduleId: string) {
    return this.instructorService.getLessonsByModule(
      this.getUserId(req),
      moduleId,
    );
  }

  @Get('lessons/:id')
  @ApiOperation({ summary: 'Get lesson by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Lesson retrieved' })
  async getLessonById(@Request() req: any, @Param('id') id: string) {
    return this.instructorService.getLessonById(this.getUserId(req), id);
  }

  @Patch('lessons/:id')
  @ApiOperation({ summary: 'Update a lesson' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Lesson updated' })
  async updateLesson(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateInstructorLessonDto,
  ) {
    return this.instructorService.updateLesson(this.getUserId(req), id, dto);
  }

  @Delete('lessons/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a lesson' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Lesson deleted' })
  async deleteLesson(@Request() req: any, @Param('id') id: string) {
    return this.instructorService.deleteLesson(this.getUserId(req), id);
  }

  @Patch('modules/:moduleId/lessons/reorder')
  @ApiOperation({ summary: 'Reorder lessons' })
  @ApiParam({ name: 'moduleId', type: String })
  @ApiResponse({ status: 200, description: 'Lessons reordered' })
  async reorderLessons(
    @Request() req: any,
    @Param('moduleId') moduleId: string,
    @Body() dto: ReorderInstructorLessonsDto,
  ) {
    return this.instructorService.reorderLessons(
      this.getUserId(req),
      moduleId,
      dto,
    );
  }

  // ============================================
  // QUIZ MANAGEMENT
  // ============================================

  @Post('modules/:moduleId/quiz')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or update module quiz' })
  @ApiParam({ name: 'moduleId', type: String })
  @ApiResponse({ status: 201, description: 'Quiz created/updated' })
  async createModuleQuiz(
    @Request() req: any,
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateInstructorQuizDto,
  ) {
    return this.instructorService.createQuiz(
      this.getUserId(req),
      'module',
      moduleId,
      dto,
    );
  }

  @Get('modules/:moduleId/quiz')
  @ApiOperation({ summary: 'Get module quiz' })
  @ApiParam({ name: 'moduleId', type: String })
  @ApiResponse({ status: 200, description: 'Quiz retrieved' })
  async getModuleQuiz(
    @Request() req: any,
    @Param('moduleId') moduleId: string,
  ) {
    return this.instructorService.getQuiz(
      this.getUserId(req),
      'module',
      moduleId,
    );
  }

  @Delete('quizzes/:quizId/module')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete module quiz' })
  @ApiParam({ name: 'quizId', type: String })
  @ApiResponse({ status: 200, description: 'Quiz deleted' })
  async deleteModuleQuiz(@Request() req: any, @Param('quizId') quizId: string) {
    return this.instructorService.deleteQuiz(
      this.getUserId(req),
      'module',
      quizId,
    );
  }

  @Post('courses/:courseId/final-assessment')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or update final assessment' })
  @ApiParam({ name: 'courseId', type: String })
  @ApiResponse({ status: 201, description: 'Final assessment created/updated' })
  async createFinalAssessment(
    @Request() req: any,
    @Param('courseId') courseId: string,
    @Body() dto: CreateInstructorQuizDto,
  ) {
    return this.instructorService.createQuiz(
      this.getUserId(req),
      'course',
      courseId,
      dto,
    );
  }

  @Get('courses/:courseId/final-assessment')
  @ApiOperation({ summary: 'Get final assessment' })
  @ApiParam({ name: 'courseId', type: String })
  @ApiResponse({ status: 200, description: 'Final assessment retrieved' })
  async getFinalAssessment(
    @Request() req: any,
    @Param('courseId') courseId: string,
  ) {
    return this.instructorService.getQuiz(
      this.getUserId(req),
      'course',
      courseId,
    );
  }

  @Delete('quizzes/:quizId/final-assessment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete final assessment' })
  @ApiParam({ name: 'quizId', type: String })
  @ApiResponse({ status: 200, description: 'Final assessment deleted' })
  async deleteFinalAssessment(
    @Request() req: any,
    @Param('quizId') quizId: string,
  ) {
    return this.instructorService.deleteQuiz(
      this.getUserId(req),
      'course',
      quizId,
    );
  }

  @Patch('questions/:questionId/text')
  @ApiOperation({ summary: 'Update question text' })
  @ApiParam({ name: 'questionId', type: String })
  @ApiResponse({ status: 200, description: 'Question text updated' })
  async updateQuestionText(
    @Request() req: any,
    @Param('questionId') questionId: string,
    @Body('text') text: string,
  ) {
    return this.instructorService.updateQuestionText(
      this.getUserId(req),
      questionId,
      text,
    );
  }

  @Patch('questions/:questionId/options')
  @ApiOperation({ summary: 'Update question options' })
  @ApiParam({ name: 'questionId', type: String })
  @ApiResponse({ status: 200, description: 'Question options updated' })
  async updateQuestionOptions(
    @Request() req: any,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateInstructorQuestionDto,
  ) {
    return this.instructorService.updateQuestionOptions(
      this.getUserId(req),
      questionId,
      dto,
    );
  }

  // ============================================
  // STUDENT MANAGEMENT
  // ============================================

  @Get('students')
  @ApiOperation({ summary: 'Get all enrolled students across courses' })
  @ApiResponse({ status: 200, description: 'Students retrieved' })
  async getStudents(
    @Request() req: any,
    @Query() filterDto: InstructorStudentFilterDto,
  ) {
    return this.instructorService.getEnrolledStudents(
      this.getUserId(req),
      filterDto,
    );
  }

  @Get('courses/:courseId/students')
  @ApiOperation({ summary: 'Get students enrolled in a specific course' })
  @ApiParam({ name: 'courseId', type: String })
  @ApiResponse({ status: 200, description: 'Students retrieved' })
  async getCourseStudents(
    @Request() req: any,
    @Param('courseId') courseId: string,
    @Query() filterDto: InstructorStudentFilterDto,
  ) {
    return this.instructorService.getCourseStudents(
      this.getUserId(req),
      courseId,
      filterDto,
    );
  }

  @Get('courses/:courseId/students/:userId/progress')
  @ApiOperation({ summary: 'Get detailed student progress for a course' })
  @ApiParam({ name: 'courseId', type: String })
  @ApiParam({ name: 'userId', type: String })
  @ApiResponse({ status: 200, description: 'Student progress retrieved' })
  async getStudentProgress(
    @Request() req: any,
    @Param('courseId') courseId: string,
    @Param('userId') userId: string,
  ) {
    return this.instructorService.getStudentProgress(
      this.getUserId(req),
      courseId,
      userId,
    );
  }

  // ============================================
  // REVENUE
  // ============================================

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue overview and analytics' })
  @ApiResponse({ status: 200, description: 'Revenue data retrieved' })
  async getRevenue(@Request() req: any) {
    return this.instructorService.getRevenueOverview(this.getUserId(req));
  }

  // ============================================
  // ANALYTICS
  // ============================================

  @Get('analytics')
  @ApiOperation({ summary: 'Get course analytics' })
  @ApiResponse({ status: 200, description: 'Analytics data retrieved' })
  async getAnalytics(@Request() req: any) {
    return this.instructorService.getCourseAnalytics(this.getUserId(req));
  }
}
