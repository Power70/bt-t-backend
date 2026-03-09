import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InstructorService } from './instructor.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CourseFilterDto } from './dto/course-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('instructor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('INSTRUCTOR')
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  // ============================================
  // DASHBOARD OVERVIEW
  // ============================================

  @Get('dashboard')
  async getDashboardOverview(@Request() req) {
    return this.instructorService.getDashboardOverview(req.user.userId);
  }

  @Get('stats')
  async getInstructorStats(@Request() req) {
    return this.instructorService.getInstructorStats(req.user.userId);
  }

  // ============================================
  // COURSE MANAGEMENT
  // ============================================

  @Get('courses')
  async getInstructorCourses(@Request() req, @Query() filters: CourseFilterDto) {
    return this.instructorService.getInstructorCourses(req.user.userId, filters);
  }

  @Get('courses/:courseId')
  async getCourseById(@Request() req, @Param('courseId') courseId: string) {
    return this.instructorService.getCourseById(req.user.userId, courseId);
  }

  @Post('courses')
  async createCourse(@Request() req, @Body() createCourseDto: CreateCourseDto) {
    return this.instructorService.createCourse(req.user.userId, createCourseDto);
  }

  @Put('courses/:courseId')
  async updateCourse(
    @Request() req,
    @Param('courseId') courseId: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.instructorService.updateCourse(
      req.user.userId,
      courseId,
      updateCourseDto,
    );
  }

  @Delete('courses/:courseId')
  async deleteCourse(@Request() req, @Param('courseId') courseId: string) {
    return this.instructorService.deleteCourse(req.user.userId, courseId);
  }

  @Post('courses/:courseId/duplicate')
  async duplicateCourse(@Request() req, @Param('courseId') courseId: string) {
    return this.instructorService.duplicateCourse(req.user.userId, courseId);
  }

  @Post('courses/:courseId/toggle-publish')
  async togglePublishStatus(@Request() req, @Param('courseId') courseId: string) {
    return this.instructorService.togglePublishStatus(req.user.userId, courseId);
  }

  // ============================================
  // STUDENT MANAGEMENT
  // ============================================

  @Get('students')
  async getEnrolledStudents(
    @Request() req,
    @Query('courseId') courseId?: string,
  ) {
    return this.instructorService.getEnrolledStudents(req.user.userId, courseId);
  }

  @Get('courses/:courseId/students/progress')
  async getStudentProgress(
    @Request() req,
    @Param('courseId') courseId: string,
    @Query('studentId') studentId?: string,
  ) {
    return this.instructorService.getStudentProgress(
      req.user.userId,
      courseId,
      studentId,
    );
  }

  @Get('courses/:courseId/quiz-performance')
  async getQuizPerformance(
    @Request() req,
    @Param('courseId') courseId: string,
  ) {
    return this.instructorService.getQuizPerformance(req.user.userId, courseId);
  }

  // ============================================
  // ANALYTICS & REVENUE
  // ============================================

  @Get('analytics/revenue')
  async getRevenueAnalytics(
    @Request() req,
    @Query('courseId') courseId?: string,
  ) {
    return this.instructorService.getRevenueAnalytics(req.user.userId, courseId);
  }

  @Get('analytics/performance')
  async getCoursePerformance(
    @Request() req,
    @Query('courseId') courseId?: string,
  ) {
    return this.instructorService.getCoursePerformance(req.user.userId, courseId);
  }
}
