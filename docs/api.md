# Capstone Kada Job Portal API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [API Endpoints](#api-endpoints)
   - [Authentication Routes](#authentication-routes)
   - [User Routes](#user-routes)
   - [Company Routes](#company-routes)
   - [Job Routes](#job-routes)
   - [Application Routes](#application-routes)
   - [Category Routes](#category-routes)
5. [Data Models](#data-models)
6. [Response Formats](#response-formats)

## Overview

The Capstone Kada Job Portal API is a RESTful service built with Node.js, Express.js, and MongoDB. It provides endpoints for job seekers (users) and employers (companies) to manage job postings, applications, and related functionality.

### Base URL
```
Development: http://localhost:3000
Production: https://your-domain.com
```

### API Version
```
Version: 1.0.0
```

### Content Type
All API requests and responses use JSON format.
```
Content-Type: application/json
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Tokens can be sent via:
1. **Authorization Header**: `Authorization: Bearer <token>`
2. **Cookie**: `token=<jwt_token>`

### Token Structure
```json
{
  "userId": "user_id_here",        // For users
  "companyId": "company_id_here",  // For companies
  "email": "email@example.com",
  "type": "user|company",
  "iat": 1234567890,
  "exp": 1234567890
}
```

### Authentication Types
- **authenticateUser**: Requires valid user token
- **authenticateCompany**: Requires valid company token
- **authenticateAny**: Accepts either user or company token
- **optionalAuth**: Optional authentication (doesn't fail if no token)

## Error Handling

### Standard Error Response Format
```json
{
  "message": "Error description",
  "error": "Detailed error information (development only)",
  "statusCode": 400
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity
- `500` - Internal Server Error

## API Endpoints

### Authentication Routes

#### User Registration
```http
POST /auth/register
```

**Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phoneNumber": "1234567890"
}
```

**Response:**
```json
{
  "message": "User registered successfully."
}
```

#### User Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "user": {
    "_id": "user_id",
    "fullName": "John Doe",
    "email": "john@example.com",
    "type": "user"
  }
}
```

#### User Logout
```http
POST /auth/logout
```

**Authentication:** Required (User)

**Response:**
```json
{
  "message": "Logout successful"
}
```

### Company Routes

#### Company Registration
```http
POST /company/register
```

**Request Body:**
```json
{
  "companyName": "Tech Corp",
  "email": "hr@techcorp.com",
  "password": "password123",
  "phoneNumber": "1234567890",
  "industry": "Technology",
  "mainLocation": "New York, NY"
}
```

**Response:**
```json
{
  "message": "Company registered successfully."
}
```

#### Company Login
```http
POST /company/login
```

**Request Body:**
```json
{
  "email": "hr@techcorp.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "jwt_token_here",
  "company": {
    "_id": "company_id",
    "companyName": "Tech Corp",
    "email": "hr@techcorp.com",
    "type": "company"
  }
}
```

### Job Routes

#### Get All Jobs
```http
GET /api/jobs
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `title` (string): Filter by job title
- `location` (string): Filter by location
- `type` (string): Filter by job type (full-time, part-time, contract, internship, freelance)
- `workLocation` (string): Filter by work location (onsite, remote, hybrid)
- `experienceLevel` (string): Filter by experience level (entry, mid, senior, lead, executive)
- `category` (string): Filter by category ID
- `companyId` (string): Filter by company ID
- `search` (string): Text search across title, description, and major

**Response:**
```json
{
  "jobs": [
    {
      "_id": "job_id",
      "title": "Software Engineer",
      "major": "Computer Science",
      "type": "full-time",
      "workLocation": "hybrid",
      "location": "San Francisco, CA",
      "salary": {
        "min": 80000,
        "max": 120000,
        "currency": "USD",
        "period": "yearly"
      },
      "description": "Job description...",
      "requirements": ["Bachelor's degree", "3+ years experience"],
      "responsibilities": ["Develop software", "Code review"],
      "skills": ["JavaScript", "Node.js", "React"],
      "benefits": ["Health insurance", "401k"],
      "experienceLevel": "mid",
      "category": {
        "_id": "category_id",
        "categoryName": "Technology"
      },
      "companyId": {
        "_id": "company_id",
        "companyName": "Tech Corp",
        "profilePicture": "path/to/logo.png"
      },
      "datePosted": "2025-01-01T00:00:00.000Z",
      "applicationDeadline": "2025-02-01T00:00:00.000Z",
      "isActive": true,
      "isFeatured": false,
      "views": 150,
      "applicationsCount": 25,
      "tags": ["remote-friendly", "startup"],
      "contactEmail": "jobs@techcorp.com",
      "contactPhone": "+1234567890"
    }
  ],
  "totalPages": 5,
  "currentPage": 1,
  "total": 50
}
```

#### Get Single Job
```http
GET /api/jobs/:id
```

**Response:**
```json
{
  "_id": "job_id",
  "title": "Software Engineer",
  // ... (same structure as above)
  "category": {
    "_id": "category_id",
    "categoryName": "Technology",
    "description": "Technology related jobs"
  },
  "companyId": {
    "_id": "company_id",
    "companyName": "Tech Corp",
    "email": "hr@techcorp.com",
    "profilePicture": "path/to/logo.png",
    "industry": "Technology",
    "mainLocation": "New York, NY",
    "description": "Leading tech company..."
  }
}
```

#### Create Job
```http
POST /api/jobs
```

**Authentication:** Required (Company)

**Request Body:**
```json
{
  "title": "Software Engineer",
  "major": "Computer Science",
  "type": "full-time",
  "workLocation": "hybrid",
  "location": "San Francisco, CA",
  "salary": {
    "min": 80000,
    "max": 120000,
    "currency": "USD",
    "period": "yearly"
  },
  "description": "We are looking for a talented software engineer...",
  "requirements": [
    "Bachelor's degree in Computer Science",
    "3+ years of experience in software development",
    "Proficiency in JavaScript and Node.js"
  ],
  "responsibilities": [
    "Develop and maintain web applications",
    "Participate in code reviews",
    "Collaborate with cross-functional teams"
  ],
  "skills": ["JavaScript", "Node.js", "React", "MongoDB"],
  "benefits": ["Health insurance", "401k", "Flexible hours"],
  "experienceLevel": "mid",
  "category": "category_id_here",
  "applicationDeadline": "2025-02-01T00:00:00.000Z",
  "tags": ["remote-friendly", "startup"],
  "contactEmail": "jobs@techcorp.com",
  "contactPhone": "+1234567890"
}
```

**Response:**
```json
{
  "_id": "job_id",
  "title": "Software Engineer",
  // ... (full job object with populated fields)
  "companyId": "company_id",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

#### Update Job
```http
PUT /api/jobs/:id
```

**Authentication:** Required (Company - own jobs only)

**Request Body:** Same as Create Job (partial updates allowed)

**Response:** Updated job object

#### Delete Job
```http
DELETE /api/jobs/:id
```

**Authentication:** Required (Company - own jobs only)

**Response:**
```json
{
  "message": "Job deleted successfully"
}
```

#### Get Jobs by Company
```http
GET /api/jobs/company/:companyId
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)

**Response:** Same structure as "Get All Jobs"

### Application Routes

#### Submit Application
```http
POST /api/applications
```

**Authentication:** Required (User)

**Content-Type:** `multipart/form-data`

**Request Body:**
```form-data
jobId: job_id_here
fullName: John Doe
domicile: New York, NY
phoneNumber: +1234567890
resume: [file] (PDF, DOC, DOCX - max 5MB)
coverLetter: I am interested in this position because...
personalStatement: I am a passionate developer with...
expectedSalary: {
  "amount": 90000,
  "currency": "USD",
  "period": "yearly"
}
availableStartDate: 2025-03-01
```

**Response:**
```json
{
  "message": "Application submitted successfully",
  "application": {
    "_id": "application_id",
    "userId": "user_id",
    "jobId": "job_id",
    "fullName": "John Doe",
    "domicile": "New York, NY",
    "phoneNumber": "+1234567890",
    "email": "john@example.com",
    "resume": "uploads/1234567890.pdf",
    "coverLetter": "Cover letter text...",
    "personalStatement": "Personal statement...",
    "applicationDate": "2025-01-01T00:00:00.000Z",
    "status": "pending",
    "expectedSalary": {
      "amount": 90000,
      "currency": "USD",
      "period": "yearly"
    },
    "availableStartDate": "2025-03-01T00:00:00.000Z"
  }
}
```

#### Get User's Applications
```http
GET /api/applications/my-applications
```

**Authentication:** Required (User)

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by status

**Response:**
```json
{
  "applications": [
    {
      "_id": "application_id",
      "userId": "user_id",
      "jobId": {
        "_id": "job_id",
        "title": "Software Engineer",
        "companyId": {
          "_id": "company_id",
          "companyName": "Tech Corp",
          "profilePicture": "path/to/logo.png"
        },
        "location": "San Francisco, CA",
        "type": "full-time",
        "datePosted": "2025-01-01T00:00:00.000Z"
      },
      "status": "pending",
      "applicationDate": "2025-01-01T00:00:00.000Z"
    }
  ],
  "totalPages": 3,
  "currentPage": 1,
  "total": 25
}
```

#### Get Company Applications
```http
GET /api/applications/company-applications
```

**Authentication:** Required (Company)

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by status
- `jobId` (string): Filter by specific job

**Response:**
```json
{
  "applications": [
    {
      "_id": "application_id",
      "userId": {
        "_id": "user_id",
        "fullName": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "+1234567890"
      },
      "jobId": {
        "_id": "job_id",
        "title": "Software Engineer",
        "location": "San Francisco, CA",
        "type": "full-time"
      },
      "status": "pending",
      "applicationDate": "2025-01-01T00:00:00.000Z",
      "resume": "uploads/1234567890.pdf"
    }
  ],
  "totalPages": 5,
  "currentPage": 1,
  "total": 50
}
```

#### Update Application Status
```http
PATCH /api/applications/:id/status
```

**Authentication:** Required (Company)

**Request Body:**
```json
{
  "status": "reviewing",
  "note": "Initial screening passed, moving to technical review"
}
```

**Response:**
```json
{
  "message": "Application status updated successfully",
  "application": {
    "_id": "application_id",
    "status": "reviewing",
    "statusHistory": [
      {
        "status": "pending",
        "date": "2025-01-01T00:00:00.000Z"
      },
      {
        "status": "reviewing",
        "date": "2025-01-02T00:00:00.000Z",
        "note": "Initial screening passed, moving to technical review",
        "updatedBy": "company_id"
      }
    ]
  }
}
```

#### Add Company Note
```http
POST /api/applications/:id/note
```

**Authentication:** Required (Company)

**Request Body:**
```json
{
  "note": "Candidate has strong technical background. Schedule for interview."
}
```

**Response:**
```json
{
  "message": "Note added successfully",
  "application": {
    "_id": "application_id",
    "companyNotes": [
      {
        "note": "Candidate has strong technical background. Schedule for interview.",
        "createdBy": "company_id",
        "createdAt": "2025-01-02T00:00:00.000Z"
      }
    ]
  }
}
```

#### Get Application Details
```http
GET /api/applications/:id
```

**Authentication:** Required (User - own applications only)

**Response:** Full application object with populated job and user details

## Data Models

### User Model
```json
{
  "_id": "ObjectId",
  "fullName": "string (required, max 100 chars)",
  "email": "string (required, unique, valid email)",
  "password": "string (required, min 6 chars, hashed)",
  "phoneNumber": "string (max 20 chars)",
  "profilePicture": "string (default: '')",
  "bio": "string (max 500 chars)",
  "birthDate": "Date",
  "gender": "enum ['male', 'female', 'prefer-not-to-say']",
  "domicile": "string",
  "personalSummary": "string (max 1000 chars)",
  "skills": ["string"],
  "experience": [{
    "company": "string (required)",
    "position": "string (required)",
    "startDate": "Date (required)",
    "endDate": "Date",
    "current": "boolean (default: false)",
    "description": "string (max 500 chars)"
  }],
  "education": [{
    "institution": "string (required)",
    "degree": "string (required)",
    "fieldOfStudy": "string",
    "startDate": "Date (required)",
    "endDate": "Date",
    "current": "boolean (default: false)",
    "grade": "string"
  }],
  "savedJobs": ["ObjectId"],
  "isActive": "boolean (default: true)",
  "lastLogin": "Date",
  "emailVerified": "boolean (default: false)",
  "emailVerificationToken": "string",
  "passwordResetToken": "string",
  "passwordResetExpire": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Company Model
```json
{
  "_id": "ObjectId",
  "companyName": "string (required, max 200 chars)",
  "email": "string (required, unique, valid email)",
  "password": "string (required, min 6 chars, hashed)",
  "phoneNumber": "string (max 20 chars)",
  "profilePicture": "string (default: '')",
  "bannerPicture": "string",
  "website": "string (valid URL)",
  "industry": "string (max 100 chars)",
  "mainLocation": "string (max 200 chars)",
  "description": "string (max 2000 chars)",
  "lastLogin": "Date",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Job Model
```json
{
  "_id": "ObjectId",
  "title": "string (required, max 200 chars)",
  "major": "string (required, max 100 chars)",
  "type": "enum ['full-time', 'part-time', 'contract', 'internship', 'freelance']",
  "workLocation": "enum ['onsite', 'remote', 'hybrid']",
  "location": "string (required, max 200 chars)",
  "salary": {
    "min": "number (min: 0)",
    "max": "number (min: 0)",
    "currency": "enum ['USD', 'IDR', 'SGD', 'MYR', 'PHP', 'THB']",
    "period": "enum ['hourly', 'monthly', 'yearly']"
  },
  "description": "string (required, max 5000 chars)",
  "requirements": ["string (required)"],
  "responsibilities": ["string (required)"],
  "skills": ["string"],
  "benefits": ["string"],
  "experienceLevel": "enum ['entry', 'mid', 'senior', 'lead', 'executive']",
  "category": "ObjectId (required, ref: Category)",
  "companyId": "ObjectId (required, ref: Company)",
  "datePosted": "Date (default: now)",
  "applicationDeadline": "Date (must be future)",
  "isActive": "boolean (default: true)",
  "isFeatured": "boolean (default: false)",
  "views": "number (default: 0)",
  "applicationsCount": "number (default: 0)",
  "tags": ["string"],
  "contactEmail": "string (valid email)",
  "contactPhone": "string (max 20 chars)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Application Model
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (required, ref: User)",
  "jobId": "ObjectId (required, ref: Job)",
  "fullName": "string (required, max 100 chars)",
  "domicile": "string (required, max 200 chars)",
  "phoneNumber": "string (required, max 20 chars)",
  "email": "string (required, valid email)",
  "resume": "string (required, file path)",
  "coverLetter": "string (max 2000 chars)",
  "personalStatement": "string (max 1000 chars)",
  "applicationDate": "Date (default: now)",
  "status": "enum ['pending', 'reviewing', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn']",
  "statusHistory": [{
    "status": "string (required)",
    "date": "Date (default: now)",
    "note": "string (max 500 chars)",
    "updatedBy": "ObjectId (ref: Company)"
  }],
  "companyNotes": [{
    "note": "string (required, max 1000 chars)",
    "createdBy": "ObjectId (required, ref: Company)",
    "createdAt": "Date (default: now)"
  }],
  "interviewDetails": {
    "scheduledDate": "Date",
    "location": "string",
    "type": "enum ['phone', 'video', 'onsite', 'online']",
    "notes": "string (max 1000 chars)"
  },
  "expectedSalary": {
    "amount": "number (min: 0)",
    "currency": "enum ['USD', 'IDR', 'SGD', 'MYR', 'PHP', 'THB']",
    "period": "enum ['hourly', 'monthly', 'yearly']"
  },
  "availableStartDate": "Date",
  "additionalDocuments": [{
    "name": "string (required)",
    "url": "string (required)",
    "type": "enum ['portfolio', 'certificate', 'recommendation', 'other']"
  }],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Category Model
```json
{
  "_id": "ObjectId",
  "categoryName": "string (required, unique, max 100 chars)",
  "categoryType": "enum ['major', 'type', 'workLocation', 'location']",
  "description": "string (max 500 chars)",
  "isActive": "boolean (default: true)",
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

## Response Formats

### Success Response
```json
{
  "data": "Response data here",
  "message": "Optional success message",
  "meta": {
    "totalPages": 5,
    "currentPage": 1,
    "total": 50,
    "limit": 10
  }
}
```

### Error Response
```json
{
  "message": "Error description",
  "error": "Detailed error (development only)",
  "statusCode": 400,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/jobs"
}
```

### Validation Error Response
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please enter a valid email"
    },
    {
      "field": "password",
      "message": "Password must be at least 6 characters"
    }
  ],
  "statusCode": 422
}
```

## Status Values

### Application Status Flow
1. `pending` - Initial status when application is submitted
2. `reviewing` - Application is being reviewed by company
3. `shortlisted` - Candidate has been shortlisted
4. `interview` - Interview has been scheduled/conducted
5. `offered` - Job offer has been made
6. `rejected` - Application has been rejected
7. `withdrawn` - Candidate has withdrawn application

### Job Types
- `full-time` - Full-time employment
- `part-time` - Part-time employment
- `contract` - Contract/temporary work
- `internship` - Internship position
- `freelance` - Freelance/project-based work

### Work Location Types
- `onsite` - Work from office/company location
- `remote` - Work from anywhere
- `hybrid` - Combination of onsite and remote

### Experience Levels
- `entry` - Entry level (0-2 years)
- `mid` - Mid-level (2-5 years)
- `senior` - Senior level (5-8 years)
- `lead` - Lead/Team lead (8+ years)
- `executive` - Executive/Management level

### Supported Currencies
- `USD` - US Dollar
- `IDR` - Indonesian Rupiah
- `SGD` - Singapore Dollar
- `MYR` - Malaysian Ringgit
- `PHP` - Philippine Peso
- `THB` - Thai Baht

### Salary Periods
- `hourly` - Per hour
- `monthly` - Per month
- `yearly` - Per year

---

*Last updated: July 31, 2025*
*API Version: 1.0.0*
