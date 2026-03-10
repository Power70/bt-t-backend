import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserEntity } from '../user/entities/user.entity';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import * as bcrypt from 'bcrypt';
import { hotp } from 'otplib';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { ResetPasswordDto } from './dto/reset-password-dto';
import { RegisterInstructorDto } from './dto/register-instructor.dto';
import { UserRole } from '../../generated/prisma';

export interface AuthResult {
  accessToken: string;
  user: UserEntity;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create an OTP for a user, persist/update otp_count and otp_generated_at and return the token.
   * Ensures the counter is advanced so every issued OTP is unique and cannot be replayed.
   */
  async createAndStoreOtpForUser(
    userId: string,
    currentOtpCount?: number | null,
  ): Promise<{ token: string; counter: number }> {
    // Configure HOTP
    hotp.options = { digits: 6 };

    // Get or initialize the counter
    const baseCounter =
      typeof currentOtpCount === 'number' && currentOtpCount > 0
        ? currentOtpCount
        : Math.floor(Math.random() * 1000000);

    const newCounter = baseCounter + 1;

    // Get or generate unique secret for this user
    const user = await this.usersService.findRawById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let otpSecret = user.otp_secret;

    if (!otpSecret) {
      // Generate a new unique Base32 secret for this user
      otpSecret = crypto
        .randomBytes(20)
        .toString('base64')
        .replace(/[^A-Z2-7]/gi, '')
        .substring(0, 32);
    }

    const token = hotp.generate(otpSecret, newCounter);

    // Update user with new counter, secret (if new), and generation timestamp
    await this.usersService.updateUserInfo(userId, {
      otp_count: newCounter,
      otp_secret: otpSecret,
      otp_generated_at: new Date(),
    });

    return { token, counter: newCounter };
  }

  /**
   * Register a new user
   */
  async register(createUserDto: CreateUserDto): Promise<{ message: string }> {
    const existingUser = await this.usersService.findUserByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }
    const user = await this.usersService.createUser(createUserDto);

    // Generate and store OTP
    const { token: otpCode } = await this.createAndStoreOtpForUser(user.id);

    // Send welcome email with OTP
    await this.mailService.sendWelcomeEmail(createUserDto.email, otpCode);

