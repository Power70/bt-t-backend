# Database Seed Script

This seed script populates your database with test data for easy enrollment module testing.

## Running the Seed Script

```bash
# Run the seed script
npm run prisma:seed

# Or use Prisma's built-in seed command
npx prisma db seed
```

## What Gets Created

### Users (Password: `Test1234!` for all)

- **Instructor 1**: `instructor1@test.com` - John Doe
- **Instructor 2**: `instructor2@test.com` - Jane Smith  
- **Student 1**: `student1@test.com` - Alice Johnson (already enrolled in 2 courses)
- **Student 2**: `student2@test.com` - Bob Williams (no enrollments - perfect for testing)
- **Admin**: `admin@test.com` - Admin User

### Categories

- Web Development
- Data Science
- Mobile Development

### Courses

1. **Complete Web Development Bootcamp** (Published)
   - Instructor: John Doe
   - Price: $99.99
   - 2 modules with 6 lessons total

2. **React for Beginners** (Published)
   - Instructor: John Doe
   - Price: $79.99
   - 2 modules with 5 lessons total

3. **Python for Data Science** (Published)
   - Instructor: Jane Smith
   - Price: $89.99
   - 2 modules with 4 lessons total

4. **Mobile App Development with React Native** (UNPUBLISHED)
   - Instructor: Jane Smith
   - Price: $119.99
   - 1 module with 1 lesson

### Existing Enrollments

- Alice Johnson (Student 1) is enrolled in:
  - Complete Web Development Bootcamp
  - React for Beginners

## Testing Scenarios

### 1. Successful Enrollment
Login as `student2@test.com` and enroll in any published course.

### 2. Duplicate Enrollment Prevention
Try to enroll `student1@test.com` in "Complete Web Development Bootcamp" (should fail - already enrolled).

### 3. Unpublished Course Restriction
Try to enroll in "Mobile App Development with React Native" (should fail if you have that validation).

### 4. View Enrollments
Login as `student1@test.com` and fetch their enrollments (should return 2 courses).

## API Testing Examples

### 1. Login
```bash
POST /auth/login
{
  "email": "student2@test.com",
  "password": "Test1234!"
}
```

### 2. Verify OTP (check email for code)
```bash
POST /auth/verify-otp
{
  "email": "student2@test.com",
  "otp": "123456"
}
```

### 3. Enroll in Course
```bash
POST /enrollment
Authorization: Bearer <your_token>
{
  "courseId": "<course_id_from_seed_output>"
}
```

### 4. Get My Enrollments
```bash
GET /enrollment/my-enrollments
Authorization: Bearer <your_token>
```

### 5. Get Course Details
```bash
GET /courses/<course_id>
```

## Notes

- The script **cleans existing data** before seeding. Comment out the cleanup section in `seed.ts` if you want to preserve existing data.
- All course IDs, user IDs, etc. are printed after seeding for easy copy-paste into API requests.
- Student 2 has no enrollments, making them ideal for testing new enrollments.
- Student 1 already has enrollments, perfect for testing duplicate enrollment prevention.

