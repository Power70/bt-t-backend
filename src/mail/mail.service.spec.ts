import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { EmailSendError } from './exceptions/mail.exceptions';

// Mock nodemailer
const mockTransporter = {
  sendMail: jest.fn(),
  verify: jest.fn(),
};

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => mockTransporter),
}));

describe('MailService', () => {
  let service: MailService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        MAIL_HOST: 'smtp.gmail.com',
        MAIL_PORT: 587,
        MAIL_SECURE: false,
        MAIL_FROM_NAME: 'Test Platform',
      };
      return config[key] || defaultValue;
    }),
    getOrThrow: jest.fn((key: string) => {
      const config = {
        MAIL_USER: 'test@example.com',
        MAIL_PASSWORD: 'test-password',
        MAIL_FROM_EMAIL: 'test@example.com',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with OTP', async () => {
      const email = 'user@example.com';
      const otp = '123456';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: 'Email sent successfully',
      });

      await service.sendWelcomeEmail(email, otp);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: 'Welcome! Please verify your account',
          html: expect.stringContaining(otp),
        }),
      );
    });

    it('should throw EmailSendError when sending fails', async () => {
      const email = 'user@example.com';
      const otp = '123456';

      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP Error'));

      await expect(service.sendWelcomeEmail(email, otp)).rejects.toThrow(
        EmailSendError,
      );
    });
  });

  describe('sendLoginOtp', () => {
    it('should send login OTP email', async () => {
      const email = 'user@example.com';
      const otp = '654321';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: 'Email sent successfully',
      });

      await service.sendLoginOtp(email, otp);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: 'Your login verification code',
          html: expect.stringContaining(otp),
        }),
      );
    });
  });

  describe('verifyConnection', () => {
    it('should return true when connection is successful', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await service.verifyConnection();

      expect(result).toBe(true);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });

    it('should return false when connection fails', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('Connection failed'));

      const result = await service.verifyConnection();

      expect(result).toBe(false);
      expect(mockTransporter.verify).toHaveBeenCalled();
    });
  });

  describe('sendCustomEmail', () => {
    it('should send custom email with template processing', async () => {
      const email = 'user@example.com';
      const subject = 'Custom Email';
      const template = 'Hello {{name}}, welcome to {{platform}}!';
      const context = { name: 'John', platform: 'BT&T' };

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: 'Email sent successfully',
      });

      await service.sendCustomEmail(email, subject, template, context);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: subject,
          html: 'Hello John, welcome to BT&T!',
        }),
      );
    });
  });

  describe('sendForgotPasswordOtp', () => {
    it('should send forgot password OTP email', async () => {
      const email = 'user@example.com';
      const otp = '789012';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: 'Email sent successfully',
      });

      await service.sendForgotPasswordOtp(email, otp);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: 'Password reset verification code',
          html: expect.stringContaining(otp),
        }),
      );
    });
  });

  describe('sendOtpResend', () => {
    it('should send OTP resend email', async () => {
      const email = 'user@example.com';
      const otp = '345678';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'test-message-id',
        response: 'Email sent successfully',
      });

      await service.sendOtpResend(email, otp);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: 'Your verification code (resent)',
          html: expect.stringContaining(otp),
        }),
      );
    });
  });
});
