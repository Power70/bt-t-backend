import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';
import { User } from '../../generated/prisma';
import * as bcrypt from 'bcrypt';
import { hotp } from 'otplib';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Private method to format raw Prisma user object into safe UserEntity
   */
  private formatUser(user: User): UserEntity {
    return new UserEntity({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  /**
   * Create a new user with STUDENT role by default
   */
  async createUser(createUserDto: CreateUserDto): Promise<UserEntity> {
    const { name, email, password } = createUserDto;

    // Check for duplicate email
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'STUDENT', // Default role as specified
        },
      });

      return this.formatUser(user);
    } catch (error) {
      throw new InternalServerErrorException('Could not create user');
    }
  }

  /**
   * Find user by email and return formatted UserEntity
   */
  async findUserByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.formatUser(user) : null;
  }

  /**
   * Update user information
   */
  async updateUserInfo(userId: string, data: Partial<Pick<User, 'name' | 'email'>>): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.formatUser(user);
  }

  // ===== METHODS FOR AUTH SERVICE INTERNAL USE =====

  /**
   * Create user for auth purposes (internal use)
   */
  async createForAuth(createUserDto: CreateUserDto): Promise<User> {
    const { name, email, password } = createUserDto;

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'STUDENT',
        },
      });

      return user;
    } catch (error) {
      throw new InternalServerErrorException('Could not create user');
    }
  }

  /**
   * Find user by email and return raw user data with sensitive fields (internal use for auth)
   */
  async findRawByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /**
   * Update user with OTP details for authentication
   */
  async updateUserOtp(userId: string, otpSecret: string, otpCounter: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        otpSecret,
        otpCounter,
        otpCreatedAt: new Date(),
      },
    });
  }

  /**
   * Verify user account and clear OTP secrets for security
   */
  async verifyUserAndClearOtp(userId: string): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isVerified: true,
        // Clear OTP fields after successful verification for security
        otpSecret: null,
        otpCounter: null,
        otpCreatedAt: null,
      },
    });

    return this.formatUser(user);
  }

  /**
   * Clear OTP data for existing verified users (for subsequent logins)
   */
  async clearUserOtp(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        otpSecret: null,
        otpCounter: null,
        otpCreatedAt: null,
      },
    });
  }
}