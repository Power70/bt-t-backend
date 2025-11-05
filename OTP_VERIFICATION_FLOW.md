# 📧 OTP Verification Flow for Admin/Instructor Accounts

## Overview

Admin and Instructor accounts now follow the same secure OTP verification flow as regular user registrations. This ensures all accounts are properly verified before access is granted.

---

## 🔐 Security Flow

### 1. **Account Creation**
When an admin creates a new admin or instructor account:
- Account is created with `isVerified: false`
- 6-digit OTP is generated and stored
- Welcome email with OTP is sent to the user
- User cannot log in until verified

### 2. **Email Delivery**
The new user receives a welcome email containing:
- 6-digit verification code (OTP)
- Instructions to verify account
- OTP expiration notice (15 minutes)

### 3. **Account Verification**
The new user verifies their account using the existing auth flow:
```bash
POST /auth/verify-otp
{
  "email": "newadmin@example.com",
  "otp": "123456"
}
```

### 4. **First Login**
After verification, the user can log in:
```bash
POST /auth/login
{
  "email": "newadmin@example.com",
  "password": "SecurePassword123!"
}
```

---

## 📋 Complete Flow Example

### Step 1: Admin Creates New Admin Account

```bash
POST /admin/users/admins
Authorization: Bearer ADMIN_JWT_TOKEN
Content-Type: application/json

{
  "email": "newadmin@example.com",
  "name": "New Admin",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "message": "Admin account created successfully. Please check your email for verification code.",
  "user": {
    "id": "clx123...",
    "email": "newadmin@example.com",
    "name": "New Admin",
    "role": "ADMIN",
    "isVerified": false
  }
}
```

---

### Step 2: New Admin Receives Email

**Email Subject:** "Welcome! Please verify your account"

**Email Content:**
```
Welcome to BT&T Platform!

Your verification code is: 123456

This code will expire in 15 minutes.

Please use this code to verify your account and get started.
```

---

### Step 3: New Admin Verifies Account

```bash
POST /auth/verify-otp
Content-Type: application/json

{
  "email": "newadmin@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx123...",
    "email": "newadmin@example.com",
    "name": "New Admin",
    "role": "ADMIN",
    "isVerified": true,
    "createdAt": "2025-11-05T10:00:00Z",
    "updatedAt": "2025-11-05T10:00:00Z"
  }
}
```

✅ Account is now verified and the user receives a JWT token!

---

### Step 4: Subsequent Logins

For future logins, the user follows the standard MFA flow:

```bash
# 1. Login (triggers OTP email)
POST /auth/login
{
  "email": "newadmin@example.com",
  "password": "SecurePassword123!"
}

# Response: "Please check your email for verification code."

# 2. Verify OTP
POST /auth/verify-otp
{
  "email": "newadmin@example.com",
  "otp": "654321"
}

# Response: JWT token + user data
```

---

## 🔄 OTP Resend Flow

If the OTP expires or is not received:

```bash
POST /auth/resend-otp
Content-Type: application/json

{
  "email": "newadmin@example.com"
}
```

**Response:**
```json
{
  "message": "If an account with this email exists, a new verification code has been sent."
}
```

---

## ⏰ OTP Expiration

- **Validity:** 15 minutes
- **Single Use:** Each OTP can only be used once
- **Counter-based:** Uses HOTP (HMAC-based One-Time Password)
- **Unique:** Each OTP is unique and cannot be replayed

---

## 🎯 Key Features

### 1. **Consistent Security**
- ✅ Same OTP flow for all user types (Student, Instructor, Admin)
- ✅ No auto-verified accounts
- ✅ Email verification required for all

### 2. **HOTP Implementation**
- ✅ Uses `otplib` library
- ✅ 6-digit codes
- ✅ Counter-based (prevents replay attacks)
- ✅ Unique secret per user

### 3. **Email Integration**
- ✅ Uses existing `MailService`
- ✅ Professional email templates
- ✅ Clear expiration notices

### 4. **Database Tracking**
- ✅ `otp_secret` - User's unique OTP secret
- ✅ `otp_count` - Counter for HOTP generation
- ✅ `otp_generated_at` - Timestamp for expiration check
- ✅ `isVerified` - Account verification status

---

## 📊 Database Schema

Relevant fields in `User` model:
```prisma
model User {
  id               String    @id @default(cuid())
  email            String    @unique
  name             String
  password         String
  role             UserRole  @default(STUDENT)
  isVerified       Boolean   @default(false)
  otp_secret       String?
  otp_count        Int?      @default(0)
  otp_generated_at DateTime?
  // ... other fields
}
```

