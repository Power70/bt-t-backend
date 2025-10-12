import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../user/user.service';
import { MailService } from '../mail/mail.service';
import { UserEntity } from '../user/entities/user.entity';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import * as bcrypt from 'bcrypt';
import { hotp } from 'otplib';

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
  ) {}

  /**
   * Private helper to hash passwords
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Private helper to compare passwords
   */
  private async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Private helper to generate and store OTP for user
   */
  private async createAndStoreOtpForUser(userId: string): Promise<string> {
    // Generate OTP secret (using authenticator for secret generation)
    const otpSecret = 'JBSWY3DPEHPK3PXP'; // Base32 secret - in production, generate random
    const otpCounter = 0;
    
    // Store OTP data in user record
    await this.usersService.updateUserOtp(userId, otpSecret, otpCounter);
    
    // Generate the actual OTP code
    const otpCode = hotp.generate(otpSecret, otpCounter);
    
    return otpCode;
  }

  /**
   * Register a new user
   */
  async register(createUserDto: CreateUserDto): Promise<{ message: string }> {
    const { name, email, password } = createUserDto;

    // Check for existing user
    const existingUser = await this.usersService.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // Create the user (UsersService handles password hashing and default role)
    const user = await this.usersService.createForAuth(createUserDto);

    // Generate and store OTP
    const otpCode = await this.createAndStoreOtpForUser(user.id);

    // Send welcome email with OTP
    await this.mailService.sendWelcomeEmail(email, otpCode);

    return { message: 'Registration successful. Please check your email for verification code.' };
  }

  /**
   * Login user with password, then send OTP for MFA
   */
  async login(loginDto: LoginDto): Promise<{ message: string }> {
    const { email, password } = loginDto;

    // Get user with sensitive data
    const user = await this.usersService.findRawByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const passwordValid = await this.comparePassword(password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate and store OTP for MFA
    const otpCode = await this.createAndStoreOtpForUser(user.id);

    // Send login OTP
    await this.mailService.sendLoginOtp(email, otpCode);

    return { message: 'Login credentials verified. Please check your email for verification code.' };
  }

  /**
   * Verify OTP and issue JWT token
   */
  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<AuthResult> {
    const { email, otp } = verifyOtpDto;

    // Get user with OTP data
    const user = await this.usersService.findRawByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid request');
    }

    // Check if OTP data exists
    if (!user.otpSecret || user.otpCounter === null || !user.otpCreatedAt) {
      throw new UnauthorizedException('No OTP request found');
    }

    // Check OTP expiration (15 minutes)
    const otpAge = Date.now() - user.otpCreatedAt.getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    if (otpAge > fifteenMinutes) {
      throw new UnauthorizedException('OTP has expired');
    }

    // Verify OTP
    const isValidOtp = hotp.verify({
      token: otp,
      secret: user.otpSecret,
      counter: user.otpCounter,
    });

    if (!isValidOtp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Handle first-time verification
    let userEntity: UserEntity;
    if (!user.isVerified) {
      userEntity = await this.usersService.verifyUserAndClearOtp(user.id);
    } else {
      // For subsequent logins, just clear OTP data
      await this.usersService.clearUserOtp(user.id);
      const foundUser = await this.usersService.findUserByEmail(email);
      if (!foundUser) {
        throw new UnauthorizedException('User not found');
      }
      userEntity = foundUser;
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
   * Resend OTP
   */
  async resendOtp(resendOtpDto: ResendOtpDto): Promise<{ message: string }> {
    const { email } = resendOtpDto;

    // Get user - if not found, proceed silently to prevent email enumeration
    const user = await this.usersService.findRawByEmail(email);
    
    if (user) {
      // Generate and store new OTP
      const otpCode = await this.createAndStoreOtpForUser(user.id);
      
      // Send OTP resend email
      await this.mailService.sendOtpResend(email, otpCode);
    }

    // Return same message regardless of whether user was found
    return { message: 'If an account with this email exists, a new verification code has been sent.' };
  }

  /**
   * Forgot password - same flow as resend OTP to prevent email enumeration
   */
  async forgotPassword(resendOtpDto: ResendOtpDto): Promise<{ message: string }> {
    const { email } = resendOtpDto;

    // Get user - if not found, proceed silently to prevent email enumeration
    const user = await this.usersService.findRawByEmail(email);
    
    if (user) {
      // Generate and store new OTP
      const otpCode = await this.createAndStoreOtpForUser(user.id);
      
      // Send forgot password OTP email
      await this.mailService.sendForgotPasswordOtp(email, otpCode);
    }

    // Return same message regardless of whether user was found
    return { message: 'If an account with this email exists, a password reset code has been sent.' };
  }
}
