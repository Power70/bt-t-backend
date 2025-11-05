# Admin Module Documentation

## Overview

The Admin Module provides a comprehensive set of RESTful API endpoints for Super Admins to manage and monitor the Learning Management System (LMS). All endpoints require **ADMIN** role authentication.

## Features

- ✅ **Full CRUD Operations** for Courses, Modules, and Lessons
- ✅ **Nested Resource Management** (Modules under Courses, Lessons under Modules)
- ✅ **Auto-ordering** for Modules and Lessons
- ✅ **Slug Generation** for Courses (auto-generated from title)
- ✅ **Progress Monitoring** (read-only analytics)
- ✅ **Category Management**
- ✅ **User Management** (Create Admins and Instructors)
- ✅ **Filtering and Pagination** on all list endpoints
- ✅ **Hard Delete** with cascade relationships
- ✅ **Comprehensive Swagger Documentation**

---

## Authentication

All endpoints require:
- **JWT Bearer Token** (via `Authorization: Bearer <token>`)
- **ADMIN Role** (enforced by `RolesGuard`)

**Headers:**
```
Authorization: Bearer <your-jwt-token>
```

---

## API Endpoints

### Base Route: `/admin`

## 1. Course Management

### 1.1 Create Course
**POST** `/admin/courses`

Creates a new course with auto-generated slug.

**Request Body:**
```json
{
  "title": "Introduction to TypeScript",
  "description": "Learn TypeScript from scratch",
  "imageUrl": "https://example.com/image.jpg",
  "price": 99.99,
  "instructorEmail": "instructor@example.com",
  "categoryName": "Web Development",
  "isPublished": false
}
```

> **Note:** `completionTime` is automatically calculated as the sum of all lesson completion times.

**Response:** `201 Created`
```json
{
  "id": "clx...",
  "title": "Introduction to TypeScript",
  "slug": "introduction-to-typescript",
  "description": "Learn TypeScript from scratch",
  "imageUrl": "https://example.com/image.jpg",
  "price": 99.99,
  "isPublished": false,
  "status": "NotStarted",
  "completionTime": 5400,
  "instructorId": "clx1234567890",
  "categoryId": "clx0987654321",
  "createdAt": "2025-11-05T10:00:00Z",
  "updatedAt": "2025-11-05T10:00:00Z",
  "instructor": {
    "id": "clx1234567890",
    "name": "Jane Doe",
    "email": "jane@example.com"
  },
  "category": {
    "id": "clx0987654321",
    "name": "Web Development"
  },
  "_count": {
    "modules": 0,
    "enrollments": 0
  }
}
```

---

### 1.2 Get All Courses (with Filtering & Pagination)
**GET** `/admin/courses`

**Query Parameters:**
- `page` (default: 1) - Page number
- `limit` (default: 10, max: 100) - Items per page
- `search` - **Universal search** across course title, instructor name/email, and category (partial match)
- `title` - Filter by course title only (partial match, case-insensitive)
- `instructor` - Filter by instructor name or email (partial match, case-insensitive)
- `category` - Filter by category name (partial match, case-insensitive)
- `isPublished` - Filter by published status (true/false)
- `status` - Filter by status (`NotStarted`, `InProgress`, `Completed`)

