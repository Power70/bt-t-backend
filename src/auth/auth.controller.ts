import { 
  Controller, 
  Post, 
  Body, 
  Res, 
  Get, 
  UseGuards, 
  Request,
  HttpCode,
  HttpStatus 
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '../../generated/prisma';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  /**
   * Login with credentials (step 1 of 2-factor auth)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Verify OTP and set authentication cookie
   */
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.verifyOtp(verifyOtpDto);

    // Set secure httpOnly cookie
    response.cookie('Authentication', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return {
      message: 'Authentication successful',
      user: result.user,
    };
  }

  /**
   * Resend OTP
   */
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOtp(resendOtpDto);
  }

  /**
   * Forgot password
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.forgotPassword(resendOtpDto);
  }

  /**
   * Logout user by clearing authentication cookie
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('Authentication');
    return { message: 'Logout successful' };
  }

  // ===== PROTECTED ENDPOINTS FOR TESTING RBAC =====

  /**
   * Get current user profile - accessible by any authenticated user
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return {
      message: 'Profile access granted',
      user: req.user,
    };
  }

  /**
   * Admin dashboard - accessible only by ADMIN role
   */
  @Get('admin/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAdminDashboard(@Request() req) {
    return {
      message: 'Admin dashboard access granted',
      user: req.user,
      adminData: {
        totalUsers: 150,
        totalCourses: 25,
        systemHealth: 'Good',
      },
    };
  }

  /**
   * Instructor panel - accessible by INSTRUCTOR and ADMIN roles
   */
  @Get('instructor/panel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  async getInstructorPanel(@Request() req) {
    return {
      message: 'Instructor panel access granted',
      user: req.user,
      instructorData: {
        myCourses: 5,
        totalStudents: 120,
        pendingReviews: 3,
      },
    };
  }
}
