# 🎯 Seed Data - Quick Reference for Testing

**Generated on:** October 31, 2025  
**Password for all users:** `Test1234!`

---

## 👥 Test Users

| Role | Email | ID | Name |
|------|-------|-----|------|
| Instructor | `instructor1@test.com` | `cmheqshxa00004m8kl7enl405` | John Doe |
| Instructor | `instructor2@test.com` | `cmheqshxn00014m8krh0sp04y` | Jane Smith |
| Student | `student1@test.com` | `cmheqshxq00024m8khsttohor` | Alice Johnson ⚠️ |
| Student | `student2@test.com` | `cmheqshxs00034m8kyukoxpt2` | Bob Williams ✅ |
| Admin | `admin@test.com` | `cmheqshxw00044m8k03f4z7s0` | Admin User |

**Legend:**
- ✅ = No enrollments (ideal for testing new enrollments)
- ⚠️ = Already has enrollments (use for testing duplicates)

---

## 🎓 Test Courses

### 1. Complete Web Development Bootcamp ✅ Published
```json
{
  "id": "cmheqshyg00094m8k5w2p0l2v",
  "slug": "complete-web-development-bootcamp",
  "title": "Complete Web Development Bootcamp",
  "price": 99.99,
  "instructor": "John Doe (instructor1@test.com)",
  "category": "Web Development",
  "modules": 2,
  "lessons": 6
}
```

### 2. React for Beginners ✅ Published
```json
{
  "id": "cmheqshzf000j4m8ka1v5g7xy",
  "slug": "react-for-beginners",
  "title": "React for Beginners",
  "price": 79.99,
  "instructor": "John Doe (instructor1@test.com)",
  "category": "Web Development",
  "modules": 2,
  "lessons": 5
}
```

### 3. Python for Data Science ✅ Published
```json
{
  "id": "cmheqshzr000s4m8kk2dpjl2z",
  "slug": "python-data-science",
  "title": "Python for Data Science",
  "price": 89.99,
  "instructor": "Jane Smith (instructor2@test.com)",
  "category": "Data Science",
  "modules": 2,
  "lessons": 4
}
```

### 4. Mobile App Development with React Native ⚠️ UNPUBLISHED
```json
{
  "id": "cmheqsi0100104m8ken5ba4w9",
  "slug": "react-native-mobile-dev",
  "title": "Mobile App Development with React Native",
  "price": 119.99,
  "instructor": "Jane Smith (instructor2@test.com)",
  "category": "Mobile Development",
  "modules": 1,
  "lessons": 1
}
```

---

## 📝 Existing Enrollments

- **Alice Johnson** (`student1@test.com`) is enrolled in:
  - Complete Web Development Bootcamp
  - React for Beginners

---

## 🧪 Test Scenarios

### Scenario 1: Successful New Enrollment ✅

**User:** Bob Williams (`student2@test.com`)  
**Course:** Any published course  
**Expected:** Success

```bash
# 1. Login
POST /auth/login
{
  "email": "student2@test.com",
  "password": "Test1234!"
}

# 2. Verify OTP (check email)
POST /auth/verify-otp
{
  "email": "student2@test.com",
  "otp": "YOUR_OTP_FROM_EMAIL"
}

# 3. Enroll in course
POST /enrollment
Authorization: Bearer YOUR_TOKEN
{
  "courseId": "cmheqshyg00094m8k5w2p0l2v"
}
```

### Scenario 2: Duplicate Enrollment Prevention ⚠️

**User:** Alice Johnson (`student1@test.com`)  
**Course:** Complete Web Development Bootcamp  
**Expected:** Error - Already enrolled

```bash
POST /enrollment
Authorization: Bearer ALICE_TOKEN
{
  "courseId": "cmheqshyg00094m8k5w2p0l2v"
}
```

### Scenario 3: View My Enrollments 📋

**User:** Alice Johnson (`student1@test.com`)  
**Expected:** Returns 2 courses

```bash
GET /enrollment/my-enrollments
Authorization: Bearer ALICE_TOKEN
```

### Scenario 4: Unpublished Course Restriction 🚫

**User:** Bob Williams (`student2@test.com`)  
**Course:** Mobile App Development (unpublished)  
**Expected:** Error - Course not published

```bash
POST /enrollment
Authorization: Bearer BOB_TOKEN
{
  "courseId": "cmheqsi0100104m8ken5ba4w9"
}
```

---

## 🔄 Re-running the Seed

To reset and re-seed the database:

```bash
npm run prisma:seed
```

**⚠️ Warning:** This will delete all existing data and create fresh test data with **new IDs**.

---

## 📚 Additional Resources

- Full seed documentation: See `prisma/SEED_README.md`
- Schema: See `prisma/schema.prisma`
- Seed script: See `prisma/seed.ts`

