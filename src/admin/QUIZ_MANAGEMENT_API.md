# Quiz and Final Assessment Management API

## Overview

This document describes the comprehensive quiz and final assessment management system for super admins in the Learning Management System (LMS).

## Architecture

The system follows the existing admin module architecture:
- **DTOs**: Data Transfer Objects for validation and API documentation
- **Service**: Business logic layer with Prisma ORM
- **Controller**: RESTful API endpoints with Swagger documentation

## Data Model

### Quiz Structure
```
Quiz
├── Questions
│   └── Options (with isCorrect flag)
├── Submissions (student answers)
└── Completions (passing records)
```

### Two Types of Quizzes
1. **Module Quizzes**: Attached to a specific module (one-to-one)
2. **Final Assessments**: Attached to a course as the final exam (one-to-one)

### Key Constraints
- Students must pass all module quizzes (≥80%) before accessing the final assessment
- Students must pass the final assessment (≥80%) to complete the course
- Each question must have at least 2 options
- Questions support both single and multiple correct answers

---

## API Endpoints

### Module Quiz Management

#### 1. Create Module Quiz
**POST** `/admin/modules/:moduleId/quiz`

Creates or replaces a quiz for a module. If a quiz already exists, it will be deleted and replaced.

**Request Body:**
```json
{
  "questions": [
    {
      "text": "What is JavaScript?",
      "options": [
        { "text": "A programming language", "isCorrect": true },
        { "text": "A markup language", "isCorrect": false },
        { "text": "A database", "isCorrect": false }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "message": "Module quiz created successfully",
  "quiz": {
    "id": "quiz_id",
    "moduleId": "module_id",
    "questions": [...]
  },
  "module": {
    "id": "module_id",
    "title": "Module Title"
  },
  "course": {
    "id": "course_id",
    "title": "Course Title"
  }
}
```

#### 2. Get Module Quiz by Module ID
**GET** `/admin/modules/:moduleId/quiz`

Retrieves the quiz for a specific module with all questions and correct answers (admin view).

#### 3. Get Module Quiz by Quiz ID
**GET** `/admin/quizzes/:quizId/module`

Retrieves a module quiz by its quiz ID with all questions and correct answers.

#### 4. Update Module Quiz
**PATCH** `/admin/quizzes/:quizId/module`

Updates a module quiz. If questions are provided, all existing questions will be replaced.

**Request Body:**
```json
{
  "questions": [
    {
      "text": "Updated question text",
      "options": [
        { "text": "Option A", "isCorrect": true },
        { "text": "Option B", "isCorrect": false }
      ]
    }
  ]
}
```

#### 5. Delete Module Quiz
**DELETE** `/admin/quizzes/:quizId/module`

Deletes a module quiz and all related questions, options, and student submissions.

#### 6. Add Question to Module Quiz
**POST** `/admin/quizzes/:quizId/module/questions`

Adds a new question with options to an existing module quiz.

**Request Body:**
```json
{
  "text": "What is the output of console.log(typeof null)?",
  "options": [
    { "text": "object", "isCorrect": true },
    { "text": "null", "isCorrect": false },
    { "text": "undefined", "isCorrect": false }
  ]
}
```

#### 7. Update Question in Module Quiz
**PATCH** `/admin/questions/:questionId/module`

Updates a question in a module quiz. If options are provided, all existing options will be replaced.

#### 8. Delete Question from Module Quiz
**DELETE** `/admin/questions/:questionId/module`

Deletes a question and all related options from a module quiz.

---

### Final Assessment Management

#### 1. Create Final Assessment
**POST** `/admin/courses/:courseId/final-assessment`

Creates or replaces a final assessment for a course. If one already exists, it will be replaced.

**Request Body:**
```json
{
  "questions": [
    {
      "text": "What is the purpose of closures in JavaScript?",
      "options": [
        { "text": "To create private variables", "isCorrect": true },
        { "text": "To declare constants", "isCorrect": false },
        { "text": "To import modules", "isCorrect": false }
      ]
    }
  ]
}
```

#### 2. Get Final Assessment by Course ID
**GET** `/admin/courses/:courseId/final-assessment`

Retrieves the final assessment for a specific course with all questions and correct answers.

