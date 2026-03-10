export const welcomeEmailTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to BT&T</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #2c3e50;
        }
        .otp-container {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
            border-left: 4px solid #007bff;
        }
        .otp-code {
            font-size: 32px;
            font-weight: bold;
            color: #007bff;
            letter-spacing: 8px;
            margin: 10px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
        }
        .warning {
            background-color: #fff3cd;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Welcome!</div>
            <h2>Account Verification Required</h2>
        </div>
        
        <p>Hello,</p>

        <p>Thank you for joining BT&T! To complete your registration and secure your account, please verify your email address using the verification code below:</p>

        <div class="otp-container">
            <p><strong>Your Verification Code:</strong></p>
            <div class="otp-code">{{otp}}</div>
            <p>This code will expire in 15 minutes.</p>
        </div>
        
        <p>If you didn't create an account with us, please ignore this email or contact our support team.</p>
        
        <div class="warning">
            <strong>Security Notice:</strong> Never share this verification code with anyone. Our team will never ask for this code via phone or email.
        </div>
        
        <div class="footer">
            <p>Best regards,<br>The Support Team</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
`;

export const loginOtpTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Verification Code</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #2c3e50;
        }
        .otp-container {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
            border-left: 4px solid #28a745;
        }
        .otp-code {
            font-size: 32px;
            font-weight: bold;
            color: #28a745;
            letter-spacing: 8px;
            margin: 10px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
        }
        .warning {
            background-color: #fff3cd;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔐</div>
            <h2>Login Verification</h2>
        </div>
        
        <p>Hello,</p>
        
        <p>We detected a login attempt to your account. For your security, please use the verification code below to complete your login:</p>
        
        <div class="otp-container">
            <p><strong>Your Login Code:</strong></p>
            <div class="otp-code">{{otp}}</div>
            <p>This code will expire in 15 minutes.</p>
        </div>
        
        <p>If you didn't attempt to log in, please secure your account immediately by changing your password.</p>
        
        <div class="warning">
            <strong>Security Notice:</strong> Never share this verification code with anyone. Our team will never ask for this code via phone or email.
        </div>
        
        <div class="footer">
            <p>Best regards,<br>The Security Team</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
`;

export const forgotPasswordTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Verification</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #2c3e50;
        }
        .otp-container {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
            border-left: 4px solid #dc3545;
        }
        .otp-code {
            font-size: 32px;
            font-weight: bold;
            color: #dc3545;
            letter-spacing: 8px;
            margin: 10px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
        }
        .warning {
            background-color: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔑</div>
            <h2>Password Reset Request</h2>
        </div>
        
        <p>Hello,</p>
        
        <p>We received a request to reset your password. Use the verification code below to proceed with resetting your password:</p>
        
        <div class="otp-container">
            <p><strong>Your Reset Code:</strong></p>
            <div class="otp-code">{{otp}}</div>
            <p>This code will expire in 15 minutes.</p>
        </div>
        
        <p>If you didn't request a password reset, please ignore this email and ensure your account is secure.</p>
        
        <div class="warning">
            <strong>Important:</strong> If you didn't request this password reset, someone may be trying to access your account. Please change your password immediately and contact support.
        </div>
        
        <div class="footer">
            <p>Best regards,<br>The Security Team</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
`;

export const otpResendTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Code (Resent)</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #2c3e50;
        }
        .otp-container {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
            border-left: 4px solid #ffc107;
        }
        .otp-code {
            font-size: 32px;
            font-weight: bold;
            color: #ffc107;
            letter-spacing: 8px;
            margin: 10px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
        }
        .info {
            background-color: #d1ecf1;
            color: #0c5460;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔄</div>
            <h2>Verification Code (Resent)</h2>
        </div>
        
        <p>Hello,</p>
        
        <p>As requested, here's your new verification code:</p>
        
        <div class="otp-container">
            <p><strong>Your New Verification Code:</strong></p>
            <div class="otp-code">{{otp}}</div>
            <p>This code will expire in 15 minutes.</p>
        </div>
        
        <div class="info">
            <strong>Note:</strong> This is a resent verification code. Any previous codes are now invalid.
        </div>
        
        <div class="footer">
            <p>Best regards,<br>The Support Team</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
`;

export const instructorInvitationTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instructor Invitation - BT&T</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            color: #000051;
        }
        .invite-container {
            background-color: #f0f0ff;
            padding: 25px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
            border-left: 4px solid #000051;
        }
        .invite-btn {
            display: inline-block;
            background-color: #000051;
            color: #ffffff;
            text-decoration: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            margin: 15px 0;
        }
        .invite-link {
            word-break: break-all;
            color: #000051;
            font-size: 13px;
            margin-top: 10px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
        }
        .warning {
            background-color: #fff3cd;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">BT&T Platform</div>
            <h2>You've Been Invited as an Instructor!</h2>
        </div>
        
        <p>Hello,</p>

        <p>You have been invited to join the <strong>BT&T Platform</strong> as an instructor. Click the button below to create your instructor account:</p>

        <div class="invite-container">
            <p><strong>Set up your instructor account:</strong></p>
            <a href="{{inviteLink}}" class="invite-btn" target="_blank">Create My Account</a>
            <p class="invite-link">Or copy this link: {{inviteLink}}</p>
        </div>

        <p>This invitation link will expire in <strong>72 hours</strong>. If it expires, please contact your administrator to send a new invitation.</p>
        
        <div class="warning">
            <strong>Security Notice:</strong> This invitation is intended only for you. Do not share this link with anyone else.
        </div>
        
        <div class="footer">
            <p>Best regards,<br>The BT&T Team</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
`;
