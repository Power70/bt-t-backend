import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  /**
   * Send welcome email with OTP for account verification
   */
  async sendWelcomeEmail(email: string, otp: string): Promise<void> {
    // In a real implementation, this would use a service like SendGrid, SES, etc.
    this.logger.log(`[PLACEHOLDER] Sending welcome email to ${email}`);
    this.logger.log(`[PLACEHOLDER] OTP: ${otp}`);
    this.logger.log(`[PLACEHOLDER] Subject: Welcome! Please verify your account`);
    this.logger.log(`[PLACEHOLDER] Body: Your verification code is: ${otp}`);
    
    // Simulate async email sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send login OTP email for MFA
   */
  async sendLoginOtp(email: string, otp: string): Promise<void> {
    // In a real implementation, this would use a service like SendGrid, SES, etc.
    this.logger.log(`[PLACEHOLDER] Sending login OTP to ${email}`);
    this.logger.log(`[PLACEHOLDER] OTP: ${otp}`);
    this.logger.log(`[PLACEHOLDER] Subject: Your login verification code`);
    this.logger.log(`[PLACEHOLDER] Body: Your login verification code is: ${otp}`);
    
    // Simulate async email sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send OTP resend email
   */
  async sendOtpResend(email: string, otp: string): Promise<void> {
    // In a real implementation, this would use a service like SendGrid, SES, etc.
    this.logger.log(`[PLACEHOLDER] Sending OTP resend to ${email}`);
    this.logger.log(`[PLACEHOLDER] OTP: ${otp}`);
    this.logger.log(`[PLACEHOLDER] Subject: Your verification code (resent)`);
    this.logger.log(`[PLACEHOLDER] Body: Your verification code is: ${otp}`);
    
    // Simulate async email sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send forgot password OTP email
   */
  async sendForgotPasswordOtp(email: string, otp: string): Promise<void> {
    // In a real implementation, this would use a service like SendGrid, SES, etc.
    this.logger.log(`[PLACEHOLDER] Sending forgot password OTP to ${email}`);
    this.logger.log(`[PLACEHOLDER] OTP: ${otp}`);
    this.logger.log(`[PLACEHOLDER] Subject: Password reset verification code`);
    this.logger.log(`[PLACEHOLDER] Body: Your password reset verification code is: ${otp}`);
    
    // Simulate async email sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}