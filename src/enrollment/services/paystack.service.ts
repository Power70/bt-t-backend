import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import {
  PaystackInitializeResponse,
  PaystackVerifyResponse,
} from '../interfaces/paystack-response.interface';

@Injectable()
export class PaystackService {
  private readonly paystackClient: AxiosInstance;
  private readonly secretKey: string;
  private readonly callbackUrl: string;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    const callbackUrl = this.configService.get<string>('PAYSTACK_CALLBACK_URL');

    if (!secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not defined in environment');
    }

    if (!callbackUrl) {
      throw new Error('PAYSTACK_CALLBACK_URL is not defined in environment');
    }

    this.secretKey = secretKey;
    this.callbackUrl = callbackUrl;

    this.paystackClient = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Initialize a payment transaction with Paystack
   * @param email Customer's email
   * @param amount Amount in the lowest currency unit (kobo for NGN, cents for USD)
   * @param metadata Additional data to attach to the transaction
   * @returns PaystackInitializeResponse containing access_code and authorization_url
   */
  async initializeTransaction(
    email: string,
    amount: number,
    metadata: Record<string, any> = {},
  ): Promise<PaystackInitializeResponse> {
    try {
      const response =
        await this.paystackClient.post<PaystackInitializeResponse>(
          '/transaction/initialize',
          {
            email,
            amount,
            callback_url: this.callbackUrl,
            metadata,
          },
        );

      if (!response.data.status) {
        throw new BadRequestException(
          response.data.message || 'Failed to initialize transaction',
        );
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new BadRequestException(
          error.response.data?.message || 'Failed to initialize payment',
        );
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'An error occurred while initializing payment',
      );
    }
  }

  /**
   * Verify a transaction using the reference
   * @param reference Transaction reference
   * @returns PaystackVerifyResponse with transaction details
   */
  async verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
    try {
      const response = await this.paystackClient.get<PaystackVerifyResponse>(
        `/transaction/verify/${reference}`,
      );

      if (!response.data.status) {
        throw new BadRequestException(
          response.data.message || 'Transaction verification failed',
        );
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new BadRequestException(
          error.response.data?.message || 'Failed to verify transaction',
        );
      }

      throw new InternalServerErrorException(
        'An error occurred while verifying transaction',
      );
    }
  }

  /**
   * Verify webhook signature to ensure the request is from Paystack
   * @param signature x-paystack-signature header value
   * @param body Request body
   * @returns boolean indicating if the signature is valid
   */
  verifyWebhookSignature(signature: string, body: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(body)
      .digest('hex');

    return hash === signature;
  }
}
