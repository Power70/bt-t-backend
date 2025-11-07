# Quiz Management - Quick Reference Guide

## 🎯 Quick Start

### Create a Module Quiz
```bash
POST /admin/modules/{moduleId}/quiz
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "questions": [
    {
      "text": "What is JavaScript?",
      "options": [
        { "text": "A programming language", "isCorrect": true },
        { "text": "A markup language", "isCorrect": false }
      ]
    }
  ]
}
```

### Create a Final Assessment
```bash
POST /admin/courses/{courseId}/final-assessment
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "questions": [
    {
      "text": "Explain closures in JavaScript",
      "options": [
        { "text": "Creates private variables", "isCorrect": true },
        { "text": "Declares constants", "isCorrect": false }
      ]
    }
  ]
}
```

---

## 📋 Endpoint Patterns

### Module Quiz Pattern
```
POST   /admin/modules/:moduleId/quiz                    # Create/Replace
GET    /admin/modules/:moduleId/quiz                    # Get by Module
GET    /admin/quizzes/:quizId/module                    # Get by Quiz ID
PATCH  /admin/quizzes/:quizId/module                    # Update
DELETE /admin/quizzes/:quizId/module                    # Delete
POST   /admin/quizzes/:quizId/module/questions          # Add Question
PATCH  /admin/questions/:questionId/module              # Update Question
DELETE /admin/questions/:questionId/module              # Delete Question
```

### Final Assessment Pattern
```
POST   /admin/courses/:courseId/final-assessment        # Create/Replace
GET    /admin/courses/:courseId/final-assessment        # Get by Course
GET    /admin/quizzes/:quizId/final-assessment          # Get by Quiz ID
PATCH  /admin/quizzes/:quizId/final-assessment          # Update
DELETE /admin/quizzes/:quizId/final-assessment          # Delete
POST   /admin/quizzes/:quizId/final-assessment/questions # Add Question
PATCH  /admin/questions/:questionId/final-assessment    # Update Question
DELETE /admin/questions/:questionId/final-assessment    # Delete Question
```

### Common Endpoints (Both Types)
```
PATCH  /admin/options/:optionId                         # Update Option
DELETE /admin/options/:optionId                         # Delete Option
```

---

## 🔑 Key Rules

1. **Minimum Requirements**
   - Each question must have ≥2 options
   - Each quiz must have ≥1 question

2. **Passing Criteria**
   - Students need ≥80% to pass any quiz
   - All module quizzes must be passed before final assessment
   - Final assessment must be passed to complete course

3. **Data Integrity**
   - Creating a quiz replaces existing one (no need to delete first)
   - Deleting a quiz cascades to questions, options, and submissions
   - Deleting a module cascades to its quiz
   - Cannot delete option if only 2 remain

4. **Access Control**
   - All endpoints require ADMIN role
   - Students have separate endpoints in `/student` routes
   - Students cannot see correct answers until after submission

---

## 💡 Common Use Cases

### Use Case 1: Create Complete Module Quiz
```typescript
// 1. Create module first (if not exists)
POST /admin/courses/{courseId}/modules
{
  "title": "Introduction to JavaScript"
}

// 2. Create quiz for the module
POST /admin/modules/{moduleId}/quiz
{
  "questions": [
    {
      "text": "What is a variable?",
      "options": [
        { "text": "A container for data", "isCorrect": true },
        { "text": "A function", "isCorrect": false },
        { "text": "A loop", "isCorrect": false }
      ]
    },
    {
      "text": "Which are primitive types? (Multiple answers)",
      "options": [
        { "text": "string", "isCorrect": true },
        { "text": "number", "isCorrect": true },
        { "text": "array", "isCorrect": false }
      ]
    }
  ]
}
```

### Use Case 2: Add Questions to Existing Quiz
```typescript
// Add one question at a time
POST /admin/quizzes/{quizId}/module/questions
{
  "text": "What is the DOM?",
  "options": [
    { "text": "Document Object Model", "isCorrect": true },
    { "text": "Data Object Model", "isCorrect": false }
  ]
}
```

### Use Case 3: Update Existing Question
```typescript
// Update question text and options
PATCH /admin/questions/{questionId}/module
{
  "text": "Updated: What is the DOM?",
  "options": [
    { "text": "Document Object Model", "isCorrect": true },
    { "text": "Data Object Model", "isCorrect": false },
    { "text": "Digital Object Model", "isCorrect": false }
  ]
}
```

