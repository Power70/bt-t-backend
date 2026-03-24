import {
  Controller,
  Post,
  Body,
  Res,
  Get,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiCookieAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from '../../generated/prisma';
import { ResetPasswordDto } from './dto/reset-password-dto';
import { RegisterInstructorDto } from './dto/register-instructor.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account with STUDENT role by default. Sends OTP to email for verification.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully. OTP sent to email.',
  })
  @ApiConflictResponse({
    description: 'User with this email already exists',
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
  })
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  /**
   * Login with credentials (step 1 of 2-factor auth)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'First step of 2FA login. Validates credentials and sends OTP to email for MFA verification.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Credentials validated. OTP sent to email.',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Authenticate or register with Google and set authentication cookie
   */
  @Post('google-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate with Google',
    description:
      'Authenticates a user using a Google OAuth access token. Creates a new STUDENT account if one does not exist, then sets authentication cookie.',
  })
  @ApiBody({ type: GoogleAuthDto })
  @ApiResponse({
    status: 200,
    description: 'Google authentication successful.',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid Google token',
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
  })
  async googleAuth(
    @Body() googleAuthDto: GoogleAuthDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.googleAuth(googleAuthDto);
    const isProduction = process.env.NODE_ENV === 'production';

    response.cookie('Authentication', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return {
      message: 'Authentication successful',
      user: result.user,
    };
  }

  /**
   * Verify OTP and set authentication cookie
   */
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify OTP and authenticate',
    description:
      'Second step of 2FA login. Verifies OTP code and sets secure authentication cookie with JWT token.',
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({})
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired OTP',
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
  })
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.verifyOtp(verifyOtpDto);
    const isProduction = process.env.NODE_ENV === 'production';

    // Set secure httpOnly cookie with 7 days expiration
    response.cookie('Authentication', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      // Required for cross-origin cookies (frontend + backend on different Vercel domains)
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
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
  @ApiOperation({
    summary: 'Resend OTP code',
    description:
      'Resends OTP verification code to user email. Returns same message regardless of whether email exists to prevent enumeration.',
  })
  @ApiBody({ type: ResendOtpDto })
  @ApiResponse({
    status: 200,
    description: 'OTP resend request processed.',
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
  })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOtp(resendOtpDto);
  }

  /**
   * Forgot password
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Sends password reset OTP to user email. Returns same message regardless of whether email exists to prevent enumeration.',
  })
  @ApiBody({ type: ResendOtpDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset request processed.',
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
  })
  async forgotPassword(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.forgotPassword(resendOtpDto);
  }

  /**
   * Reset password
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description:
      'Resets the user password using the provided OTP and new password.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired OTP',
  })
  @ApiBadRequestResponse({
    description: 'Validation error',
  })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  /**
   * Logout user by clearing authentication cookie
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user',
    description: 'Clears the authentication cookie to log out the user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User logged out successfully.',
  })
  logout(@Res({ passthrough: true }) response: Response) {
    const isProduction = process.env.NODE_ENV === 'production';

    response.clearCookie('Authentication', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });

    return { message: 'Logout successful' };
  }

  // ===== INSTRUCTOR INVITATION ENDPOINTS =====

  /**
   * Validate an invitation token (public, no auth required)
   */
  @Get('invitation/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate invitation token',
    description:
      'Checks if an instructor invitation token is valid, not expired, and not yet used. Returns the associated email.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token is valid.',
  })
  @ApiResponse({
    status: 404,
    description: 'Invalid invitation link',
  })
  @ApiBadRequestResponse({
    description: 'Invitation expired or already used',
  })
  async validateInvitation(@Param('token') token: string) {
    return this.authService.validateInvitation(token);
  }

  /**
   * Register as an instructor using an invitation token
   */
  @Post('register-instructor')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register an instructor via invitation',
    description:
      'Creates a new instructor account using a valid invitation token. Sets authentication cookie on success.',
  })
  @ApiBody({ type: RegisterInstructorDto })
  @ApiResponse({
    status: 201,
    description: 'Instructor account created and authenticated.',
  })
  @ApiResponse({
    status: 404,
    description: 'Invalid invitation link',
  })
  @ApiBadRequestResponse({
    description: 'Invitation expired or already used',
  })
  @ApiConflictResponse({
    description: 'User with this email already exists',
  })
  async registerInstructor(
    @Body() dto: RegisterInstructorDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.registerInstructor(dto);
    const isProduction = process.env.NODE_ENV === 'production';

    // Set secure httpOnly cookie with 7 days expiration
    response.cookie('Authentication', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    return {
      message: 'Instructor account created successfully',
      user: result.user,
    };
  }

  // ===== PROTECTED ENDPOINTS FOR TESTING RBAC =====

  /**
   * Get current user profile - accessible by any authenticated user
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get user profile',
    description:
      "Returns the current authenticated user's profile information. Accessible by any authenticated user.",
  })
  @ApiCookieAuth('Authentication')
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  getProfile(
    @Request()
    req: ExpressRequest & {
      user: { id: string; role?: UserRole; email?: string };
    },
  ) {
    const userId = req.user.id;

    if (!userId) {
      return {
        message: 'Profile access denied',
        user: null,
      };
    }

    return this.authService.getProfileById(userId).then((user) => ({
      message: 'Profile access granted',
      user,
    }));
  }

  /**
   * Admin dashboard - accessible only by ADMIN role
   */
  @Get('admin/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get admin dashboard',
    description:
      'Returns admin dashboard data. Only accessible by users with ADMIN role.',
  })
  @ApiCookieAuth('Authentication')
  @ApiResponse({
    status: 200,
    description: 'Admin dashboard data retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  @ApiForbiddenResponse({
    description: 'Admin role required',
  })
  getAdminDashboard(
    @Request()
    req: ExpressRequest & {
      user: { id: string; role?: UserRole; email?: string };
    },
  ) {
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
  @ApiOperation({
    summary: 'Get instructor panel',
    description:
      'Returns instructor panel data. Accessible by users with INSTRUCTOR or ADMIN roles.',
  })
  @ApiCookieAuth('Authentication')
  @ApiResponse({
    status: 200,
    description: 'Instructor panel data retrieved successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  @ApiForbiddenResponse({
    description: 'Instructor or Admin role required',
  })
  getInstructorPanel(
    @Request()
    req: ExpressRequest & {
      user: { id: string; role?: UserRole; email?: string };
    },
  ) {
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
