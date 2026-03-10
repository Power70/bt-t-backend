import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
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
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../generated/prisma';
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
import { CreateInvitationDto } from './dto/invitations/create-invitation.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ============================================
  // COURSE MANAGEMENT ENDPOINTS
  // ============================================

  @Post('courses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new course',
    description: 'Creates a new course with auto-generated slug from title.',
  })
  @ApiResponse({
    status: 201,
    description: 'Course created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Instructor or category not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not an admin',
  })
  async createCourse(@Body() createCourseDto: CreateCourseDto) {
    return this.adminService.createCourse(createCourseDto);
  }

  @Public()
  @Get('courses')
  @ApiOperation({
    summary: 'Get all courses',
    description: 'Retrieves all courses with filtering and pagination options.',
  })
  @ApiResponse({
    status: 200,
    description: 'Courses retrieved successfully',
  })
  async getCourses(@Query() filterDto: CourseFilterDto) {
    return this.adminService.getCourses(filterDto);
  }

  @Public()
  @Get('courses/:id')
  @ApiOperation({
    summary: 'Get a single course',
    description:
      'Retrieves a single course by ID with all modules and lessons.',
  })
  @ApiParam({
    name: 'id',
    description: 'Course ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Course retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async getCourseById(@Param('id') id: string) {
    return this.adminService.getCourseById(id);
  }

  @Patch('courses/:id')
  @ApiOperation({
    summary: 'Update a course',
    description:
      'Updates a course. If title is changed, slug is automatically regenerated.',
  })
  @ApiParam({
    name: 'id',
    description: 'Course ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Course updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async updateCourse(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.adminService.updateCourse(id, updateCourseDto);
  }

  @Delete('courses/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a course',
    description:
      'Deletes a course and all related modules, lessons, and enrollments (cascade).',
  })
  @ApiParam({
    name: 'id',
    description: 'Course ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Course deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async deleteCourse(@Param('id') id: string) {
    return this.adminService.deleteCourse(id);
  }

  @Patch('courses/:id/publish')
  @ApiOperation({
    summary: 'Toggle course publish status',
    description:
      'Toggles the published status of a course (true becomes false, false becomes true).',
  })
  @ApiParam({
    name: 'id',
    description: 'Course ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Course publish status toggled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async toggleCoursePublish(@Param('id') id: string) {
    return this.adminService.toggleCoursePublish(id);
  }

  // ============================================
  // MODULE MANAGEMENT ENDPOINTS
  // ============================================

  @Post('courses/:courseId/modules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a module for a course',
    description:
      'Creates a new module for a specific course. Order is auto-calculated if not provided.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'Module created successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async createModule(
    @Param('courseId') courseId: string,
    @Body() createModuleDto: CreateModuleDto,
  ) {
    return this.adminService.createModule(courseId, createModuleDto);
  }

  @Get('courses/:courseId/modules')
  @ApiOperation({
    summary: 'Get all modules for a course',
    description:
      'Retrieves all modules for a specific course, ordered by order field.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Modules retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async getModulesByCourse(@Param('courseId') courseId: string) {
    return this.adminService.getModulesByCourse(courseId);
  }

  @Get('modules/:id')
  @ApiOperation({
    summary: 'Get a single module',
    description: 'Retrieves a single module by ID with all lessons.',
  })
  @ApiParam({
    name: 'id',
    description: 'Module ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Module retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Module not found',
  })
  async getModuleById(@Param('id') id: string) {
    return this.adminService.getModuleById(id);
  }

  @Patch('modules/:id')
  @ApiOperation({
    summary: 'Update a module',
    description: "Updates a module's details.",
  })
  @ApiParam({
    name: 'id',
    description: 'Module ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Module updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Module not found',
  })
  async updateModule(
    @Param('id') id: string,
    @Body() updateModuleDto: UpdateModuleDto,
  ) {
    return this.adminService.updateModule(id, updateModuleDto);
  }

  @Delete('modules/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a module',
    description: 'Deletes a module and all related lessons (cascade).',
  })
  @ApiParam({
    name: 'id',
    description: 'Module ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Module deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Module not found',
  })
  async deleteModule(@Param('id') id: string) {
    return this.adminService.deleteModule(id);
  }

  @Put('courses/:courseId/modules/reorder')
  @ApiOperation({
    summary: 'Reorder modules',
    description: 'Reorders modules within a course using a transaction.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Modules reordered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Some modules do not belong to this course',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async reorderModules(
    @Param('courseId') courseId: string,
    @Body() reorderDto: ReorderModulesDto,
  ) {
    return this.adminService.reorderModules(courseId, reorderDto);
  }

  // ============================================
  // LESSON MANAGEMENT ENDPOINTS
  // ============================================

  @Post('modules/:moduleId/lessons')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a lesson for a module',
    description:
      'Creates a new lesson for a specific module. Order is auto-calculated if not provided. Content/videoUrl are validated based on type.',
  })
  @ApiParam({
    name: 'moduleId',
    description: 'Module ID',
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'Lesson created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid content for lesson type',
  })
  @ApiResponse({
    status: 404,
    description: 'Module not found',
  })
  async createLesson(
    @Param('moduleId') moduleId: string,
    @Body() createLessonDto: CreateLessonDto,
  ) {
    return this.adminService.createLesson(moduleId, createLessonDto);
  }

  @Get('modules/:moduleId/lessons')
  @ApiOperation({
    summary: 'Get all lessons for a module',
    description:
      'Retrieves all lessons for a specific module, ordered by order field.',
  })
  @ApiParam({
    name: 'moduleId',
    description: 'Module ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Lessons retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Module not found',
  })
  async getLessonsByModule(@Param('moduleId') moduleId: string) {
    return this.adminService.getLessonsByModule(moduleId);
  }

  @Get('lessons/:id')
  @ApiOperation({
    summary: 'Get a single lesson',
    description: 'Retrieves a single lesson by ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Lesson ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Lesson not found',
  })
  async getLessonById(@Param('id') id: string) {
    return this.adminService.getLessonById(id);
  }

  @Patch('lessons/:id')
  @ApiOperation({
    summary: 'Update a lesson',
    description:
      'Updates a lesson. If type changes, content/videoUrl are automatically adjusted.',
  })
  @ApiParam({
    name: 'id',
    description: 'Lesson ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Lesson not found',
  })
  async updateLesson(
    @Param('id') id: string,
    @Body() updateLessonDto: UpdateLessonDto,
  ) {
    return this.adminService.updateLesson(id, updateLessonDto);
  }

  @Delete('lessons/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a lesson',
    description: 'Deletes a lesson and all related user progress records.',
  })
  @ApiParam({
    name: 'id',
    description: 'Lesson ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Lesson deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Lesson not found',
  })
  async deleteLesson(@Param('id') id: string) {
    return this.adminService.deleteLesson(id);
  }

  @Put('modules/:moduleId/lessons/reorder')
  @ApiOperation({
    summary: 'Reorder lessons',
    description: 'Reorders lessons within a module using a transaction.',
  })
  @ApiParam({
    name: 'moduleId',
    description: 'Module ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Lessons reordered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Some lessons do not belong to this module',
  })
  @ApiResponse({
    status: 404,
    description: 'Module not found',
  })
  async reorderLessons(
    @Param('moduleId') moduleId: string,
    @Body() reorderDto: ReorderLessonsDto,
  ) {
    return this.adminService.reorderLessons(moduleId, reorderDto);
  }

  // ============================================
  // PROGRESS MONITORING ENDPOINTS (Read-Only)
  // ============================================

  @Get('courses/:courseId/progress')
  @ApiOperation({
    summary: 'Get course progress summary',
    description:
      'Retrieves an aggregate progress summary for a course, including all enrolled users and their completion percentages.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Progress summary retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found',
  })
  async getCourseProgressSummary(@Param('courseId') courseId: string) {
    return this.adminService.getCourseProgressSummary(courseId);
  }

  @Get('courses/:courseId/progress/users/:userId')
  @ApiOperation({
    summary: 'Get user progress in a course',
    description:
      'Retrieves detailed progress breakdown for a specific user in a specific course.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'Course ID',
    type: String,
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'User progress retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - User not enrolled in course',
  })
  @ApiResponse({
    status: 404,
    description: 'User or course not found',
  })
  async getUserCourseProgress(
    @Param('userId') userId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.adminService.getUserCourseProgress(userId, courseId);
  }

  @Get('progress/overview')
  @ApiOperation({
    summary: 'Get progress overview',
    description:
      'Retrieves an overview of progress across all courses, including total courses, students, enrollments, and average progress per course.',
  })
  @ApiResponse({
    status: 200,
    description: 'Overview retrieved successfully',
  })
  async getProgressOverview() {
    return this.adminService.getProgressOverview();
  }

  // ============================================
  // CATEGORY MANAGEMENT ENDPOINTS
  // ============================================

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a category',
    description: 'Creates a new category.',
  })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Category with this name already exists',
  })
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.adminService.createCategory(createCategoryDto);
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Get all categories',
    description: 'Retrieves all categories with course counts.',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  async getCategories() {
    return this.adminService.getCategories();
  }

  @Patch('categories/:id')
  @ApiOperation({
    summary: 'Update a category',
    description: 'Updates a category.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Category name already exists',
  })
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.adminService.updateCategory(id, updateCategoryDto);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a category',
    description: 'Deletes a category (only if no courses are associated).',
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Category has associated courses',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  async deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(id);
  }

  // ============================================
  // INSTRUCTOR INVITATION ENDPOINTS
  // ============================================

  @Post('invitations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an instructor invitation',
    description:
      'Generates an invitation link and sends it to the specified email. The link expires in 72 hours.',
  })
  @ApiResponse({
    status: 201,
    description: 'Invitation sent successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - User already exists or active invitation exists',
  })
  async createInvitation(@Body() createInvitationDto: CreateInvitationDto) {
    return this.adminService.createInvitation(createInvitationDto.email);
  }

  @Get('invitations')
  @ApiOperation({
    summary: 'Get all invitations',
    description:
      'Retrieves all instructor invitations with pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Invitations retrieved successfully',
  })
  async getInvitations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getInvitations(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Delete('invitations/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke an invitation',
    description: 'Deletes an unused invitation.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invitation ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation revoked successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Invitation not found',
  })
  async revokeInvitation(@Param('id') id: string) {
    return this.adminService.revokeInvitation(id);
  }

  @Post('invitations/:id/resend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend an invitation',
    description:
      'Resends the invitation email and extends the expiry to 72 hours.',
  })
  @ApiParam({
    name: 'id',
    description: 'Invitation ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation resent successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Invitation not found',
  })
  async resendInvitation(@Param('id') id: string) {
    return this.adminService.resendInvitation(id);
  }

  // ============================================
  // USER MANAGEMENT ENDPOINTS
  // ============================================

  @Post('users/admins')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an admin user',
    description: 'Creates a new admin user with auto-verification.',
  })
  @ApiResponse({
    status: 201,
    description: 'Admin created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - User with this email already exists',
  })
  async createAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.createAdmin(createAdminDto);
  }

  @Post('users/instructors')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an instructor user',
    description: 'Creates a new instructor user with auto-verification.',
  })
  @ApiResponse({
    status: 201,
    description: 'Instructor created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - User with this email already exists',
  })
  async createInstructor(@Body() createInstructorDto: CreateInstructorDto) {
    return this.adminService.createInstructor(createInstructorDto);
  }

  @Get('users')
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieves all users with filtering and pagination options.',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  async getUsers(@Query() filterDto: UserFilterDto) {
    return this.adminService.getUsers(filterDto);
  }

  @Get('users/:id')
  @ApiOperation({
    summary: 'Get a single user',
    description: 'Retrieves a single user by ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id')
  @ApiOperation({
    summary: 'Update a user',
    description:
      "Updates a user's details including role and verification status.",
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email already in use',
  })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(id, updateUserDto);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a user',
    description: 'Deletes a user and all related data (cascade).',
  })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  // ============================================
  // QUIZ MANAGEMENT (Module & Final Assessment)
  // ============================================

  @Post('modules/:moduleId/quiz')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create or update module quiz',
    description:
      'Creates or updates quiz for a module. Adds questions to existing quiz, preserving student submissions.',
  })
  @ApiParam({ name: 'moduleId', description: 'Module ID', type: String })
  @ApiResponse({
    status: 201,
    description: 'Quiz created/updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async upsertModuleQuiz(
    @Param('moduleId') moduleId: string,
    @Body() createQuizDto: CreateModuleQuizDto,
  ) {
    return this.adminService.createQuiz('module', moduleId, createQuizDto);
  }

  @Get('modules/:moduleId/quiz')
  @ApiOperation({
    summary: 'Get module quiz',
    description:
      'Retrieves module quiz with all questions and correct answers (admin view).',
  })
  @ApiParam({ name: 'moduleId', description: 'Module ID', type: String })
  @ApiResponse({ status: 200, description: 'Quiz retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Module or quiz not found' })
  async getModuleQuiz(@Param('moduleId') moduleId: string) {
    return this.adminService.getQuiz('module', moduleId);
  }

  @Delete('quizzes/:quizId/module')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete module quiz',
    description:
      'Deletes module quiz. Fails if quiz has student submissions to prevent data loss.',
  })
  @ApiParam({ name: 'quizId', description: 'Quiz ID', type: String })
  @ApiResponse({ status: 200, description: 'Quiz deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete - quiz has student submissions',
  })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async deleteModuleQuiz(@Param('quizId') quizId: string) {
    return this.adminService.deleteQuiz('module', quizId);
  }

  @Post('courses/:courseId/final-assessment')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create or update final assessment',
    description:
      'Creates or updates final assessment for a course. Adds questions to existing assessment.',
  })
  @ApiParam({ name: 'courseId', description: 'Course ID', type: String })
  @ApiResponse({
    status: 201,
    description: 'Assessment created/updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async createFinalAssessment(
    @Param('courseId') courseId: string,
    @Body() createAssessmentDto: CreateFinalAssessmentDto,
  ) {
    return this.adminService.createQuiz(
      'course',
      courseId,
      createAssessmentDto,
    );
  }

  @Get('courses/:courseId/final-assessment')
  @ApiOperation({
    summary: 'Get final assessment',
    description:
      'Retrieves final assessment with all questions and correct answers (admin view).',
  })
  @ApiParam({ name: 'courseId', description: 'Course ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Assessment retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Course or assessment not found',
  })
  async getFinalAssessment(@Param('courseId') courseId: string) {
    return this.adminService.getQuiz('course', courseId);
  }

  @Delete('quizzes/:quizId/final-assessment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete final assessment',
    description:
      'Deletes final assessment. Fails if assessment has student submissions to prevent data loss.',
  })
  @ApiParam({ name: 'quizId', description: 'Quiz ID', type: String })
  @ApiResponse({ status: 200, description: 'Assessment deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete - assessment has student submissions',
  })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async deleteFinalAssessment(@Param('quizId') quizId: string) {
    return this.adminService.deleteQuiz('course', quizId);
  }

  @Patch('questions/:questionId/text')
  @ApiOperation({
    summary: 'Update question text only',
    description:
      'Updates only the question text. Fails if quiz has student submissions to prevent data invalidation.',
  })
  @ApiParam({ name: 'questionId', description: 'Question ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Question text updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot update - quiz has student submissions',
  })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async updateQuestionText(
    @Param('questionId') questionId: string,
    @Body() updateQuestionDto: { text: string },
  ) {
    return this.adminService.updateQuestionText(
      questionId,
      updateQuestionDto.text,
    );
  }

  @Patch('questions/:questionId/options')
  @ApiOperation({
    summary: 'Update question options (DANGEROUS)',
    description:
      'Updates question text and options. FAILS if ANY student submissions exist. ' +
      'This is intentionally restrictive to prevent data loss. ' +
      'Options are immutable once students submit answers.',
  })
  @ApiParam({ name: 'questionId', description: 'Question ID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Question updated successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Cannot update - quiz has student submissions. Create new quiz instead.',
  })
  @ApiResponse({ status: 404, description: 'Question not found' })
  async updateQuestionOptions(
    @Param('questionId') questionId: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.adminService.updateQuestionOptions(
      questionId,
      updateQuestionDto,
    );
  }

  // ============================================
  // REVENUE ANALYTICS ENDPOINTS
  // ============================================

  @Get('analytics/revenue')
  @ApiOperation({
    summary: 'Get revenue analytics',
    description:
      'Retrieves comprehensive revenue analytics including total revenue, top earning courses, revenue by month, and revenue by category.',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue analytics retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not an admin',
  })
  async getRevenueAnalytics() {
    return this.adminService.getRevenueAnalytics();
  }

  @Get('analytics/transactions')
  @ApiOperation({
    summary: 'Get payment transactions',
    description:
      'Retrieves paginated list of all payment transactions with details.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transactions retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Not an admin',
  })
  async getPaymentTransactions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getPaymentTransactions(
      page ? parseInt(page.toString()) : 1,
      limit ? parseInt(limit.toString()) : 20,
    );
  }
}

