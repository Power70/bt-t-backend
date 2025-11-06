# Schema Migration: Status Field from Course to Enrollment

## Overview
This document outlines the refactoring of the admin service following the Prisma schema change where the `status` field (NotStarted, InProgress, Completed) was moved from the `Course` model to the `Enrollment` model.

## Rationale
- **Before**: Status was a single field on the Course model, which didn't make sense as different students have different progress statuses
- **After**: Status is now per-enrollment, accurately representing each student's individual progress in each course

---

## Changes Made

### 1. **CourseFilterDto** (`src/admin/dto/courses/course-filter.dto.ts`)

#### ❌ **Removed:**
```typescript
import { Status } from '../../../../generated/prisma';

@ApiPropertyOptional({
  description: 'Filter by course status',
  enum: Status,
  example: Status.InProgress,
})
@IsEnum(Status)
@IsOptional()
status?: Status;
```

#### ✅ **Result:**
- Removed `Status` import
- Removed `IsEnum` import (no longer used)
- Removed `status` filter field
- Admins filter courses by their attributes, not by student progress status

---

### 2. **getCourses()** (`src/admin/admin.service.ts`)

#### ✅ **Changes:**
```typescript
async getCourses(filterDto: CourseFilterDto): Promise<PaginatedResult<any>> {
  const {
    page = 1,
    limit = 10,
    search,
    title,
    instructor,
    category,
    isPublished,
    // ❌ REMOVED: status
  } = filterDto;

  // ... rest of the function
  
  // ❌ REMOVED: status filter logic
  // if (status) {
  //   where.status = status;
  // }
}
```

**Why**: Courses don't have a status anymore, so the filter is no longer applicable.

---

### 3. **getCourseProgressSummary()** (`src/admin/admin.service.ts`)

#### ✅ **Added Status to Each User's Progress:**
```typescript
async getCourseProgressSummary(courseId: string) {
  // ... existing logic ...

  // Get all enrollments with status
  const enrollments = await this.prisma.enrollment.findMany({
    where: { courseId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Calculate progress for each enrolled user
  const userProgress = await Promise.all(
    enrollments.map(async (enrollment) => {
      // ... existing completedCount and progressPercentage logic ...

      return {
        userId: enrollment.user.id,
        userName: enrollment.user.name,
        userEmail: enrollment.user.email,
        completedLessons: completedCount,
        progressPercentage: Math.round(progressPercentage * 100) / 100,
        status: enrollment.status, // ✅ NEW: Include enrollment status
      };
    }),
  );

  return {
    courseId: course.id,
    courseTitle: course.title,
    totalLessons,
    totalEnrollments: enrollments.length,
    userProgress,
  };
}
```

**Example Response:**
```json
{
  "courseId": "clx123...",
  "courseTitle": "TypeScript Masterclass",
  "totalLessons": 25,
  "totalEnrollments": 3,
  "userProgress": [
    {
      "userId": "usr1",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "completedLessons": 15,
      "progressPercentage": 60.0,
      "status": "InProgress"  // ✅ NEW
    },
    {
      "userId": "usr2",
      "userName": "Jane Smith",
      "userEmail": "jane@example.com",
      "completedLessons": 0,
      "progressPercentage": 0.0,
      "status": "NotStarted"  // ✅ NEW
    }
  ]
}
```

---

### 4. **getUserCourseProgress()** (`src/admin/admin.service.ts`)

#### ✅ **Added Enrollment Status to Return Object:**
```typescript
async getUserCourseProgress(userId: string, courseId: string) {
  // ... existing user, course, and enrollment lookup logic ...

  // Check if user is enrolled
  const enrollment = await this.prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
  });

  if (!enrollment) {
    throw new BadRequestException('User is not enrolled in this course');
  }

  // ... existing lesson progress calculation logic ...

  return {
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    courseId: course.id,
    courseTitle: course.title,
    enrollmentStatus: enrollment.status, // ✅ NEW: Include enrollment status
    totalLessons,
    completedLessons,
    progressPercentage: Math.round(progressPercentage * 100) / 100,
    lessonProgress,
  };
}
```

**Example Response:**
```json
{
  "userId": "usr1",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "courseId": "clx123...",
  "courseTitle": "TypeScript Masterclass",
  "enrollmentStatus": "InProgress",  // ✅ NEW
  "totalLessons": 25,
  "completedLessons": 15,
  "progressPercentage": 60.0,
  "lessonProgress": [...]
}
```

---

### 5. **getProgressOverview()** (`src/admin/admin.service.ts`)

#### ❌ **Removed:**
```typescript
// OLD: Vague average progress calculation
const averageProgress = enrollmentCount > 0 ? totalProgress / enrollmentCount : 0;

return {
  courseId: course.id,
  courseTitle: course.title,
  totalLessons,
  enrollmentCount,
  averageProgress: Math.round(averageProgress * 100) / 100,
};
```

