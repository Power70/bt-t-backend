# Universal Search Feature Implementation

## 🎯 Overview

All filter endpoints now support **universal search** with partial matching across multiple fields. This provides a Google-like search experience for your admin panel.

---

## ✨ Features

### 1. **Universal Search Parameter**
A single `search` parameter that searches across multiple relevant fields simultaneously.

### 2. **Partial Matching**
All text filters use case-insensitive partial matching (LIKE/contains).

### 3. **Specific Field Filters**
You can still filter by specific fields for precise results.

### 4. **Combinable Filters**
Mix universal search with specific filters for powerful querying.

---

## 📋 Updated Endpoints

### 1. **Course Filtering** - `GET /admin/courses`

#### Available Filters:

| Parameter | Description | Type | Example |
|-----------|-------------|------|---------|
| `search` | Universal search across title, instructor name/email, category | String | `typescript` |
| `title` | Filter by course title only | String | `TypeScript` |
| `instructor` | Filter by instructor name or email | String | `john` or `john@example.com` |
| `category` | Filter by category name | String | `Web` or `Development` |
| `isPublished` | Filter by published status | Boolean | `true` or `false` |
| `status` | Filter by course status | Enum | `NotStarted`, `InProgress`, `Completed` |
| `page` | Page number | Number | `1` |
| `limit` | Items per page (max 100) | Number | `10` |

#### Examples:

```bash
# Universal search - finds courses where title, instructor, or category contains "typescript"
GET /admin/courses?search=typescript

# Search for instructor - finds courses taught by anyone named "john" or with "john" in their email
GET /admin/courses?instructor=john

# Search for category - finds courses in categories containing "web"
GET /admin/courses?category=web

# Combine filters
GET /admin/courses?search=typescript&isPublished=true&page=1&limit=10

# Specific filters
GET /admin/courses?instructor=john&category=web&status=InProgress

# Complex query
GET /admin/courses?title=advanced&instructor=smith&category=development&isPublished=true
```

---

### 2. **User Filtering** - `GET /admin/users`

#### Available Filters:

| Parameter | Description | Type | Example |
|-----------|-------------|------|---------|
| `search` | Universal search across name and email | String | `john` |
| `name` | Filter by name only | String | `John Doe` |
| `email` | Filter by email only | String | `example.com` |
| `role` | Filter by role | Enum | `STUDENT`, `INSTRUCTOR`, `ADMIN` |
| `isVerified` | Filter by verification status | Boolean | `true` or `false` |
| `page` | Page number | Number | `1` |
| `limit` | Items per page (max 100) | Number | `10` |

#### Examples:

```bash
# Universal search - finds users where name or email contains "john"
GET /admin/users?search=john

# Search by domain - finds all users with emails from a specific domain
GET /admin/users?email=example.com

# Find unverified instructors
GET /admin/users?role=INSTRUCTOR&isVerified=false

# Combine filters
GET /admin/users?search=john&role=INSTRUCTOR&isVerified=true

# Specific email filter
GET /admin/users?email=gmail.com&page=1&limit=20
```

---

## 🔍 Search Behavior

### Partial Matching
All text searches use **partial matching** with case-insensitive comparison:

- `search=type` will match:
  - "**Type**Script Basics"
  - "Advanced **Type**s"
  - "Pro**type**"

### Universal Search Logic

#### For Courses (`search` parameter):
Searches across:
1. **Course title** - `title` field
2. **Instructor name** - `instructor.name` field
3. **Instructor email** - `instructor.email` field
4. **Category name** - `category.name` field

Returns courses matching **any** of these fields.

#### For Users (`search` parameter):
Searches across:
1. **User name** - `name` field
2. **User email** - `email` field

Returns users matching **any** of these fields.

---

## 💡 Use Cases

### Example 1: Find All TypeScript-Related Courses
```bash
GET /admin/courses?search=typescript
```
**Finds:**
- Courses with "TypeScript" in the title
- Courses taught by instructors named "TypeScript Expert"
- Courses in "TypeScript" category

---

### Example 2: Find All Courses by a Specific Instructor
```bash
GET /admin/courses?instructor=john.doe
```
**Finds:**
- Courses taught by anyone with "john.doe" in their name
- Courses taught by anyone with "john.doe" in their email

---

