# Mail Module Documentation

## Overview
The Mail Module provides comprehensive email functionality using Nodemailer with Gmail SMTP and Google App Password authentication. It supports multiple email templates for different use cases like welcome emails, OTP verification, password resets, and custom emails.

## Features
- ✅ Gmail SMTP integration with Google App Password
- ✅ HTML email templates with responsive design
- ✅ OTP verification emails (welcome, login, password reset, resend)
- ✅ Environment variable configuration
- ✅ Error handling and comprehensive logging
- ✅ Health check and testing endpoints
- ✅ Custom email sending capability
- ✅ Template processing with variable substitution

## Setup Instructions

### 1. Google App Password Setup
Before using the mail service, you need to set up a Google App Password:

1. **Enable 2-Factor Authentication** on your Google account
2. Go to [Google Account Security Settings](https://myaccount.google.com/security)
3. Click on **"2-Step Verification"**
4. Scroll down and click on **"App passwords"**
5. Select **"Mail"** as the app type
6. Generate a 16-digit app password
7. Copy this password (without spaces) - you'll use it as `MAIL_PASSWORD`

### 2. Environment Variables
Create a `.env` file in your project root with the following variables:

```env
# Gmail SMTP Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false

# Gmail credentials - Use App Password, not regular password
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-16-digit-app-password

# From email configuration
MAIL_FROM_NAME=BT&T Platform
MAIL_FROM_EMAIL=your-email@gmail.com
```

### 3. Module Integration
The MailModule is already configured and ready to use. Import it in your main app module:

```typescript
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    // ... other modules
    MailModule,
  ],
  // ...
})
export class AppModule {}
```

## Usage Examples

### 1. Basic Email Operations
```typescript
import { MailService } from './mail/mail.service';

@Injectable()
export class AuthService {
  constructor(private readonly mailService: MailService) {}

  async registerUser(email: string) {
    const otp = this.generateOtp();
    
    // Send welcome email with OTP
    await this.mailService.sendWelcomeEmail(email, otp);
  }

  async loginUser(email: string) {
    const otp = this.generateOtp();
    
    // Send login OTP
    await this.mailService.sendLoginOtp(email, otp);
  }

  async resetPassword(email: string) {
    const otp = this.generateOtp();
    
    // Send password reset OTP
    await this.mailService.sendForgotPasswordOtp(email, otp);
  }
}
```

### 2. Custom Email Sending
```typescript
// Send custom email with template
await this.mailService.sendCustomEmail(
  'user@example.com',
  'Custom Subject',
  '<h1>Hello {{name}}!</h1><p>Welcome to {{platform}}</p>',
  { name: 'John', platform: 'BT&T' }
);
```

### 3. Health Check
```typescript
import { MailHealthService } from './mail/mail-health.service';

@Injectable()
export class HealthService {
  constructor(private readonly mailHealthService: MailHealthService) {}

  async checkServices() {
    const mailHealth = await this.mailHealthService.checkMailHealth();
    return { mail: mailHealth };
  }
}
```

## API Endpoints

### Health Check
- **GET** `/mail/health` - Check mail service health
- **POST** `/mail/test` - Send test email

### Email Operations
- **POST** `/mail/welcome` - Send welcome email with OTP
- **POST** `/mail/login-otp` - Send login OTP
- **POST** `/mail/forgot-password` - Send password reset OTP
- **POST** `/mail/resend-otp` - Resend OTP

## Email Templates

### 1. Welcome Email Template
- **Purpose**: Account verification during registration
- **Includes**: Welcome message, OTP code, security notice
- **Variables**: `{{otp}}`

### 2. Login OTP Template
- **Purpose**: Multi-factor authentication during login
- **Includes**: Security verification message, OTP code
- **Variables**: `{{otp}}`

### 3. Password Reset Template
- **Purpose**: Password reset verification
- **Includes**: Reset instructions, OTP code, security warning
- **Variables**: `{{otp}}`

### 4. OTP Resend Template
- **Purpose**: Resending expired OTP codes
- **Includes**: New code notice, expiration info
- **Variables**: `{{otp}}`

## Error Handling

The mail service includes comprehensive error handling:

- **MailConfigError**: Configuration issues (missing env vars, invalid settings)
- **EmailSendError**: Email sending failures (SMTP errors, network issues)
- **EmailTemplateError**: Template processing errors

All errors are logged with full stack traces for debugging.

## Security Features

- ✅ Google App Password authentication (more secure than regular passwords)
- ✅ TLS encryption for SMTP connections
- ✅ Input validation and sanitization
- ✅ Rate limiting ready (can be implemented at controller level)
- ✅ No sensitive data in logs (passwords are masked)

## Monitoring and Logging

The service provides detailed logging for:
- Email sending success/failure
- Configuration initialization
- Health check results
- Error details with stack traces

## Troubleshooting

### Common Issues

1. **"Authentication failed" error**
   - Ensure you're using Google App Password, not regular password
   - Verify 2FA is enabled on your Google account
   - Check that MAIL_USER and MAIL_PASSWORD are correct

2. **"Connection timeout" error**
   - Check your internet connection
   - Verify MAIL_HOST and MAIL_PORT settings
   - Ensure firewall allows SMTP connections

3. **"Invalid configuration" error**
   - Verify all required environment variables are set
   - Check .env file is in the correct location
   - Ensure ConfigModule is properly imported

### Testing
Use the health check endpoint to verify everything is working:
```bash
curl -X GET http://localhost:3000/mail/health
```

Send a test email:
```bash
curl -X POST http://localhost:3000/mail/test \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## Performance Considerations

- Connection pooling is handled automatically by Nodemailer
- Email templates are processed on-demand (consider caching for high volume)
- SMTP connections are reused for multiple emails
- Async operations prevent blocking the main thread

## Future Enhancements

Potential improvements:
- Email queue system for high volume
- Email analytics and tracking
- Multiple SMTP provider support
- Email template management UI
- Bounce and complaint handling
- Email scheduling functionality