import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';
import { User, UserRole } from '../../generated/prisma';
import * as bcrypt from 'bcrypt';

// Define updatable user fields for cleaner type signature
interface UpdatableUserFields {
  name?: string;
  email?: string;
  otp_secret?: string | null;
  otp_count?: number | null;
  otp_generated_at?: Date | null;
  password?: string;
}

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
    const user = await this.createUserInternal(createUserDto);
    return this.formatUser(user);
  }

  /**
   * Internal method to create user and return raw data
   */
  private async createUserInternal(
    createUserDto: CreateUserDto,
  ): Promise<User> {
    const { name, email, password } = createUserDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
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
          role: UserRole.STUDENT,
        },
      });

      return user;
    } catch {
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
  async updateUserInfo(
    userId: string,
    data: UpdatableUserFields,
  ): Promise<UserEntity> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.formatUser(updatedUser);
  }

  /**
   * Find user by email and return raw user data with sensitive fields (internal use for auth)
   */
  async findRawByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /**
   * Find user by ID and return raw user data with sensitive fields (internal use for auth)
   */
  async findRawById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  /**
   * Update user with OTP details for authentication
   */
  async updateUserOtp(
    userId: string,
    otpSecret: string,
    otpCounter: number,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        otp_secret: otpSecret,
        otp_count: otpCounter,
        otp_generated_at: new Date(),
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
        otp_secret: null,
        otp_count: null,
        otp_generated_at: null,
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
        otp_secret: null,
        otp_count: null,
        otp_generated_at: null,
      },
    });
  }
}