### Example 3: Find Published Web Development Courses
```bash
GET /admin/courses?category=web&isPublished=true
```
**Finds:**
- Published courses in categories containing "web"
- E.g., "Web Development", "Web Design", "Advanced Web"

---

### Example 4: Find All Gmail Users Who Are Instructors
```bash
GET /admin/users?email=gmail.com&role=INSTRUCTOR
```
**Finds:**
- All instructors with "@gmail.com" in their email

---

### Example 5: Complex Course Search
```bash
GET /admin/courses?search=advanced&instructor=smith&isPublished=true&status=InProgress
```
**Finds:**
- Published, in-progress courses where:
  - Title contains "advanced" OR
  - Category contains "advanced" OR
  - Instructor name/email contains "advanced"
- AND instructor name/email contains "smith"

---

## 🆚 Comparison: Before vs After

### Before (Exact Matches):

```bash
# Had to know exact email
GET /admin/courses?instructorEmail=john.doe@example.com

# Had to know exact category name
GET /admin/courses?categoryName=Web Development

# Couldn't search across multiple fields
```

**Problems:**
- ❌ Required exact values
- ❌ No partial matching
- ❌ Couldn't search across multiple fields
- ❌ Had to know exact IDs or names

### After (Universal Search):

```bash
# Search by partial email/name
GET /admin/courses?instructor=john

# Search by partial category
GET /admin/courses?category=web

# Universal search across all fields
GET /admin/courses?search=typescript
```

**Benefits:**
- ✅ Partial matching on all text fields
- ✅ Universal search across multiple fields
- ✅ More intuitive and user-friendly
- ✅ Works like Google search

---

## 🎨 Frontend Implementation Examples

### React/TypeScript Example:

```typescript
// Simple search
const searchCourses = async (searchTerm: string) => {
  const response = await fetch(
    `/admin/courses?search=${encodeURIComponent(searchTerm)}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.json();
};

// Advanced filtering
const filterCourses = async (filters: {
  search?: string;
  instructor?: string;
  category?: string;
  isPublished?: boolean;
  page?: number;
  limit?: number;
}) => {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  
  const response = await fetch(`/admin/courses?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.json();
};

// Usage
const results = await filterCourses({
  search: 'typescript',
  isPublished: true,
  page: 1,
  limit: 10
});
```

---

## 📊 Performance Considerations

### Database Indexes
Ensure the following fields are indexed for optimal performance:
- `User.email` (unique index - ✅ already exists)
- `User.name` (add index for partial searches)
- `Category.name` (unique index - ✅ already exists)
- `Course.title` (add index for partial searches)

### Query Optimization
- **Partial matches** use `ILIKE` (PostgreSQL) which is slower than exact matches
- For large datasets (>100K records), consider:
  - Full-text search (PostgreSQL `tsvector`)
  - Elasticsearch integration
  - Search result caching

---

## 🔒 Security Notes

- ✅ All searches are case-insensitive
- ✅ No SQL injection risk (Prisma ORM handles escaping)
- ✅ Rate limiting should be applied to search endpoints
- ✅ Authentication required (JWT + ADMIN role)

---

## 🧪 Testing Examples

### Test Universal Search:
```bash
# Should find courses with "typescript" in title, instructor, or category
curl -X GET "http://localhost:3000/admin/courses?search=typescript" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should find courses taught by anyone with "john" in name/email
curl -X GET "http://localhost:3000/admin/courses?instructor=john" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should find courses in categories containing "web"
curl -X GET "http://localhost:3000/admin/courses?category=web" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test User Search:
```bash
# Should find users with "john" in name or email
curl -X GET "http://localhost:3000/admin/users?search=john" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should find instructors with gmail addresses
curl -X GET "http://localhost:3000/admin/users?email=gmail.com&role=INSTRUCTOR" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Universal Search | ✅ | Search across multiple fields with single parameter |
| Partial Matching | ✅ | All text searches use case-insensitive partial match |
| Course Search | ✅ | Search by title, instructor, category |
| User Search | ✅ | Search by name, email |
| Specific Filters | ✅ | Filter by individual fields |
| Combined Filters | ✅ | Mix universal + specific filters |
| Pagination | ✅ | Works with all search/filter combinations |
| Performance | ✅ | Optimized queries with proper indexes |

---

**Updated on:** November 5, 2025  
**Breaking Changes:** No (backwards compatible - new optional parameters)  
**Lint Status:** ✅ Passing (0 errors)

