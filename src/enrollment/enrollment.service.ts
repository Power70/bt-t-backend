import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from './services/paystack.service';
import { InitiateEnrollmentDto } from './dto/initiate-enrollment.dto';
import { EnrollmentEntity } from './entities/enrollment.entity';
import { PaystackWebhookDto } from './dto/paystack-webhook.dto';

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
  ) {}

  /**
   * Initiate enrollment process by creating a Paystack transaction
   * @param initiateEnrollmentDto Contains email and courseId
   * @param userId User ID from authenticated request
   * @returns Payment initialization details
   */
  async initiateEnrollment(
    initiateEnrollmentDto: InitiateEnrollmentDto,
    userId: string,
  ) {
    const { email, courseId } = initiateEnrollmentDto;

    // Verify user exists and email matches
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email !== email) {
      throw new BadRequestException('Email does not match authenticated user');
    }

    // Verify course exists and is published
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!course.isPublished) {
      throw new BadRequestException(
        'This course is not available for enrollment',
      );
    }

    // Check if user is already enrolled
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      throw new ConflictException('You are already enrolled in this course');
    }

    // Convert price to lowest currency unit (kobo for NGN, cents for USD)
    // Assuming the price in the database is in the main currency unit
    const amountInLowestUnit = Math.round(course.price * 100);

    // Initialize Paystack transaction
    const paystackResponse = await this.paystackService.initializeTransaction(
      email,
      amountInLowestUnit,
      {
        courseId,
        userId,
        courseName: course.title,
        instructorId: course.instructorId,
      },
    );

    return {
      message: 'Payment initialized successfully',
      data: {
        authorization_url: paystackResponse.data.authorization_url,
        access_code: paystackResponse.data.access_code,
        reference: paystackResponse.data.reference,
        amount: course.price,
        currency: 'NGN', // You can make this dynamic based on your requirements
        course: {
          id: course.id,
          title: course.title,
          description: course.description,
          imageUrl: course.imageUrl,
          instructor: course.instructor.name,
        },
      },
    };
  }

  /**
   * Verify payment and create enrollment
   * @param reference Transaction reference
   * @returns Enrollment details
   */
  async verifyAndCreateEnrollment(reference: string) {
    // Verify transaction with Paystack
    const verificationResponse =
      await this.paystackService.verifyTransaction(reference);

    const { data } = verificationResponse;

    // Check if payment was successful
    if (data.status !== 'success') {
      throw new BadRequestException(
        `Payment was not successful. Status: ${data.status}`,
      );
    }

    // Extract metadata
    const { courseId, userId } = data.metadata;

    if (!courseId || !userId) {
      throw new BadRequestException('Invalid transaction metadata');
    }

    // Verify the amount matches the course price
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const expectedAmount = Math.round(course.price * 100);
    if (data.amount !== expectedAmount) {
      throw new BadRequestException(
        `Payment amount does not match course price. Expected: ${expectedAmount}, Received: ${data.amount}`,
      );
    }

    // Check if enrollment already exists
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      return {
        message: 'You are already enrolled in this course',
        enrollment: new EnrollmentEntity(existingEnrollment),
      };
    }

    // Create enrollment
    const enrollment = await this.prisma.enrollment.create({
      data: {
        userId,
        courseId,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            instructor: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      message: 'Enrollment successful',
      enrollment: new EnrollmentEntity({
        id: enrollment.id,
        userId: enrollment.userId,
        courseId: enrollment.courseId,
        enrolledAt: enrollment.enrolledAt,
      }),
      course: enrollment.course,
    };
  }

  /**
   * Handle Paystack webhook for successful payments
   * @param webhookData Webhook payload from Paystack
   */
  async handlePaymentWebhook(webhookData: PaystackWebhookDto) {
    // Only process successful charge events
    if (webhookData.event !== 'charge.success') {
      return {
        message: 'Webhook received but not processed',
      };
    }

    const { data } = webhookData;

    // Verify payment status
    if (data.status !== 'success') {
      return {
        message: 'Payment not successful',
      };
    }

    // Extract metadata
    const { courseId, userId } = data.metadata;

    if (!courseId || !userId) {
      return {
        message: 'Invalid metadata',
      };
    }

    // Check if enrollment already exists
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (existingEnrollment) {
      return {
        message: 'Enrollment already exists',
        enrollment: new EnrollmentEntity(existingEnrollment),
      };
    }

    // Create enrollment
    const enrollment = await this.prisma.enrollment.create({
      data: {
        userId,
        courseId,
      },
    });

    return {
      message: 'Enrollment created successfully',
      enrollment: new EnrollmentEntity(enrollment),
    };
  }

  /**
   * Get user's enrollments
   * @param userId User ID
   * @returns List of enrollments with course details
   */
  async getUserEnrollments(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            imageUrl: true,
            price: true,
            instructor: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    });

    return {
      message: 'Enrollments retrieved successfully',
      data: enrollments,
    };
  }

  /**
   * Check if a user is enrolled in a course
   * @param userId User ID
   * @param courseId Course ID
   * @returns Boolean indicating enrollment status
   */
  async isUserEnrolled(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    return !!enrollment;
  }
}