### Use Case 4: Quick Option Fix
```typescript
// Just update one option without touching others
PATCH /admin/options/{optionId}
{
  "text": "Corrected option text",
  "isCorrect": true
}
```

### Use Case 5: Replace All Quiz Questions
```typescript
// Use PATCH on quiz to replace all questions at once
PATCH /admin/quizzes/{quizId}/module
{
  "questions": [
    // All new questions here
    // Old questions will be deleted
  ]
}
```

---

## 🚨 Common Errors & Solutions

### Error: "Module not found"
**Cause**: Invalid module ID  
**Solution**: Verify module exists first with `GET /admin/modules/{moduleId}`

### Error: "Quiz must have at least 1 question"
**Cause**: Empty questions array or no questions  
**Solution**: Include at least one question when creating quiz

### Error: "Each question must have at least 2 options"
**Cause**: Question has fewer than 2 options  
**Solution**: Add more options to the question

### Error: "Cannot delete option. Questions must have at least 2 options"
**Cause**: Trying to delete option when only 2 remain  
**Solution**: Add another option before deleting, or delete the entire question

### Error: "This quiz is not a module quiz. It might be a final assessment"
**Cause**: Using module quiz endpoint with final assessment ID  
**Solution**: Use `/admin/quizzes/{quizId}/final-assessment` endpoints instead

### Error: "No quiz found for this module"
**Cause**: Module has no quiz created yet  
**Solution**: Create a quiz first using `POST /admin/modules/{moduleId}/quiz`

---

## 📊 Response Examples

### Successful Quiz Creation
```json
{
  "message": "Module quiz created successfully",
  "quiz": {
    "id": "cm123quiz456",
    "moduleId": "cm123module789",
    "questions": [
      {
        "id": "cm123question001",
        "text": "What is JavaScript?",
        "options": [
          {
            "id": "cm123option001",
            "text": "A programming language",
            "isCorrect": true
          },
          {
            "id": "cm123option002",
            "text": "A markup language",
            "isCorrect": false
          }
        ]
      }
    ]
  },
  "module": {
    "id": "cm123module789",
    "title": "Introduction to JavaScript"
  },
  "course": {
    "id": "cm123course999",
    "title": "JavaScript Fundamentals"
  }
}
```

### Successful Question Addition
```json
{
  "message": "Question added successfully",
  "question": {
    "id": "cm123question002",
    "text": "What is the DOM?",
    "options": [
      {
        "id": "cm123option003",
        "text": "Document Object Model",
        "isCorrect": true
      },
      {
        "id": "cm123option004",
        "text": "Data Object Model",
        "isCorrect": false
      }
    ]
  }
}
```

---

## 🎓 Best Practices Checklist

### Before Creating a Quiz
- [ ] Course and module structure is finalized
- [ ] Learning objectives are clear
- [ ] Question content is prepared and reviewed
- [ ] Correct answers are verified

### When Creating Questions
- [ ] Question text is clear and unambiguous
- [ ] At least 2 options provided
- [ ] At least one correct answer marked
- [ ] All options are plausible
- [ ] Multiple correct answers work for checkboxes

### After Creating a Quiz
- [ ] Test the quiz as a student
- [ ] Verify correct answers are working
- [ ] Check passing threshold (80%)
- [ ] Review student feedback

### Maintenance
- [ ] Regularly review student performance
- [ ] Update questions based on feedback
- [ ] Remove ambiguous questions
- [ ] Add new questions to question bank

---

## 🔗 Related Documentation

- **Full API Documentation**: `./QUIZ_MANAGEMENT_API.md`
- **Swagger UI**: `/api/docs` (when server is running)
- **Student Module**: `../student/` (student-facing quiz endpoints)
- **Database Schema**: `../../prisma/schema.prisma`

---

## 📞 Need Help?

1. **Check Swagger**: Most detailed API specs at `/api/docs`
2. **Check Logs**: Server logs show detailed error messages
3. **Test with Postman**: Import Swagger JSON to Postman
4. **Review Code**: Service methods have JSDoc comments

---

**Pro Tip**: Use the Swagger UI at `/api/docs` for interactive testing! It includes all request/response examples and lets you try endpoints directly in your browser.