---

## 🔧 Technical Implementation

### OTP Generation Process:

1. **Generate/Retrieve Secret:**
   ```typescript
   otpSecret = crypto
     .randomBytes(20)
     .toString('base64')
     .replace(/[^A-Z2-7]/gi, '')
     .substring(0, 32);
   ```

2. **Initialize/Increment Counter:**
   ```typescript
   const newCounter = (currentCounter || randomBase) + 1;
   ```

3. **Generate OTP:**
   ```typescript
   const token = hotp.generate(otpSecret, newCounter);
   ```

4. **Store in Database:**
   ```typescript
   await prisma.user.update({
     where: { id: userId },
     data: {
       otp_secret: otpSecret,
       otp_count: newCounter,
       otp_generated_at: new Date(),
     },
   });
   ```

5. **Send Email:**
   ```typescript
   await mailService.sendWelcomeEmail(email, token);
   ```

---

## ⚠️ Important Notes

### For Admins Creating Accounts:

1. **Inform New Users:**
   - Tell them to check their email
   - Provide the verification endpoint
   - Mention 15-minute expiration

2. **OTP Not Auto-Provided:**
   - OTP is only sent via email
   - Not returned in API response (security)

3. **Account Status:**
   - `isVerified: false` until OTP verification
   - Cannot log in until verified

### For New Users:

1. **Check Email:**
   - Look for welcome email
   - Check spam folder if not received

2. **Verify Quickly:**
   - OTP expires in 15 minutes
   - Request new OTP if expired

3. **First Login:**
   - Use `/auth/login` after verification
   - Will receive another OTP for MFA

---

## 🚨 Error Handling

### Common Errors:

#### 1. **OTP Expired**
```json
{
  "statusCode": 401,
  "message": "OTP has expired, request a new one",
  "error": "Unauthorized"
}
```
**Solution:** Use `/auth/resend-otp`

#### 2. **Invalid OTP**
```json
{
  "statusCode": 401,
  "message": "Invalid OTP",
  "error": "Unauthorized"
}
```
**Solution:** Double-check the code or request new OTP

#### 3. **Email Already Exists**
```json
{
  "statusCode": 409,
  "message": "User with this email already exists",
  "error": "Conflict"
}
```
**Solution:** Use different email or update existing account

#### 4. **No OTP Request Found**
```json
{
  "statusCode": 401,
  "message": "No OTP request found",
  "error": "Unauthorized"
}
```
**Solution:** Create account first or resend OTP

---

## 📝 Admin Workflow Checklist

When creating a new admin/instructor:

- [ ] Call `POST /admin/users/admins` or `POST /admin/users/instructors`
- [ ] Inform the new user to check their email
- [ ] Provide them with the verification endpoint: `/auth/verify-otp`
- [ ] Remind them the OTP expires in 15 minutes
- [ ] If they don't receive email, they can use `/auth/resend-otp`
- [ ] After verification, they can login normally

---

## 🎨 Email Template

The welcome email uses the same template as regular registrations:

```html
<!DOCTYPE html>
<html>
<body>
  <h1>Welcome to BT&T Platform!</h1>
  <p>Your verification code is: <strong>{{otp}}</strong></p>
  <p>This code will expire in <strong>15 minutes</strong>.</p>
  <p>Please use this code to verify your account and get started.</p>
</body>
</html>
```

---

## ✅ Benefits

1. **Security:**
   - ✅ All accounts require email verification
   - ✅ No auto-verified privileged accounts
   - ✅ Prevents unauthorized access

2. **Consistency:**
   - ✅ Same flow for all user types
   - ✅ Familiar experience for users
   - ✅ Reuses existing auth infrastructure

3. **Auditability:**
   - ✅ Tracks when OTPs are generated
   - ✅ Verification timestamps
   - ✅ Clear account status (`isVerified`)

4. **User Experience:**
   - ✅ Professional welcome emails
   - ✅ Clear instructions
   - ✅ Easy OTP resend

---

## 🔗 Related Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /admin/users/admins` | Create admin account (sends OTP) |
| `POST /admin/users/instructors` | Create instructor account (sends OTP) |
| `POST /auth/verify-otp` | Verify OTP and activate account |
| `POST /auth/resend-otp` | Request new OTP |
| `POST /auth/login` | Login (triggers MFA OTP) |

---

**OTP verification ensures all accounts are secure and properly verified!** 🔐✨

