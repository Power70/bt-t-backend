import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { EnrollmentService } from './enrollment.service';
import { InitiateEnrollmentDto } from './dto/initiate-enrollment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaystackService } from './services/paystack.service';
import { PaystackWebhookDto } from './dto/paystack-webhook.dto';

@ApiTags('Enrollments')
@Controller('enrollments')
export class EnrollmentController {
  constructor(
    private readonly enrollmentService: EnrollmentService,
    private readonly paystackService: PaystackService,
  ) {}

  /**
   * Initiate enrollment and payment process
   * POST /enrollments/initiate
   */
  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initiate enrollment',
    description:
      'Creates a Paystack payment transaction for course enrollment. Returns payment details including authorization URL and access code.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment initialized successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Payment initialized successfully',
        },
        data: {
          type: 'object',
          properties: {
            authorization_url: {
              type: 'string',
              example: 'https://checkout.paystack.com/abc123',
            },
            access_code: { type: 'string', example: 'abc123def456' },
            reference: { type: 'string', example: 'T1234567890' },
            amount: { type: 'number', example: 1500 },
            currency: { type: 'string', example: 'NGN' },
            course: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                imageUrl: { type: 'string' },
                instructor: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Invalid data, course not found, course not published, or email mismatch',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - User or course not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - User already enrolled in this course',
  })
  async initiateEnrollment(
    @Body() initiateEnrollmentDto: InitiateEnrollmentDto,
    @Request() req: any,
  ) {
    const userId = req.user.id as string;
    return this.enrollmentService.initiateEnrollment(
      initiateEnrollmentDto,
      userId,
    );
  }

  /**
   * Verify payment and complete enrollment
   * POST /enrollments/verify
   */
  @Post('verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify payment',
    description:
      'Verifies a Paystack transaction and creates the enrollment if payment was successful.',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollment created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Enrollment successful' },
        enrollment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            courseId: { type: 'string' },
            enrolledAt: { type: 'string', format: 'date-time' },
          },
        },
        course: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            imageUrl: { type: 'string' },
            instructor: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                email: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Payment not successful, invalid metadata, or amount mismatch',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found - Course not found',
  })
  async verifyPayment(@Body() verifyPaymentDto: VerifyPaymentDto) {
    return this.enrollmentService.verifyAndCreateEnrollment(
      verifyPaymentDto.reference,
    );
  }

  /**
   * Get user's enrollments
   * GET /enrollments/my-enrollments
   */
  @Get('my-enrollments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my enrollments',
    description:
      'Retrieves all enrollments for the authenticated user with course details.',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollments retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Enrollments retrieved successfully',
        },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              courseId: { type: 'string' },
              enrolledAt: { type: 'string', format: 'date-time' },
              course: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  imageUrl: { type: 'string' },
                  price: { type: 'number' },
                  instructor: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      email: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getMyEnrollments(@Request() req: any) {
    const userId = req.user.id as string;
    return this.enrollmentService.getUserEnrollments(userId);
  }

  /**
   * Check if user is enrolled in a course
   * GET /enrollments/check/:courseId
   */
  @Get('check/:courseId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check enrollment status',
    description:
      'Checks if the authenticated user is enrolled in a specific course.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'ID of the course to check',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollment status checked successfully',
    schema: {
      type: 'object',
      properties: {
        isEnrolled: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'You are enrolled in this course',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async checkEnrollment(
    @Param('courseId') courseId: string,
    @Request() req: any,
  ) {
    const userId = req.user.id as string;
    const isEnrolled = await this.enrollmentService.isUserEnrolled(
      userId,
      courseId,
    );

    return {
      isEnrolled,
      message: isEnrolled
        ? 'You are enrolled in this course'
        : 'You are not enrolled in this course',
    };
  }

  /**
   * Paystack webhook endpoint
   * POST /enrollments/webhook/paystack
   * This endpoint receives payment notifications from Paystack
   */
  @Post('webhook/paystack')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Paystack webhook',
    description:
      'Receives payment notifications from Paystack. This endpoint is called by Paystack servers.',
  })
  @ApiHeader({
    name: 'x-paystack-signature',
    description: 'Webhook signature for verification',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Enrollment created successfully',
        },
        enrollment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            courseId: { type: 'string' },
            enrolledAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Missing or invalid signature',
  })
  async handlePaystackWebhook(
    @Headers('x-paystack-signature') signature: string,
    @Body() body: any,
  ) {
    // Verify webhook signature
    if (!signature) {
      throw new BadRequestException('Missing webhook signature');
    }

    // Convert body to string for signature verification
    const bodyString = JSON.stringify(body);

    // Verify the signature
    const isValid = this.paystackService.verifyWebhookSignature(
      signature,
      bodyString,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Process the webhook
    const webhookData: PaystackWebhookDto = body;
    return this.enrollmentService.handlePaymentWebhook(webhookData);
  }
}