**Example Requests:**
```
# Universal search (searches across title, instructor, category)
GET /admin/courses?search=typescript

# Specific field filters
GET /admin/courses?title=typescript&instructor=john&category=Web&isPublished=true

# Combined
GET /admin/courses?search=typescript&isPublished=true&page=1&limit=10
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "clx...",
      "title": "Introduction to TypeScript",
      "slug": "introduction-to-typescript",
      // ... full course data
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

### 1.3 Get Course by ID
**GET** `/admin/courses/:id`

Retrieves a single course with all modules and lessons (nested).

**Response:** `200 OK`
```json
{
  "id": "clx...",
  "title": "Introduction to TypeScript",
  // ... course data
  "modules": [
    {
      "id": "clx...",
      "title": "Getting Started",
      "order": 0,
      "lessons": [
        {
          "id": "clx...",
          "title": "Introduction",
          "type": "VIDEO",
          "videoUrl": "https://...",
          "order": 0
        }
      ]
    }
  ]
}
```

---

### 1.4 Update Course
**PATCH** `/admin/courses/:id`

Updates a course. If `title` changes, slug is automatically regenerated.

**Request Body:** (all fields optional)
```json
{
  "title": "Advanced TypeScript",
  "price": 149.99,
  "isPublished": true
}
```

**Response:** `200 OK`

---

### 1.5 Delete Course
**DELETE** `/admin/courses/:id`

Deletes a course and all related modules, lessons, enrollments (cascade).

**Response:** `200 OK`
```json
{
  "message": "Course deleted successfully"
}
```

---

### 1.6 Publish/Unpublish Course
**PATCH** `/admin/courses/:id/publish`

**Request Body:**
```json
{
  "isPublished": true
}
```

**Response:** `200 OK`

---

## 2. Module Management

### 2.1 Create Module
**POST** `/admin/courses/:courseId/modules`

Creates a module for a course. Order is auto-calculated if not provided.

**Request Body:**
```json
{
  "title": "Getting Started",
  "order": 0  // optional
}
```

**Response:** `201 Created`

---

### 2.2 Get All Modules for a Course
**GET** `/admin/courses/:courseId/modules`

**Response:** `200 OK` - Array of modules ordered by `order` field

---

### 2.3 Get Module by ID
**GET** `/admin/modules/:id`

**Response:** `200 OK` - Module with all lessons

---

### 2.4 Update Module
**PATCH** `/admin/modules/:id`

**Request Body:**
```json
{
  "title": "Advanced Concepts",
  "order": 1
}
```

**Response:** `200 OK`

---

### 2.5 Delete Module
**DELETE** `/admin/modules/:id`

Deletes a module and all related lessons (cascade).

**Response:** `200 OK`

---

### 2.6 Reorder Modules
**PUT** `/admin/courses/:courseId/modules/reorder`

Reorders modules using a transaction for consistency.

**Request Body:**
```json
{
  "modules": [
    { "id": "clx111", "order": 0 },
    { "id": "clx222", "order": 1 },
    { "id": "clx333", "order": 2 }
  ]
}
```

**Response:** `200 OK`
```json
{
  "message": "Modules reordered successfully"
}
```

---

## 3. Lesson Management

### 3.1 Create Lesson
**POST** `/admin/modules/:moduleId/lessons`

Creates a lesson for a module. Order is auto-calculated if not provided.

**Request Body:**
```json
{
  "title": "Introduction to Variables",
  "type": "VIDEO",  // VIDEO, TEXT, or QUIZ
  "videoUrl": "https://youtube.com/watch?v=...",  // required for VIDEO
  "content": "Lesson content here...",  // required for TEXT/QUIZ
  "order": 0,  // optional
  "completionTime": 900  // optional, in seconds (15 minutes)
}
```

**Validation Rules:**
- `type: VIDEO` requires `videoUrl`
- `type: TEXT` or `type: QUIZ` requires `content`

**Response:** `201 Created`

---

### 3.2 Get All Lessons for a Module
**GET** `/admin/modules/:moduleId/lessons`

**Response:** `200 OK` - Array of lessons ordered by `order` field

---

### 3.3 Get Lesson by ID
**GET** `/admin/lessons/:id`

**Response:** `200 OK`

---

### 3.4 Update Lesson
**PATCH** `/admin/lessons/:id`

**Request Body:**
```json
{
  "title": "Advanced Variables",
  "type": "VIDEO",
  "videoUrl": "https://...",
  "completionTime": 20
}
```

**Type Change Handling:**
- Changing from `VIDEO` → `TEXT/QUIZ`: `videoUrl` is nulled
- Changing from `TEXT/QUIZ` → `VIDEO`: `content` is nulled

**Response:** `200 OK`

---

### 3.5 Delete Lesson
**DELETE** `/admin/lessons/:id`

Deletes a lesson and all user progress records (cascade).

**Response:** `200 OK`

---

### 3.6 Reorder Lessons
**PUT** `/admin/modules/:moduleId/lessons/reorder`

**Request Body:**
```json
{
  "lessons": [
    { "id": "clx111", "order": 0 },
    { "id": "clx222", "order": 1 },
    { "id": "clx333", "order": 2 }
  ]
}
```

**Response:** `200 OK`

---

## 4. Progress Monitoring (Read-Only)

### 4.1 Get Course Progress Summary
**GET** `/admin/courses/:courseId/progress`

Retrieves aggregate progress for all enrolled users in a course.

**Response:** `200 OK`
```json
{
  "courseId": "clx...",
  "courseTitle": "Introduction to TypeScript",
  "totalLessons": 25,
  "totalEnrollments": 150,
  "userProgress": [
    {
      "userId": "clx...",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "completedLessons": 15,
      "progressPercentage": 60.0
    },
    // ... more users
  ]
}
```

---

### 4.2 Get User Progress in Course
**GET** `/admin/courses/:courseId/progress/users/:userId`

Detailed progress breakdown for a specific user in a specific course.

**Response:** `200 OK`
```json
{
  "userId": "clx...",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "courseId": "clx...",
  "courseTitle": "Introduction to TypeScript",
  "totalLessons": 25,
  "completedLessons": 15,
  "progressPercentage": 60.0,
  "lessonProgress": [
    {
      "lessonId": "clx...",
      "lessonTitle": "Introduction",
      "lessonType": "VIDEO",
      "moduleTitle": "Getting Started",
      "order": 0,
      "isCompleted": true,
      "completedAt": "2025-11-01T10:00:00Z"
    },
    // ... all lessons
  ]
}
```

---

### 4.3 Get Progress Overview
**GET** `/admin/progress/overview`

Dashboard overview of progress across all courses.

**Response:** `200 OK`
```json
{
  "totalCourses": 50,
  "totalStudents": 1200,
  "totalEnrollments": 3500,
  "courseStats": [
    {
      "courseId": "clx...",
      "courseTitle": "Introduction to TypeScript",
      "totalLessons": 25,
      "enrollmentCount": 150,
      "averageProgress": 45.5
    },
    // ... more courses
  ]
}
```

---

## 5. Category Management

### 5.1 Create Category
**POST** `/admin/categories`

**Request Body:**
```json
{
  "name": "Web Development"
}
```

**Response:** `201 Created`

---

### 5.2 Get All Categories
**GET** `/admin/categories`

**Response:** `200 OK`
```json
[
  {
    "id": "clx...",
    "name": "Web Development",
    "_count": {
      "courses": 25
    }
  }
]
```

---

### 5.3 Update Category
**PATCH** `/admin/categories/:id`

**Request Body:**
```json
{
  "name": "Advanced Web Development"
}
```

**Response:** `200 OK`

---

### 5.4 Delete Category
**DELETE** `/admin/categories/:id`

**Note:** Can only delete categories with no associated courses.

**Response:** `200 OK` or `400 Bad Request`

---

## 6. User Management

### 6.1 Create Admin
**POST** `/admin/users/admins`

**Request Body:**
```json
{
  "email": "admin@example.com",
  "name": "Admin User",
  "password": "SecurePassword123!"
}
```

**Response:** `201 Created`
```json
{
  "message": "Admin account created successfully. Please check your email for verification code.",
  "user": {
    "id": "clx...",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "ADMIN",
    "isVerified": false
  }
}
```

> **Note:** A 6-digit OTP will be sent to the email address. The admin must verify their account using the `/auth/verify-otp` endpoint before they can log in.

---

### 6.2 Create Instructor
**POST** `/admin/users/instructors`

**Request Body:**
```json
{
  "email": "instructor@example.com",
  "name": "Instructor User",
  "password": "SecurePassword123!"
}
```

**Response:** `201 Created`
```json
{
  "message": "Instructor account created successfully. Please check your email for verification code.",
  "user": {
    "id": "clx...",
    "email": "instructor@example.com",
    "name": "Instructor User",
    "role": "INSTRUCTOR",
    "isVerified": false
  }
}
```

> **Note:** A 6-digit OTP will be sent to the email address. The instructor must verify their account using the `/auth/verify-otp` endpoint before they can log in.

---

### 6.3 Get All Users (with Filtering & Pagination)
**GET** `/admin/users`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 10, max: 100)
- `search` - **Universal search** across name and email (partial match)
- `name` - Filter by name only (partial match, case-insensitive)
- `email` - Filter by email only (partial match, case-insensitive)
- `role` - Filter by role (`STUDENT`, `INSTRUCTOR`, `ADMIN`)
- `isVerified` - Filter by verification status

**Example Requests:**
```
# Universal search
GET /admin/users?search=john

