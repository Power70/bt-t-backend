# Enrollment Module

This module handles student enrollment in courses with Paystack payment integration.

## Features

- **Payment Integration**: Secure payment processing with Paystack
- **Enrollment Management**: Automatic enrollment after successful payment
- **Webhook Support**: Real-time payment verification via Paystack webhooks
- **Security**: JWT authentication and webhook signature verification
- **Duplicate Prevention**: Prevents duplicate enrollments

## Environment Variables

Add the following environment variables to your `.env` file:


## API Endpoints

### 1. Initiate Enrollment
**POST** `/enrollments/initiate`

Initiates the enrollment process by creating a Paystack payment transaction.

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "email": "student@email.com",
  "courseId": "course_id_here"
}
```

**Response**:
```json
{
  "message": "Payment initialized successfully",
  "data": {
    "authorization_url": "https://checkout.paystack.com/...",
    "access_code": "access_code_here",
    "reference": "transaction_reference",
    "amount": 1500,
    "currency": "NGN",
    "course": {
      "id": "course_id",
      "title": "Web Development",
      "description": "Course description",
      "imageUrl": "course_image_url",
      "instructor": "Instructor Name"
    }
  }
}
```

### 2. Verify Payment
**POST** `/enrollments/verify`

Verifies payment and creates the enrollment.

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "reference": "transaction_reference"
}
```

**Response**:
```json
{
  "message": "Enrollment successful",
  "enrollment": {
    "id": "enrollment_id",
    "userId": "user_id",
    "courseId": "course_id",
    "enrolledAt": "2024-01-01T00:00:00.000Z"
  },
  "course": {
    "id": "course_id",
    "title": "Web Development",
    "description": "Course description",
    "imageUrl": "course_image_url",
    "instructor": {
      "name": "Instructor Name",
      "email": "instructor@email.com"
    }
  }
}
```

### 3. Get My Enrollments
**GET** `/enrollments/my-enrollments`

Retrieves all enrollments for the authenticated user.

**Authentication**: Required (JWT)

**Response**:
```json
{
  "message": "Enrollments retrieved successfully",
  "data": [
    {
      "id": "enrollment_id",
      "userId": "user_id",
      "courseId": "course_id",
      "enrolledAt": "2024-01-01T00:00:00.000Z",
      "course": {
        "id": "course_id",
        "title": "Web Development",
        "description": "Course description",
        "imageUrl": "course_image_url",
        "price": 1500,
        "instructor": {
          "name": "Instructor Name",
          "email": "instructor@email.com"
        }
      }
    }
  ]
}
```

### 4. Check Enrollment Status
**GET** `/enrollments/check/:courseId`

Checks if the authenticated user is enrolled in a specific course.

**Authentication**: Required (JWT)

**Response**:
```json
{
  "isEnrolled": true,
  "message": "You are enrolled in this course"
}
```

### 5. Paystack Webhook
**POST** `/enrollments/webhook/paystack`

Receives payment notifications from Paystack.

**Authentication**: Not required (verified via signature)

**Headers**:
- `x-paystack-signature`: Webhook signature from Paystack

**Request Body**: Paystack webhook payload

## Frontend Integration

### Using Popup JS (Recommended)

1. Install Paystack Popup JS:
```bash
npm i @paystack/inline-js
```

2. Import the library:
```javascript
import PaystackPop from '@paystack/inline-js';
```

3. Initiate enrollment and complete payment:
```javascript
// Step 1: Initiate enrollment
const response = await fetch('/enrollments/initiate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    email: 'student@email.com',
    courseId: 'course_id_here'
  })
});

const { data } = await response.json();

// Step 2: Complete payment with Popup
const popup = new PaystackPop();
popup.resumeTransaction(data.access_code);

// Step 3: Verify payment (call this after user returns from payment page)
const verifyResponse = await fetch('/enrollments/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    reference: data.reference
  })
});

const result = await verifyResponse.json();
console.log(result);
```

### Using CDN
```html
<script src="https://js.paystack.co/v1/inline.js"></script>

<script>
  // Use the same flow as above
  const popup = new PaystackPop();
  popup.resumeTransaction(access_code);
</script>
```

## Webhook Configuration

1. Go to your [Paystack Dashboard](https://dashboard.paystack.com/)
2. Navigate to Settings > Webhooks
3. Add your webhook URL: `https://your-domain.com/enrollments/webhook/paystack`
4. Select the `charge.success` event

**Important**: The webhook endpoint is secured with signature verification to ensure requests come from Paystack.

## Payment Flow

1. **Student clicks "Enroll"**
   - Frontend calls `/enrollments/initiate`
   - Backend verifies course availability and user eligibility
   - Backend initializes Paystack transaction
   - Backend returns `access_code` to frontend

2. **Payment Processing**
   - Frontend uses Paystack Popup with `access_code`
   - Student completes payment on Paystack checkout
   - Paystack processes the payment

3. **Payment Verification**
   - Option A: Frontend calls `/enrollments/verify` with reference
   - Option B: Paystack sends webhook to `/enrollments/webhook/paystack`
   - Backend verifies transaction with Paystack
   - Backend creates enrollment if payment successful

4. **Enrollment Complete**
   - Student gains access to course content

## Security Features

- **JWT Authentication**: All enrollment endpoints (except webhook) require authentication
- **Webhook Signature Verification**: Validates webhook requests are from Paystack
- **Amount Verification**: Ensures payment amount matches course price
- **Duplicate Prevention**: Prevents multiple enrollments for same course
- **Course Validation**: Verifies course exists and is published

## Error Handling

The module handles various error scenarios:

- Course not found
- Course not published
- User already enrolled
- Payment amount mismatch
- Invalid transaction reference
- Webhook signature mismatch
- Paystack API errors

All errors return appropriate HTTP status codes and descriptive messages.

## Testing

Use Paystack test keys for development:
- Test Secret Key: `sk_test_...`
- Test Public Key: `pk_test_...`

Test cards are available in [Paystack's documentation](https://paystack.com/docs/payments/test-payments/).

## Supported Payment Methods

Through Paystack, students can pay using:
- Debit/Credit Cards (Visa, Mastercard, Verve)
- Bank Transfer
- Mobile Money (where available)
- USSD
- QR Code

## Currency Support

Currently configured for NGN (Nigerian Naira). To support other currencies:
1. Update the currency in `EnrollmentService.initiateEnrollment()`
2. Ensure course prices are in the correct currency
3. Update frontend to display correct currency symbol