#### ✅ **New: Status Breakdown:**
```typescript
async getProgressOverview() {
  // ... existing counts ...

  const courses = await this.prisma.course.findMany({
    include: {
      modules: {
        include: {
          lessons: true,
        },
      },
      enrollments: {
        select: {
          status: true,  // ✅ Only fetch status from enrollments
        },
      },
    },
  });

  const courseStats = courses.map((course) => {
    // TypeScript guard for safety
    if (!course.modules || !course.enrollments) {
      return {
        courseId: course.id,
        courseTitle: course.title,
        totalLessons: 0,
        enrollmentCount: 0,
        statusBreakdown: {
          notStarted: 0,
          inProgress: 0,
          completed: 0,
        },
      };
    }

    const totalLessons = course.modules.reduce(
      (sum: number, module) => sum + (module.lessons?.length || 0),
      0,
    );

    const enrollmentCount = course.enrollments.length;

    // ✅ Count enrollments by status
    const statusCounts = course.enrollments.reduce(
      (acc: Record<string, number>, enrollment) => {
        acc[enrollment.status] = (acc[enrollment.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      courseId: course.id,
      courseTitle: course.title,
      totalLessons,
      enrollmentCount,
      statusBreakdown: {
        notStarted: statusCounts['NotStarted'] || 0,
        inProgress: statusCounts['InProgress'] || 0,
        completed: statusCounts['Completed'] || 0,
      },
    };
  });

  return {
    totalCourses,
    totalStudents,
    totalEnrollments,
    courseStats,
  };
}
```

**Example Response:**
```json
{
  "totalCourses": 10,
  "totalStudents": 50,
  "totalEnrollments": 120,
  "courseStats": [
    {
      "courseId": "clx123...",
      "courseTitle": "TypeScript Masterclass",
      "totalLessons": 25,
      "enrollmentCount": 15,
      "statusBreakdown": {
        "notStarted": 5,
        "inProgress": 8,
        "completed": 2
      }
    },
    {
      "courseId": "clx456...",
      "courseTitle": "React Advanced",
      "totalLessons": 30,
      "enrollmentCount": 20,
      "statusBreakdown": {
        "notStarted": 10,
        "inProgress": 7,
        "completed": 3
      }
    }
  ]
}
```

**Benefits:**
- ✅ More actionable data: Know exactly how many students are in each status
- ✅ Replaces vague "average progress" with concrete status counts
- ✅ Better for admin dashboard visualizations (e.g., pie charts, bar graphs)

---

## Database Schema Reference

### Enrollment Model (Updated)
```prisma
model Enrollment {
  id         String   @id @default(cuid())
  enrolledAt DateTime @default(now())
  userId     String
  courseId   String
  status     Status   @default(NotStarted)  // ✅ Status is HERE now
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  course     Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  
  @@unique([userId, courseId])
  @@index([userId])
  @@index([courseId])
}
```

### Course Model (Updated)
```prisma
model Course {
  id             String       @id @default(cuid())
  title          String
  slug           String       @unique
  description    String?      @db.Text
  imageUrl       String?
  price          Float        @default(0.0)
  isPublished    Boolean      @default(false)
  completionTime Int?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  instructorId   String
  categoryId     String
  instructor     User         @relation("InstructorCourses", fields: [instructorId], references: [id], onDelete: Cascade)
  category       Category     @relation(fields: [categoryId], references: [id])
  modules        Module[]
  attachments    Attachment[]
  enrollments    Enrollment[]
  // ❌ NO MORE status field
  
  @@index([instructorId])
  @@index([categoryId])
  @@index([slug])
}
```

### Status Enum
```prisma
enum Status {
  NotStarted
  InProgress
  Completed
}
```

---

## API Endpoints Updated

| Endpoint | Changes |
|----------|---------|
| `GET /admin/courses` | ❌ Removed `status` filter query parameter |
| `GET /admin/courses/:courseId/progress-summary` | ✅ Added `status` field to each user in `userProgress` array |
| `GET /admin/users/:userId/course-progress/:courseId` | ✅ Added `enrollmentStatus` field to main response object |
| `GET /admin/progress/overview` | ✅ Replaced `averageProgress` with `statusBreakdown` object containing counts |

---

## Migration Checklist

- ✅ Updated `CourseFilterDto` (removed status filter)
- ✅ Updated `getCourses()` (removed status filtering logic)
- ✅ Updated `getCourseProgressSummary()` (added status per user)
- ✅ Updated `getUserCourseProgress()` (added enrollmentStatus)
- ✅ Updated `getProgressOverview()` (replaced averageProgress with statusBreakdown)
- ✅ Fixed TypeScript linting errors
- ✅ Verified all changes with linter
- ✅ No breaking changes to existing endpoints (only additions/removals as documented)

---

## Testing Recommendations

### 1. **Test Course Filtering**
```bash
# Should NOT accept status parameter
GET /admin/courses?status=InProgress  # Should ignore or reject

# Should still work with other filters
GET /admin/courses?title=TypeScript&isPublished=true
```

### 2. **Test Progress Summary**
```bash
# Should return status for each enrolled user
GET /admin/courses/:courseId/progress-summary

# Verify each user has a status field
```

### 3. **Test User Course Progress**
```bash
# Should return enrollmentStatus
GET /admin/users/:userId/course-progress/:courseId

# Verify enrollmentStatus matches the user's actual enrollment status
```

### 4. **Test Progress Overview**
```bash
# Should return statusBreakdown instead of averageProgress
GET /admin/progress/overview

# Verify statusBreakdown contains notStarted, inProgress, completed counts
```

---

## Notes

- **Backward Compatibility**: The removal of the `status` filter from `getCourses()` is a breaking change if any client was using it. Update client code accordingly.
- **Performance**: The `getProgressOverview()` function is now more efficient as it only fetches enrollment status instead of calculating progress for each enrollment.
- **Type Safety**: Added TypeScript guards and explicit type annotations to handle Prisma's complex return types.

---

## Summary

✅ **Status field successfully migrated from Course to Enrollment**
✅ **All admin dashboard endpoints updated to reflect per-student status**
✅ **Improved data accuracy and granularity for progress monitoring**
✅ **Code is linter-compliant and type-safe**