# Specific field filters
GET /admin/users?name=john&email=example.com&role=INSTRUCTOR

# Combined
GET /admin/users?search=john&role=INSTRUCTOR&isVerified=true&page=1&limit=20
```

**Response:** `200 OK` (paginated)

---

### 6.4 Get User by ID
**GET** `/admin/users/:id`

**Response:** `200 OK`
```json
{
  "id": "clx...",
  "email": "user@example.com",
  "name": "User Name",
  "role": "STUDENT",
  "isVerified": true,
  "createdAt": "2025-11-05T10:00:00Z",
  "updatedAt": "2025-11-05T10:00:00Z",
  "_count": {
    "taughtCourses": 5,
    "enrollments": 10,
    "progress": 250
  }
}
```

---

### 6.5 Update User
**PATCH** `/admin/users/:id`

**Request Body:** (all fields optional)
```json
{
  "email": "newemail@example.com",
  "name": "Updated Name",
  "password": "NewPassword123!",
  "role": "INSTRUCTOR",
  "isVerified": true
}
```

**Response:** `200 OK`

---

### 6.6 Delete User
**DELETE** `/admin/users/:id`

Deletes a user and all related data (enrollments, progress, etc.) via cascade.

**Response:** `200 OK`

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation error or bad input",
  "error": "Bad Request"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Resource already exists",
  "error": "Conflict"
}
```

