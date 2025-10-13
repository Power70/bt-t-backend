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
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiBearerAuth,
  ApiCookieAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
  ApiBadRequestResponse 
} from '@nestjs/swagger';
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
    description: 'Creates a new user account with STUDENT role by default. Sends OTP to email for verification.'
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ 
    status: 201, 
    description: 'User registered successfully. OTP sent to email.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Registration successful. Please check your email for verification code.' }
      }
    }
  })
  @ApiConflictResponse({ 
    description: 'User with this email already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'A user with this email already exists' },
        error: { type: 'string', example: 'Conflict' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' }, example: ['email must be an email', 'password must be at least 8 characters long'] },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
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
    description: 'First step of 2FA login. Validates credentials and sends OTP to email for MFA verification.'
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Credentials validated. OTP sent to email.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Login credentials verified. Please check your email for verification code.' }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Invalid credentials',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid credentials' },
        error: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' }, example: ['email must be an email', 'password should not be empty'] },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Verify OTP and set authentication cookie
   */
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Verify OTP and authenticate',
    description: 'Second step of 2FA login. Verifies OTP code and sets secure authentication cookie with JWT token.'
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ 
    status: 200, 
    description: 'OTP verified successfully. Authentication cookie set.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Authentication successful' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid123456789' },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe' },
            role: { type: 'string', enum: ['STUDENT', 'INSTRUCTOR', 'ADMIN'], example: 'STUDENT' },
            isVerified: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Invalid or expired OTP',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid OTP' },
        error: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' }, example: ['OTP must be exactly 6 digits'] },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
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
  @ApiOperation({ 
    summary: 'Resend OTP code',
    description: 'Resends OTP verification code to user email. Returns same message regardless of whether email exists to prevent enumeration.'
  })
  @ApiBody({ type: ResendOtpDto })
  @ApiResponse({ 
    status: 200, 
    description: 'OTP resend request processed.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'If an account with this email exists, a new verification code has been sent.' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' }, example: ['email must be an email'] },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
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
    description: 'Sends password reset OTP to user email. Returns same message regardless of whether email exists to prevent enumeration.'
  })
  @ApiBody({ type: ResendOtpDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Password reset request processed.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'If an account with this email exists, a password reset code has been sent.' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' }, example: ['email must be an email'] },
        error: { type: 'string', example: 'Bad Request' }
      }
    }
  })
  async forgotPassword(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.forgotPassword(resendOtpDto);
  }

  /**
   * Logout user by clearing authentication cookie
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Logout user',
    description: 'Clears the authentication cookie to log out the user.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User logged out successfully.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logout successful' }
      }
    }
  })
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
  @ApiOperation({ 
    summary: 'Get user profile',
    description: 'Returns the current authenticated user\'s profile information. Accessible by any authenticated user.'
  })
  @ApiCookieAuth('Authentication')
  @ApiResponse({ 
    status: 200, 
    description: 'User profile retrieved successfully.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Profile access granted' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid123456789' },
            email: { type: 'string', example: 'user@example.com' },
            role: { type: 'string', enum: ['STUDENT', 'INSTRUCTOR', 'ADMIN'], example: 'STUDENT' }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Authentication required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
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
  @ApiOperation({ 
    summary: 'Get admin dashboard',
    description: 'Returns admin dashboard data. Only accessible by users with ADMIN role.'
  })
  @ApiCookieAuth('Authentication')
  @ApiResponse({ 
    status: 200, 
    description: 'Admin dashboard data retrieved successfully.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Admin dashboard access granted' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid123456789' },
            email: { type: 'string', example: 'admin@example.com' },
            role: { type: 'string', example: 'ADMIN' }
          }
        },
        adminData: {
          type: 'object',
          properties: {
            totalUsers: { type: 'number', example: 150 },
            totalCourses: { type: 'number', example: 25 },
            systemHealth: { type: 'string', example: 'Good' }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Authentication required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiForbiddenResponse({ 
    description: 'Admin role required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Insufficient permissions' },
        error: { type: 'string', example: 'Forbidden' }
      }
    }
  })
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
  @ApiOperation({ 
    summary: 'Get instructor panel',
    description: 'Returns instructor panel data. Accessible by users with INSTRUCTOR or ADMIN roles.'
  })
  @ApiCookieAuth('Authentication')
  @ApiResponse({ 
    status: 200, 
    description: 'Instructor panel data retrieved successfully.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Instructor panel access granted' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'cuid123456789' },
            email: { type: 'string', example: 'instructor@example.com' },
            role: { type: 'string', example: 'INSTRUCTOR' }
          }
        },
        instructorData: {
          type: 'object',
          properties: {
            myCourses: { type: 'number', example: 5 },
            totalStudents: { type: 'number', example: 120 },
            pendingReviews: { type: 'number', example: 3 }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Authentication required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' }
      }
    }
  })
  @ApiForbiddenResponse({ 
    description: 'Instructor or Admin role required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Insufficient permissions' },
        error: { type: 'string', example: 'Forbidden' }
      }
    }
  })
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