#### 3. Get Final Assessment by Quiz ID
**GET** `/admin/quizzes/:quizId/final-assessment`

Retrieves a final assessment by its quiz ID with all questions and correct answers.

#### 4. Update Final Assessment
**PATCH** `/admin/quizzes/:quizId/final-assessment`

Updates a final assessment. If questions are provided, all existing questions will be replaced.

#### 5. Delete Final Assessment
**DELETE** `/admin/quizzes/:quizId/final-assessment`

Deletes a final assessment and all related questions, options, and student submissions.

#### 6. Add Question to Final Assessment
**POST** `/admin/quizzes/:quizId/final-assessment/questions`

Adds a new question with options to an existing final assessment.

#### 7. Update Question in Final Assessment
**PATCH** `/admin/questions/:questionId/final-assessment`

Updates a question in a final assessment. If options are provided, all existing options will be replaced.

#### 8. Delete Question from Final Assessment
**DELETE** `/admin/questions/:questionId/final-assessment`

Deletes a question and all related options from a final assessment.

---

### Option Management (Common)

#### 1. Update Option
**PATCH** `/admin/options/:optionId`

Updates a single option in any question (module quiz or final assessment).

**Request Body:**
```json
{
  "text": "Updated option text",
  "isCorrect": true
}
```

#### 2. Delete Option
**DELETE** `/admin/options/:optionId`

Deletes a single option from a question. Questions must have at least 2 options, so deletion will fail if only 2 options remain.

---

## DTOs (Data Transfer Objects)

### CreateOptionDto
```typescript
{
  text: string;        // Option text
  isCorrect: boolean;  // Whether this option is correct
}
```

### CreateQuestionDto
```typescript
{
  text: string;                   // Question text
  options: CreateOptionDto[];     // Array of options (min 2)
}
```

### CreateModuleQuizDto
```typescript
{
  questions?: CreateQuestionDto[];  // Optional array of questions
}
```

### CreateFinalAssessmentDto
```typescript
{
  questions?: CreateQuestionDto[];  // Optional array of questions
}
```

### Update DTOs
All update DTOs extend their create counterparts with all fields optional using `PartialType`.

---

## Student Flow Integration

### Module Quiz Flow (Student Side - Already Implemented)
1. Student gets module quiz details via `/student/modules/:moduleId/quiz`
   - Correct answers are hidden
2. Student submits answers via `/student/quizzes/:quizId/module/submit`
   - System validates and scores submission
   - Must score ≥80% to pass
   - Completion is recorded in `ModuleQuizCompletion` table
3. Student receives detailed feedback with correct/incorrect answers

### Final Assessment Flow (Student Side - Already Implemented)
1. Student completes all module quizzes with passing scores
2. Student gets final assessment details via `/student/courses/:courseId/final-assessment`
   - Correct answers are hidden
3. Student submits answers via `/student/courses/:courseId/final-assessment/submit`
   - System validates and scores submission
   - Must score ≥80% to pass and complete course
   - Completion is recorded in `FinalAssessmentCompletion` table
   - Course status changes to "Completed"
   - Certificate is automatically generated

---

## Best Practices

### Creating Effective Quizzes

1. **Question Quality**
   - Write clear, unambiguous questions
   - Use realistic scenarios
   - Avoid trick questions
   - Test understanding, not memorization

2. **Options Design**
   - Provide 3-4 options per question
   - Make all options plausible
   - Avoid "all of the above" or "none of the above"
   - Support multiple correct answers when appropriate

3. **Quiz Structure**
   - Start with easier questions
   - Include a mix of difficulty levels
   - Aim for 10-15 questions for module quizzes
   - Aim for 20-30 questions for final assessments

4. **Content Coverage**
   - Module quizzes should cover that module's content only
   - Final assessments should comprehensively cover the entire course
   - Ensure alignment with learning objectives

### Security Considerations

1. **Admin Only Access**
   - All quiz management endpoints require ADMIN role
   - JWT authentication enforced
   - Role-based access control via guards

2. **Data Integrity**
   - Transaction support for complex operations
   - Cascade deletes for related data
   - Validation at DTO level

3. **Student Data Protection**
   - Students cannot see correct answers until after submission
   - Student submissions are immutable
   - Quiz completion records are permanent

---

## Error Handling

### Common Errors

