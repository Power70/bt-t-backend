import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { PaystackService } from './paystack.service';
import axios from 'axios';
import * as crypto from 'crypto';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PaystackService', () => {
  let service: PaystackService;

  const createMockConfigService = (
    secretKey?: string,
    callbackUrl?: string,
  ) => ({
    get: jest.fn((key: string) => {
      const config: Record<string, string | undefined> = {
        PAYSTACK_SECRET_KEY:
          secretKey !== undefined ? secretKey : 'sk_test_123456789',
        PAYSTACK_CALLBACK_URL:
          callbackUrl !== undefined
            ? callbackUrl
            : 'https://example.com/callback',
      };
      return config[key];
    }),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaystackService,
        {
          provide: ConfigService,
          useValue: createMockConfigService(),
        },
      ],
    }).compile();

    service = module.get<PaystackService>(PaystackService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('initializeTransaction', () => {
    it('should initialize transaction successfully', async () => {
      const mockResponse = {
        data: {
          status: true,
          message: 'Authorization URL created',
          data: {
            authorization_url: 'https://checkout.paystack.com/abc123',
            access_code: 'abc123def456',
            reference: 'T1234567890',
          },
        },
      };

      mockedAxios.create = jest.fn().mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
        get: jest.fn(),
      });

      // Recreate service to use mocked axios
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaystackService,
          {
            provide: ConfigService,
            useValue: createMockConfigService(),
          },
        ],
      }).compile();

      service = module.get<PaystackService>(PaystackService);

      const result = await service.initializeTransaction(
        'test@email.com',
        150000,
        { courseId: 'course123' },
      );

      expect(result).toEqual(mockResponse.data);
      expect(result.status).toBe(true);
      expect(result.data.access_code).toBe('abc123def456');
    });

    it('should throw error when Paystack returns status false', async () => {
      const mockResponse = {
        data: {
          status: false,
          message: 'Invalid email address',
        },
      };

      mockedAxios.create = jest.fn().mockReturnValue({
        post: jest.fn().mockResolvedValue(mockResponse),
        get: jest.fn(),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaystackService,
          {
            provide: ConfigService,
            useValue: createMockConfigService(),
          },
        ],
      }).compile();

      service = module.get<PaystackService>(PaystackService);

      await expect(
        service.initializeTransaction('invalid', 150000, {}),
      ).rejects.toThrow();
    });

    it('should throw InternalServerErrorException on network error', async () => {
      mockedAxios.create = jest.fn().mockReturnValue({
        post: jest.fn().mockRejectedValue(new Error('Network error')),
        get: jest.fn(),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaystackService,
          {
            provide: ConfigService,
            useValue: createMockConfigService(),
          },
        ],
      }).compile();

      service = module.get<PaystackService>(PaystackService);

      await expect(
        service.initializeTransaction('test@email.com', 150000, {}),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('verifyTransaction', () => {
    it('should verify transaction successfully', async () => {
      const mockResponse = {
        data: {
          status: true,
          message: 'Verification successful',
          data: {
            id: 123456,
            status: 'success',
            reference: 'T1234567890',
            amount: 150000,
            metadata: {
              courseId: 'course123',
              userId: 'user123',
            },
          },
        },
      };

      mockedAxios.create = jest.fn().mockReturnValue({
        post: jest.fn(),
        get: jest.fn().mockResolvedValue(mockResponse),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaystackService,
          {
            provide: ConfigService,
            useValue: createMockConfigService(),
          },
        ],
      }).compile();

      service = module.get<PaystackService>(PaystackService);

      const result = await service.verifyTransaction('T1234567890');

      expect(result).toEqual(mockResponse.data);
      expect(result.data.status).toBe('success');
      expect(result.data.reference).toBe('T1234567890');
    });

    it('should throw error when verification fails', async () => {
      const mockResponse = {
        data: {
          status: false,
          message: 'Transaction not found',
        },
      };

      mockedAxios.create = jest.fn().mockReturnValue({
        post: jest.fn(),
        get: jest.fn().mockResolvedValue(mockResponse),
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaystackService,
          {
            provide: ConfigService,
            useValue: createMockConfigService(),
          },
        ],
      }).compile();

      service = module.get<PaystackService>(PaystackService);

      await expect(service.verifyTransaction('invalid')).rejects.toThrow();
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify valid webhook signature', () => {
      const body = JSON.stringify({ event: 'charge.success', data: {} });
      const hash = crypto
        .createHmac('sha512', 'sk_test_123456789')
        .update(body)
        .digest('hex');

      const result = service.verifyWebhookSignature(hash, body);

      expect(result).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const body = JSON.stringify({ event: 'charge.success', data: {} });
      const invalidSignature = 'invalid_signature';

      const result = service.verifyWebhookSignature(invalidSignature, body);

      expect(result).toBe(false);
    });

    it('should reject signature for modified body', () => {
      const body = JSON.stringify({ event: 'charge.success', data: {} });
      const hash = crypto
        .createHmac('sha512', 'sk_test_123456789')
        .update(body)
        .digest('hex');

      const modifiedBody = JSON.stringify({
        event: 'charge.success',
        data: { modified: true },
      });

      const result = service.verifyWebhookSignature(hash, modifiedBody);

      expect(result).toBe(false);
    });
  });
});
