import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';
import { PaystackService } from './services/paystack.service';

describe('EnrollmentController', () => {
  let controller: EnrollmentController;

  const mockEnrollmentService = {
    initiateEnrollment: jest.fn(),
    verifyAndCreateEnrollment: jest.fn(),
    getUserEnrollments: jest.fn(),
    isUserEnrolled: jest.fn(),
    handlePaymentWebhook: jest.fn(),
  };

  const mockPaystackService = {
    verifyWebhookSignature: jest.fn(),
    initializeTransaction: jest.fn(),
    verifyTransaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrollmentController],
      providers: [
        {
          provide: EnrollmentService,
          useValue: mockEnrollmentService,
        },
        {
          provide: PaystackService,
          useValue: mockPaystackService,
        },
      ],
    }).compile();

    controller = module.get<EnrollmentController>(EnrollmentController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateEnrollment', () => {
    it('should initiate enrollment successfully', async () => {
      const mockResult = {
        message: 'Payment initialized successfully',
        data: {
          authorization_url: 'https://checkout.paystack.com/abc123',
          access_code: 'abc123def456',
          reference: 'T1234567890',
          amount: 1500,
          currency: 'NGN',
          course: {
            id: 'course123',
            title: 'Web Development',
            description: 'Learn web development',
            imageUrl: null,
            instructor: 'Test Instructor',
          },
        },
      };

      mockEnrollmentService.initiateEnrollment.mockResolvedValue(mockResult);

      const dto = {
        email: 'student@email.com',
        courseId: 'course123',
      };

      const req = {
        user: {
          sub: 'user123',
          email: 'student@email.com',
        },
      };

      const result = await controller.initiateEnrollment(dto, req);

      expect(result).toEqual(mockResult);
      expect(mockEnrollmentService.initiateEnrollment).toHaveBeenCalledWith(
        dto,
        'user123',
      );
    });

    it('should pass correct userId from JWT token', async () => {
      const mockResult = {
        message: 'Payment initialized successfully',
        data: {} as any,
      };

      mockEnrollmentService.initiateEnrollment.mockResolvedValue(mockResult);

      const dto = {
        email: 'student@email.com',
        courseId: 'course123',
      };

      const req = {
        user: {
          sub: 'different-user-id',
        },
      };

      await controller.initiateEnrollment(dto, req);

      expect(mockEnrollmentService.initiateEnrollment).toHaveBeenCalledWith(
        dto,
        'different-user-id',
      );
    });
  });

  describe('verifyPayment', () => {
    it('should verify payment successfully', async () => {
      const mockResult = {
        message: 'Enrollment successful',
        enrollment: {
          id: 'enrollment123',
          userId: 'user123',
          courseId: 'course123',
          enrolledAt: new Date(),
        },
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
      };

      mockEnrollmentService.verifyAndCreateEnrollment.mockResolvedValue(
        mockResult,
      );

      const dto = {
        reference: 'T1234567890',
      };

      const result = await controller.verifyPayment(dto);

      expect(result).toEqual(mockResult);
      expect(
        mockEnrollmentService.verifyAndCreateEnrollment,
      ).toHaveBeenCalledWith('T1234567890');
    });
  });

  describe('getMyEnrollments', () => {
    it('should return user enrollments', async () => {
      const mockResult = {
        message: 'Enrollments retrieved successfully',
        data: [
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
        ],
      };

      mockEnrollmentService.getUserEnrollments.mockResolvedValue(mockResult);

      const req = {
        user: {
          sub: 'user123',
        },
      };

      const result = await controller.getMyEnrollments(req);

      expect(result).toEqual(mockResult);
      expect(mockEnrollmentService.getUserEnrollments).toHaveBeenCalledWith(
        'user123',
      );
    });
  });

  describe('checkEnrollment', () => {
    it('should return true if user is enrolled', async () => {
      mockEnrollmentService.isUserEnrolled.mockResolvedValue(true);

      const req = {
        user: {
          sub: 'user123',
        },
      };

      const result = await controller.checkEnrollment('course123', req);

      expect(result.isEnrolled).toBe(true);
      expect(result.message).toBe('You are enrolled in this course');
      expect(mockEnrollmentService.isUserEnrolled).toHaveBeenCalledWith(
        'user123',
        'course123',
      );
    });

    it('should return false if user is not enrolled', async () => {
      mockEnrollmentService.isUserEnrolled.mockResolvedValue(false);

      const req = {
        user: {
          sub: 'user123',
        },
      };

      const result = await controller.checkEnrollment('course123', req);

      expect(result.isEnrolled).toBe(false);
      expect(result.message).toBe('You are not enrolled in this course');
    });
  });

  describe('handlePaystackWebhook', () => {
    it('should process valid webhook successfully', async () => {
      const mockResult = {
        message: 'Enrollment created successfully',
        enrollment: {
          id: 'enrollment123',
          userId: 'user123',
          courseId: 'course123',
          enrolledAt: new Date(),
        },
      };

      mockPaystackService.verifyWebhookSignature.mockReturnValue(true);
      mockEnrollmentService.handlePaymentWebhook.mockResolvedValue(mockResult);

      const signature = 'valid_signature';
      const body = {
        event: 'charge.success',
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

      const result = await controller.handlePaystackWebhook(signature, body);

      expect(result).toEqual(mockResult);
      expect(mockPaystackService.verifyWebhookSignature).toHaveBeenCalledWith(
        signature,
        JSON.stringify(body),
      );
      expect(mockEnrollmentService.handlePaymentWebhook).toHaveBeenCalledWith(
        body,
      );
    });

    it('should throw BadRequestException if signature is missing', async () => {
      const body = {
        event: 'charge.success',
        data: {},
      };

      await expect(controller.handlePaystackWebhook('', body)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockEnrollmentService.handlePaymentWebhook).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if signature is invalid', async () => {
      mockPaystackService.verifyWebhookSignature.mockReturnValue(false);

      const signature = 'invalid_signature';
      const body = {
        event: 'charge.success',
        data: {},
      };

      await expect(
        controller.handlePaystackWebhook(signature, body),
      ).rejects.toThrow(BadRequestException);

      expect(mockEnrollmentService.handlePaymentWebhook).not.toHaveBeenCalled();
    });

    it('should verify signature with correct body format', async () => {
      mockPaystackService.verifyWebhookSignature.mockReturnValue(true);
      mockEnrollmentService.handlePaymentWebhook.mockResolvedValue({
        message: 'Success',
      } as any);

      const signature = 'valid_signature';
      const body = {
        event: 'charge.success',
        data: {
          status: 'success',
          reference: 'T1234567890',
        },
      };

      await controller.handlePaystackWebhook(signature, body);

      expect(mockPaystackService.verifyWebhookSignature).toHaveBeenCalledWith(
        signature,
        JSON.stringify(body),
      );
    });
  });
});