**404 Not Found**
- Quiz not found
- Module not found
- Course not found
- Question not found
- Option not found

**400 Bad Request**
- Attempting to delete option when only 2 remain
- Invalid quiz type (module quiz vs final assessment)
- Missing required fields
- Invalid data format

**403 Forbidden**
- Non-admin user attempting to access admin endpoints

**409 Conflict**
- Attempting to create quiz when one already exists (automatically replaced)

---

## Database Schema

### Quiz Model
```prisma
model Quiz {
  id        String   @id @default(cuid())
  moduleId  String?  @unique
  module    Module?  @relation(fields: [moduleId], references: [id], onDelete: Cascade)
  course    Course?  @relation("FinalCourseAssessment")
  questions Question[]
  submissions QuizSubmission[]
}
```

### Question Model
```prisma
model Question {
  id   String @id @default(cuid())
  text String @db.Text
  quizId String
  quiz   Quiz   @relation(fields: [quizId], references: [id], onDelete: Cascade)
  options Option[]
  userAnswers UserAnswer[]
}
```

### Option Model
```prisma
model Option {
  id        String  @id @default(cuid())
  text      String
  isCorrect Boolean @default(false)
  questionId String
  question   Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  userAnswers UserAnswer[]
}
```

### Completion Tracking
```prisma
model ModuleQuizCompletion {
  id          String   @id @default(cuid())
  userId      String
  moduleId    String
  score       Float
  percentage  Float
  passed      Boolean
  completedAt DateTime @default(now())
  
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  module Module @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  @@unique([userId, moduleId])
}

model FinalAssessmentCompletion {
  id          String   @id @default(cuid())
  userId      String
  courseId    String
  score       Float
  percentage  Float
  passed      Boolean
  completedAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, courseId])
}
```

---

## Testing Guidelines

### Manual Testing Checklist

#### Module Quizzes
- [ ] Create a module quiz with questions
- [ ] Retrieve module quiz by module ID
- [ ] Retrieve module quiz by quiz ID
- [ ] Update module quiz (replace all questions)
- [ ] Add individual question to quiz
- [ ] Update individual question
- [ ] Delete individual question
- [ ] Update individual option
- [ ] Delete individual option (verify 2-option minimum)
- [ ] Delete entire module quiz
- [ ] Verify cascade deletion (module deleted → quiz deleted)

#### Final Assessments
- [ ] Create a final assessment with questions
- [ ] Retrieve final assessment by course ID
- [ ] Retrieve final assessment by quiz ID
- [ ] Update final assessment (replace all questions)
- [ ] Add individual question to assessment
- [ ] Update individual question
- [ ] Delete individual question
- [ ] Delete entire final assessment
- [ ] Verify course link is removed when assessment deleted

#### Error Cases
- [ ] Try to create quiz with <2 options per question
- [ ] Try to delete option when only 2 remain
- [ ] Try to access module quiz endpoint with final assessment ID
- [ ] Try to access final assessment endpoint with module quiz ID
- [ ] Try to access without admin role
- [ ] Try to access non-existent quiz/question/option

#### Student Integration
- [ ] Student can take module quiz after admin creates it
- [ ] Student cannot see correct answers before submission
- [ ] Student receives feedback after submission
- [ ] Student can only access final assessment after passing all module quizzes
- [ ] Student receives certificate after passing final assessment

---

## Future Enhancements

1. **Question Bank**
   - Reusable question library
   - Random question selection
   - Difficulty ratings

2. **Advanced Question Types**
   - Fill in the blank
   - Matching
   - Ordering
   - Essay questions with manual grading

3. **Quiz Settings**
   - Time limits
   - Randomize question order
   - Randomize option order
   - Show/hide feedback
   - Allow retakes
   - Customizable passing threshold

4. **Analytics**
   - Question difficulty analysis
   - Most missed questions
   - Average time per question
   - Success rate trends

5. **Import/Export**
   - Import questions from CSV/JSON
   - Export quizzes for backup
   - Duplicate quiz across modules

---

## Support

For issues or questions about the quiz management system:
1. Check this documentation
2. Review the Swagger API documentation at `/api/docs`
3. Contact the development team

---

**Last Updated**: November 2024  
**Version**: 1.0.0  
**Maintained By**: LMS Development Team