    return {
      message:
        'Registration successful. Please check your email for verification code.',
    };
  }

  /**
   * Login user with password, then send OTP for MFA
   */
  async login(loginDto: LoginDto): Promise<{ message: string }> {
    const user = await this.usersService.findRawByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate and store OTP for MFA
    const { token: otpCode } = await this.createAndStoreOtpForUser(
      user.id,
      user.otp_count,
    );

    // Send login OTP
    await this.mailService.sendLoginOtp(user.email, otpCode);

    return {
      message:
        'Login credentials verified. Please check your email for verification code.',
    };
  }

  /**
   * Verify OTP and issue JWT token
   */
  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<AuthResult> {
    // Get user with OTP data
    const user = await this.usersService.findRawByEmail(verifyOtpDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid request');
    }

    // Check if OTP data exists
    if (!user.otp_secret || user.otp_count === null || !user.otp_generated_at) {
      throw new UnauthorizedException('No OTP request found');
    }

    // Check OTP expiration (15 minutes)
    const otpAge = Date.now() - user.otp_generated_at.getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    if (otpAge > fifteenMinutes) {
      throw new UnauthorizedException('OTP has expired, request a new one');
    }

    // Verify OTP
    const isValidOtp = hotp.verify({
      token: verifyOtpDto.otp,
      secret: user.otp_secret,
      counter: user.otp_count,
    });

    if (!isValidOtp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Handle verification and OTP cleanup
    let userEntity: UserEntity;
    if (!user.isVerified) {
      userEntity = await this.usersService.verifyUserAndClearOtp(user.id);
    } else {
      await this.usersService.clearUserOtp(user.id);
      // Create UserEntity from user we already have in memory
      userEntity = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    }

    // Generate JWT
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: userEntity,
    };
  }

  /**
   * Resend OTP for verification
   */
  async resendOtp(
    resendOtpDto: ResendOtpDto,
  ): Promise<{ message: string; otp?: string }> {
    return this.handleOtpRequest(
      resendOtpDto.email,
      (email, otp) => this.mailService.sendOtpResend(email, otp),
      'If an account with this email exists, a new verification code has been sent.',
    );
  }

  /**
   * Forgot password functionality
   */
  async forgotPassword(
    resendOtpDto: ResendOtpDto,
  ): Promise<{ message: string; otp?: string }> {
    return this.handleOtpRequest(
      resendOtpDto.email,
      (email, otp) => this.mailService.sendForgotPasswordOtp(email, otp),
      'If an account with this email exists, a password reset code has been sent.',
    );
  }

  /**
   * Reset password functionality
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findRawByEmail(resetPasswordDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid request');
    }

    if (!user.otp_secret || user.otp_count === null || !user.otp_generated_at) {
      throw new UnauthorizedException('No OTP request found');
    }

    // Check OTP expiration (15 minutes)
    const otpAge = Date.now() - user.otp_generated_at.getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    if (otpAge > fifteenMinutes) {
      throw new UnauthorizedException('OTP has expired, request a new one');
    }

    const isValidOtp = hotp.verify({
      token: resetPasswordDto.otp,
      secret: user.otp_secret,
      counter: user.otp_count,
    });

    if (!isValidOtp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    if (resetPasswordDto.newPassword !== resetPasswordDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    await this.usersService.updateUserInfo(user.id, {
      password: hashedPassword,
    });

    await this.usersService.clearUserOtp(user.id);

    return { message: 'Password reset successfully' };
  }

  /**
   * Private helper to handle OTP request - shared logic between resendOtp and forgotPassword
   */
  private async handleOtpRequest(
    email: string,
    sendEmailFn: (email: string, otp: string) => Promise<void>,
    successMessage: string,
  ): Promise<{ message: string; otp?: string }> {
    const user = await this.usersService.findRawByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email address.');
    } else if (user) {
      const { token } = await this.createAndStoreOtpForUser(
        user.id,
        user.otp_count,
      );

      // Send OTP email using provided function
      await sendEmailFn(email, token);
    }

    return {
      message: successMessage,
    };
  }

  /**
   * Validate an instructor invitation token (public endpoint for the frontend)
   */
  async validateInvitation(
    token: string,
  ): Promise<{ valid: boolean; email: string }> {
    const invitation = await this.prisma.instructorInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation link');
    }

    if (invitation.usedAt) {
      throw new BadRequestException('This invitation has already been used');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException(
        'This invitation has expired. Please contact your administrator for a new one.',
      );
    }

    return { valid: true, email: invitation.email };
  }

  /**
   * Register an instructor using an invitation token
   */
  async registerInstructor(
    dto: RegisterInstructorDto,
  ): Promise<AuthResult> {
    // Validate the invitation token
    const invitation = await this.prisma.instructorInvitation.findUnique({
      where: { token: dto.token },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation link');
    }

    if (invitation.usedAt) {
      throw new BadRequestException('This invitation has already been used');
    }

    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException(
        'This invitation has expired. Please contact your administrator for a new one.',
      );
    }

    // Check if email is already registered
    const existingUser = await this.usersService.findUserByEmail(
      invitation.email,
    );
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create the instructor user (already verified since they came via invitation link)
    const user = await this.prisma.user.create({
      data: {
        email: invitation.email,
        name: dto.name,
        password: hashedPassword,
        role: UserRole.INSTRUCTOR,
        isVerified: true,
      },
    });

    // Mark the invitation as used
    await this.prisma.instructorInvitation.update({
      where: { id: invitation.id },
      data: { usedAt: new Date() },
    });

    // Generate JWT token immediately (no OTP needed since email was validated via invitation)
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    const userEntity: UserEntity = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return {
      accessToken,
      user: userEntity,
    };
  }
}
