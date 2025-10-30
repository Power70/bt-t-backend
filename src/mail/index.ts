// Mail Module Exports
export { MailModule } from './mail.module';
export { MailService } from './mail.service';

// Interfaces
export {
  MailConfig,
  EmailTemplate,
  SendEmailOptions,
} from './interfaces/mail-config.interface';

// Exceptions
export {
  MailConfigError,
  EmailSendError,
  EmailTemplateError,
} from './exceptions/mail.exceptions';

// Templates
export {
  welcomeEmailTemplate,
  loginOtpTemplate,
  forgotPasswordTemplate,
  otpResendTemplate,
} from './templates/email-templates';
