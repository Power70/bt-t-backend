# 🔍 Admin Module - Complete Filter & Search Guide

## Overview

All admin filter endpoints now support **universal search** with partial matching across multiple fields, providing a Google-like search experience.

---

## 🎯 Quick Examples

### Course Search:
```bash
# Universal search - searches across title, instructor name/email, and category
GET /admin/courses?search=typescript

# Search by instructor (name or email)
GET /admin/courses?instructor=john

# Search by category
GET /admin/courses?category=web

# Combine multiple filters
GET /admin/courses?search=typescript&isPublished=true&status=InProgress
```

### User Search:
```bash
# Universal search - searches across name and email
GET /admin/users?search=john

# Search by email domain
GET /admin/users?email=gmail.com

# Find unverified instructors
GET /admin/users?role=INSTRUCTOR&isVerified=false

# Combine filters
GET /admin/users?search=john&role=INSTRUCTOR
```

---

## 📋 Complete Filter Reference

### 1. Course Filters - `GET /admin/courses`

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| **`search`** | String | 🌟 **Universal search** across title, instructor name/email, category | `typescript` |
| `title` | String | Filter by course title (partial match) | `TypeScript` |
| `instructor` | String | Filter by instructor name or email (partial match) | `john` or `john.doe` |
| `category` | String | Filter by category name (partial match) | `Web` or `Development` |
| `isPublished` | Boolean | Filter by published status | `true` or `false` |
| `status` | Enum | Filter by course status | `NotStarted`, `InProgress`, `Completed` |
| `page` | Number | Page number (default: 1) | `1` |
| `limit` | Number | Items per page (default: 10, max: 100) | `20` |

**Search Behavior:**
- ✅ Case-insensitive
- ✅ Partial matching (LIKE/contains)
- ✅ `search` checks: title, instructor.name, instructor.email, category.name
- ✅ `instructor` checks: instructor.name, instructor.email
- ✅ All filters are optional and can be combined

---

### 2. User Filters - `GET /admin/users`

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| **`search`** | String | 🌟 **Universal search** across name and email | `john` |
| `name` | String | Filter by user name (partial match) | `John Doe` |
| `email` | String | Filter by email (partial match) | `example.com` |
| `role` | Enum | Filter by user role | `STUDENT`, `INSTRUCTOR`, `ADMIN` |
| `isVerified` | Boolean | Filter by verification status | `true` or `false` |
| `page` | Number | Page number (default: 1) | `1` |
| `limit` | Number | Items per page (default: 10, max: 100) | `20` |

**Search Behavior:**
- ✅ Case-insensitive
- ✅ Partial matching (LIKE/contains)
- ✅ `search` checks: name, email
- ✅ All filters are optional and can be combined

---

## 🎨 Real-World Use Cases

### Use Case 1: Find All TypeScript Courses
```bash
GET /admin/courses?search=typescript
```
**Returns:**
- Courses with "TypeScript" in title
- Courses taught by "TypeScript Expert"
- Courses in "TypeScript Basics" category
- Courses taught by instructor@typescript.com

---

### Use Case 2: Find Published Courses by John in Web Development
```bash
GET /admin/courses?instructor=john&category=web&isPublished=true
```
**Returns:**
- Published courses where:
  - Instructor name contains "john" OR
  - Instructor email contains "john"
- AND category contains "web"

---

### Use Case 3: Find All Gmail Instructors
```bash
GET /admin/users?email=gmail.com&role=INSTRUCTOR
```
**Returns:**
- All instructors with "@gmail.com" in their email

---

### Use Case 4: Find Unverified Students
```bash
GET /admin/users?role=STUDENT&isVerified=false
```
**Returns:**
- All students who haven't verified their email

---

### Use Case 5: Paginated Course Search
```bash
GET /admin/courses?search=advanced&page=2&limit=20
```
**Returns:**
- Page 2 of results (items 21-40)
- Courses matching "advanced" in any field
- Maximum 20 items per page

---

## 💡 Pro Tips

### 1. **Combine Universal + Specific**
Use universal search with specific filters for powerful queries:
```bash
GET /admin/courses?search=typescript&isPublished=true&status=InProgress
```

### 2. **Domain-Based Filtering**
Find all users from a specific domain:
```bash
GET /admin/users?email=company.com
```

### 3. **Partial Category Search**
Search for categories containing a word:
```bash
GET /admin/courses?category=dev
# Matches: "Web Development", "Mobile Development", "Game Development"
```

### 4. **Instructor Discovery**
Find all courses by instructors with a specific name:
```bash
GET /admin/courses?instructor=smith
# Matches: "John Smith", "Jane Smith", "smith@example.com"
```

### 5. **Empty Search Returns All**
Omit all filters to get all records (with pagination):
```bash
GET /admin/courses?page=1&limit=50
# Returns first 50 courses
```

---

## 🔄 Migration from Previous Version

### Before (Exact Match):
```bash
# Required exact values
GET /admin/courses?instructorEmail=john.doe@example.com
GET /admin/courses?categoryName=Web Development
```

### After (Partial Match):
```bash
# Partial matching works
GET /admin/courses?instructor=john
GET /admin/courses?category=web

# Universal search
GET /admin/courses?search=john
```

---

## 📊 Response Format

All filter endpoints return paginated results:

```json
{
  "data": [
    {
      "id": "clx...",
      "title": "Introduction to TypeScript",
      // ... course data
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## 🚀 Frontend Integration

### JavaScript/TypeScript Example:

```typescript
// Universal search function
async function searchCourses(searchTerm: string, page = 1, limit = 10) {
  const params = new URLSearchParams({
    search: searchTerm,
    page: String(page),
    limit: String(limit)
  });
  
  const response = await fetch(`/admin/courses?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
}

// Advanced filter function
async function filterCourses(filters: {
  search?: string;
  title?: string;
  instructor?: string;
  category?: string;
  isPublished?: boolean;
  status?: 'NotStarted' | 'InProgress' | 'Completed';
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  
  const response = await fetch(`/admin/courses?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
}

// Usage examples
const results1 = await searchCourses('typescript');
const results2 = await filterCourses({
  instructor: 'john',
  isPublished: true,
  page: 1,
  limit: 20
});
```

---

## ⚡ Performance

### Optimized Queries:
- ✅ Uses Prisma's efficient query builder
- ✅ Partial matches use indexed fields where possible
- ✅ Pagination prevents large result sets
- ✅ Only fetches necessary related data

### Recommendations:
- Keep `limit` reasonable (10-50 items)
- Use specific filters when possible for better performance
- Consider caching frequent searches on the frontend

---

## 🔒 Security

- ✅ All endpoints require JWT authentication
- ✅ All endpoints require ADMIN role
- ✅ SQL injection protected (Prisma ORM)
- ✅ Rate limiting recommended

---

## ✅ Summary

| Feature | Courses | Users |
|---------|---------|-------|
| Universal Search | ✅ | ✅ |
| Partial Matching | ✅ | ✅ |
| Case-Insensitive | ✅ | ✅ |
| Pagination | ✅ | ✅ |
| Multiple Filters | ✅ | ✅ |
| Role Filtering | N/A | ✅ |
| Status Filtering | ✅ | N/A |
| Published Filter | ✅ | N/A |
| Verification Filter | N/A | ✅ |

---

**Universal search makes your admin panel intuitive and powerful!** 🎉

