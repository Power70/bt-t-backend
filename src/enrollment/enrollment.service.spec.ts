import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from './services/paystack.service';

describe('EnrollmentService', () => {
  let service: EnrollmentService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    course: {
      findUnique: jest.fn(),
    },
    enrollment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockPaystackService = {
    initializeTransaction: jest.fn(),
    verifyTransaction: jest.fn(),
    verifyWebhookSignature: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PaystackService,
          useValue: mockPaystackService,
        },
      ],
    }).compile();

    service = module.get<EnrollmentService>(EnrollmentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateEnrollment', () => {
    const mockUser = {
      id: 'user123',
      email: 'student@email.com',
      name: 'Test Student',
    };

    const mockCourse = {
      id: 'course123',
      title: 'Web Development',
      description: 'Learn web development',
      price: 1500,
      isPublished: true,
      instructorId: 'instructor123',
      instructor: {
        id: 'instructor123',
        name: 'Test Instructor',
        email: 'instructor@email.com',
      },
    };

    it('should initiate enrollment successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.enrollment.findUnique.mockResolvedValue(null);
      mockPaystackService.initializeTransaction.mockResolvedValue({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/abc123',
          access_code: 'abc123def456',
          reference: 'T1234567890',
        },
      });

      const result = await service.initiateEnrollment(
        {
          email: 'student@email.com',
          courseId: 'course123',
        },
        'user123',
      );

      expect(result.message).toBe('Payment initialized successfully');
      expect(result.data.access_code).toBe('abc123def456');
      expect(result.data.amount).toBe(1500);
      expect(result.data.course.title).toBe('Web Development');
      expect(mockPaystackService.initializeTransaction).toHaveBeenCalledWith(
        'student@email.com',
        150000,
        expect.objectContaining({
          courseId: 'course123',
          userId: 'user123',
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.initiateEnrollment(
          {
            email: 'student@email.com',
            courseId: 'course123',
          },
          'user123',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if email does not match', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        email: 'different@email.com',
      });

      await expect(
        service.initiateEnrollment(
          {
            email: 'student@email.com',
            courseId: 'course123',
          },
          'user123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if course not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(
        service.initiateEnrollment(
          {
            email: 'student@email.com',
            courseId: 'course123',
          },
          'user123',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if course is not published', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.course.findUnique.mockResolvedValue({
        ...mockCourse,
        isPublished: false,
      });

      await expect(
        service.initiateEnrollment(
          {
            email: 'student@email.com',
            courseId: 'course123',
          },
          'user123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if user already enrolled', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.enrollment.findUnique.mockResolvedValue({
        id: 'enrollment123',
        userId: 'user123',
        courseId: 'course123',
      });

      await expect(
        service.initiateEnrollment(
          {
            email: 'student@email.com',
            courseId: 'course123',
          },
          'user123',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('verifyAndCreateEnrollment', () => {
    const mockCourse = {
      id: 'course123',
      title: 'Web Development',
      price: 1500,
    };

    const mockVerificationResponse = {
      status: true,
      data: {
        status: 'success',
        reference: 'T1234567890',
        amount: 150000,
        metadata: {
          courseId: 'course123',
          userId: 'user123',
        },
      },
    };

    it('should verify payment and create enrollment successfully', async () => {
      mockPaystackService.verifyTransaction.mockResolvedValue(
        mockVerificationResponse,
      );
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.enrollment.findUnique.mockResolvedValue(null);
      mockPrismaService.enrollment.create.mockResolvedValue({
        id: 'enrollment123',
        userId: 'user123',
        courseId: 'course123',
        enrolledAt: new Date(),
        course: {
          id: 'course123',
          title: 'Web Development',
          description: 'Learn web development',
          imageUrl: null,
          instructor: {
            name: 'Test Instructor',
            email: 'instructor@email.com',
          },
        },
        user: {
          id: 'user123',
          name: 'Test Student',
          email: 'student@email.com',
        },
      });

      const result = await service.verifyAndCreateEnrollment('T1234567890');

      expect(result.message).toBe('Enrollment successful');
      expect(result.enrollment.userId).toBe('user123');
      expect(result.enrollment.courseId).toBe('course123');
      expect(mockPrismaService.enrollment.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if payment was not successful', async () => {
      mockPaystackService.verifyTransaction.mockResolvedValue({
        status: true,
        data: {
          status: 'failed',
          reference: 'T1234567890',
          amount: 150000,
          metadata: {
            courseId: 'course123',
            userId: 'user123',
          },
        },
      });

      await expect(
        service.verifyAndCreateEnrollment('T1234567890'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if metadata is missing', async () => {
      mockPaystackService.verifyTransaction.mockResolvedValue({
        status: true,
        data: {
          status: 'success',
          reference: 'T1234567890',
          amount: 150000,
          metadata: {},
        },
      });

      await expect(
        service.verifyAndCreateEnrollment('T1234567890'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if amount does not match', async () => {
      mockPaystackService.verifyTransaction.mockResolvedValue(
        mockVerificationResponse,
      );
      mockPrismaService.course.findUnique.mockResolvedValue({
        ...mockCourse,
        price: 2000, // Different price
      });

      await expect(
        service.verifyAndCreateEnrollment('T1234567890'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing enrollment if already exists', async () => {
      const existingEnrollment = {
        id: 'enrollment123',
        userId: 'user123',
        courseId: 'course123',
        enrolledAt: new Date(),
      };

      mockPaystackService.verifyTransaction.mockResolvedValue(
        mockVerificationResponse,
      );
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);
      mockPrismaService.enrollment.findUnique.mockResolvedValue(
        existingEnrollment,
      );

      const result = await service.verifyAndCreateEnrollment('T1234567890');

      expect(result.message).toBe('You are already enrolled in this course');
      expect(mockPrismaService.enrollment.create).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentWebhook', () => {
    it('should ignore non-charge.success events', async () => {
      const webhookData = {
        event: 'transfer.success',
        data: {} as any,
      };

      const result = await service.handlePaymentWebhook(webhookData);

      expect(result.message).toBe('Webhook received but not processed');
      expect(mockPrismaService.enrollment.create).not.toHaveBeenCalled();
    });

    it('should ignore non-successful payments', async () => {
      const webhookData = {
        event: 'charge.success',
        data: {
          status: 'failed',
          reference: 'T1234567890',
          metadata: {
            courseId: 'course123',
            userId: 'user123',
          },
        } as any,
      };

      const result = await service.handlePaymentWebhook(webhookData);

      expect(result.message).toBe('Payment not successful');
      expect(mockPrismaService.enrollment.create).not.toHaveBeenCalled();
    });

    it('should create enrollment for successful payment', async () => {
      const webhookData = {
        event: 'charge.success',
        data: {
          status: 'success',
          reference: 'T1234567890',
          amount: 150000,
          metadata: {
            courseId: 'course123',
            userId: 'user123',
          },
        } as any,
      };

      mockPrismaService.enrollment.findUnique.mockResolvedValue(null);
      mockPrismaService.enrollment.create.mockResolvedValue({
        id: 'enrollment123',
        userId: 'user123',
        courseId: 'course123',
        enrolledAt: new Date(),
      });

      const result = await service.handlePaymentWebhook(webhookData);

      expect(result.message).toBe('Enrollment created successfully');
      expect(mockPrismaService.enrollment.create).toHaveBeenCalledWith({
        data: {
          userId: 'user123',
          courseId: 'course123',
        },
      });
    });

    it('should not create duplicate enrollment via webhook', async () => {
      const webhookData = {
        event: 'charge.success',
        data: {
          status: 'success',
          reference: 'T1234567890',
          amount: 150000,
          metadata: {
            courseId: 'course123',
            userId: 'user123',
          },
        } as any,
      };

      mockPrismaService.enrollment.findUnique.mockResolvedValue({
        id: 'enrollment123',
        userId: 'user123',
        courseId: 'course123',
        enrolledAt: new Date(),
      });

      const result = await service.handlePaymentWebhook(webhookData);

      expect(result.message).toBe('Enrollment already exists');
      expect(mockPrismaService.enrollment.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserEnrollments', () => {
    it('should return user enrollments', async () => {
      const mockEnrollments = [
        {
          id: 'enrollment1',
          userId: 'user123',
          courseId: 'course1',
          enrolledAt: new Date(),
          course: {
            id: 'course1',
            title: 'Course 1',
            description: 'Description 1',
            imageUrl: null,
            price: 1500,
            instructor: {
              name: 'Instructor 1',
              email: 'instructor1@email.com',
            },
          },
        },
      ];

      mockPrismaService.enrollment.findMany.mockResolvedValue(mockEnrollments);

      const result = await service.getUserEnrollments('user123');

      expect(result.message).toBe('Enrollments retrieved successfully');
      expect(result.data).toEqual(mockEnrollments);
      expect(mockPrismaService.enrollment.findMany).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        include: expect.any(Object),
        orderBy: { enrolledAt: 'desc' },
      });
    });

    it('should return empty array if no enrollments', async () => {
      mockPrismaService.enrollment.findMany.mockResolvedValue([]);

      const result = await service.getUserEnrollments('user123');

      expect(result.message).toBe('Enrollments retrieved successfully');
      expect(result.data).toEqual([]);
    });
  });

  describe('isUserEnrolled', () => {
    it('should return true if user is enrolled', async () => {
      mockPrismaService.enrollment.findUnique.mockResolvedValue({
        id: 'enrollment123',
        userId: 'user123',
        courseId: 'course123',
      });

      const result = await service.isUserEnrolled('user123', 'course123');

      expect(result).toBe(true);
    });

    it('should return false if user is not enrolled', async () => {
      mockPrismaService.enrollment.findUnique.mockResolvedValue(null);

      const result = await service.isUserEnrolled('user123', 'course123');

      expect(result).toBe(false);
    });
  });
});