---

## Technical Implementation

### Architecture
- **Single Controller:** `admin.controller.ts` - All endpoints
- **Single Service:** `admin.service.ts` - All business logic
- **DTOs:** Organized by resource (courses, modules, lessons, categories, users)
- **Entities:** For response serialization
- **Utils:** Slug generation helper

### Key Features
1. **Auto-ordering:** Modules and lessons auto-calculate order based on existing items
2. **Slug Generation:** Course slugs auto-generated from title with collision handling
3. **Type Safety:** Full TypeScript support with Prisma generated types
4. **Validation:** Class-validator decorators on all DTOs
5. **Transactions:** Reordering operations use Prisma transactions
6. **Cascade Delete:** Hard deletes with proper cascade relationships

### Dependencies
- `@nestjs/common`, `@nestjs/core`
- `@nestjs/swagger` - API documentation
- `@prisma/client` - Database ORM
- `bcrypt` - Password hashing
- `class-validator`, `class-transformer` - Validation

---

## Swagger Documentation

Access the interactive API documentation at:
```
http://localhost:3000/api
```

All admin endpoints are grouped under the **Admin** tag and require authentication.

---

## Security

- **JWT Authentication:** Required on all endpoints
- **Role-Based Access Control:** Only ADMIN role can access
- **Password Hashing:** bcrypt with salt rounds of 10
- **Auto-verification:** Admins and Instructors are auto-verified upon creation

---

## Database Schema Compliance

All operations strictly adhere to the Prisma schema:
- Respects relationships (Course → Module → Lesson)
- Honors unique constraints (slug, email, etc.)
- Utilizes cascade deletes properly
- Maintains data integrity with transactions

---

## Testing

Use the provided Swagger UI or tools like Postman/Insomnia to test endpoints.

**Example cURL:**
```bash
curl -X POST http://localhost:3000/admin/courses \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Course",
    "instructorEmail": "instructor@example.com",
    "categoryName": "Web Development"
  }'
```

---

## Support

For issues or questions, refer to:
- Main README: `../../README.md`
- Prisma Schema: `../../prisma/schema.prisma`
- API Docs: `http://localhost:3000/api`

---

**Built with ❤️ using NestJS + Prisma + PostgreSQL**

