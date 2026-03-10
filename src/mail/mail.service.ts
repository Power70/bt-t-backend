import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import type { SentMessageInfo } from 'nodemailer';
import {
  MailConfig,
  SendEmailOptions,
} from './interfaces/mail-config.interface';
import { EmailSendError, MailConfigError } from './exceptions/mail.exceptions';
import {
  welcomeEmailTemplate,
  loginOtpTemplate,
  forgotPasswordTemplate,
  otpResendTemplate,
  instructorInvitationTemplate,
} from './templates/email-templates';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;
  private mailConfig: MailConfig;

  constructor(private readonly configService: ConfigService) {
    this.initializeMailConfig();
    this.createTransporter();
  }

  /**
   * Initialize mail configuration from environment variables
   */
  private initializeMailConfig(): void {
    try {
      this.mailConfig = {
        host: this.configService.get<string>('MAIL_HOST', 'smtp.gmail.com'),
        port: this.configService.get<number>('MAIL_PORT', 587),
        secure: this.configService.get<boolean>('MAIL_SECURE', false),
        auth: {
          user: this.configService.getOrThrow<string>('MAIL_USER'),
          pass: this.configService.getOrThrow<string>('MAIL_PASSWORD'),
        },
        from: {
          name: this.configService.get<string>(
            'MAIL_FROM_NAME',
            'BT&T Platform',
          ),
          email: this.configService.getOrThrow<string>('MAIL_FROM_EMAIL'),
        },
      };

      this.logger.log('Mail configuration initialized successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new MailConfigError(
        `Failed to initialize mail configuration: ${msg}`,
      );
    }
  }

  /**
   * Create nodemailer transporter
   */
  private createTransporter(): void {
    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail', // Use Gmail service preset
        auth: {
          user: this.mailConfig.auth.user,
          pass: this.mailConfig.auth.pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      this.logger.log('Nodemailer transporter created successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new MailConfigError(`Failed to create mail transporter: ${msg}`);
    }
  }

  /**
   * Verify transporter connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Mail server connection verified');
      return true;
    } catch (error) {
      this.logger.error(
        'Mail server connection failed',
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  /**
   * Send email with template
   */
  private async sendEmail(options: SendEmailOptions): Promise<void> {
    const mailOptions = {
      from: `"${this.mailConfig.from.name}" <${this.mailConfig.from.email}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    try {
      const info: SentMessageInfo =
        await this.transporter.sendMail(mailOptions);

      this.logger.log(`Email sent successfully to ${options.to}`, {
        messageId: info.messageId,
        // some transports include a response string
        response: info.response,
      });
    } catch (err: unknown) {
      this.logger.error(
        `Failed to send email to ${options.to}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new EmailSendError(
        `Failed to send email to ${options.to}: ${
          err instanceof Error ? err.message : String(err)
        }`,
        err instanceof Error ? err : undefined,
      );
    }
  }

  /**
   * Replace template placeholders with actual values
   */
  private processTemplate(
    template: string,
    context: Record<string, any>,
  ): string {
    let processedTemplate = template;

    Object.keys(context).forEach((key) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      processedTemplate = processedTemplate.replace(
        placeholder,
        String(context[key]),
      );
    });

    return processedTemplate;
  }

  /**
   * Send welcome email with OTP for account verification
   */
  async sendWelcomeEmail(email: string, otp: string): Promise<void> {
    const html = this.processTemplate(welcomeEmailTemplate, { otp });

    await this.sendEmail({
      to: email,
      subject: 'Welcome! Please verify your account',
      html,
      text: `Welcome! Your verification code is: ${otp}. This code will expire in 15 minutes.`,
    });
  }

  /**
   * Send login OTP email for MFA
   */
  async sendLoginOtp(email: string, otp: string): Promise<void> {
    try {
      const html = this.processTemplate(loginOtpTemplate, { otp });

      await this.sendEmail({
        to: email,
        subject: 'Your login verification code',
        html,
        text: `Your login verification code is: ${otp}. This code will expire in 15 minutes.`,
      });
    } catch {
      throw new BadRequestException('Failed to send login OTP');
    }
  }

  /**
   * Send OTP resend email
   */
  async sendOtpResend(email: string, otp: string): Promise<void> {
    try {
      const html = this.processTemplate(otpResendTemplate, { otp });

      await this.sendEmail({
        to: email,
        subject: 'Your verification code (resent)',
        html,
        text: `Your new verification code is: ${otp}. This code will expire in 15 minutes. Previous codes are now invalid.`,
      });
    } catch {
      throw new BadRequestException('Failed to send OTP resend email');
    }
  }

  /**
   * Send forgot password OTP email
   */
  async sendForgotPasswordOtp(email: string, otp: string): Promise<void> {
    try {
      const html = this.processTemplate(forgotPasswordTemplate, { otp });

      await this.sendEmail({
        to: email,
        subject: 'Password reset verification code',
        html,
        text: `Your password reset verification code is: ${otp}. This code will expire in 15 minutes.`,
      });
    } catch {
      throw new BadRequestException('Failed to send forgot password OTP');
    }
  }

  /**
   * Send instructor invitation email with signup link
   */
  async sendInstructorInvitation(
    email: string,
    inviteLink: string,
  ): Promise<void> {
    try {
      const html = this.processTemplate(instructorInvitationTemplate, {
        inviteLink,
      });

      await this.sendEmail({
        to: email,
        subject: "You're Invited to Join BT&T as an Instructor!",
        html,
        text: `You've been invited to join BT&T Platform as an instructor. Create your account here: ${inviteLink}. This link expires in 72 hours.`,
      });
    } catch {
      throw new BadRequestException(
        'Failed to send instructor invitation email',
      );
    }
  }

  /**
   * Send custom email with template
   */
  async sendCustomEmail(
    to: string,
    subject: string,
    template: string,
    context: Record<string, any> = {},
  ): Promise<void> {
    try {
      const html = this.processTemplate(template, context);

      await this.sendEmail({
        to,
        subject,
        html,
      });
    } catch {
      throw new BadRequestException('Failed to send custom email');
    }
  }
}
