# CV Analyzer API Documentation

This document provides comprehensive API reference for the CV Analyzer module of the Job Portal application.

## Base URL
```
/api/v1/cv-analyzer
```

## Authentication
All endpoints require user authentication via JWT token. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Upload and Analyze CV

**POST** `/upload`

Uploads a CV file and initiates analysis using OpenAI GPT-4.

#### Request

**Headers:**
- `Content-Type: multipart/form-data`
- `Authorization: Bearer <token>`

**Body (Form Data):**
```javascript
{
  cv: File,                    // Required: PDF file (max 10MB)
  experienceLevel: String,     // Required: "entry" | "mid" | "senior" | "executive"
  major: String,              // Required: Field of study/work (2-100 chars)
  jobId: String               // Optional: MongoDB ObjectId of target job
}
```

#### Response

**Success (202 Accepted):**
```javascript
{
  success: true,
  message: "CV uploaded successfully. Analysis is in progress.",
  data: {
    analysisId: "507f1f77bcf86cd799439011",
    status: "processing",
    estimatedCompletionTime: "2-3 minutes"
  }
}
```

**Error (400 Bad Request):**
```javascript
{
  success: false,
  message: "Experience level is required",
  field: "experienceLevel"
}
```

**Error (429 Too Many Requests):**
```javascript
{
  success: false,
  message: "Too many upload requests. Please try again later.",
  retryAfter: 60
}
```

#### Example

```bash
curl -X POST /api/v1/cv-analyzer/upload \
  -H "Authorization: Bearer <token>" \
  -F "cv=@resume.pdf" \
  -F "experienceLevel=mid" \
  -F "major=Computer Science" \
  -F "jobId=507f1f77bcf86cd799439012"
```

---

### 2. Get Analysis Results

**GET** `/results/:analysisId`

Retrieves the analysis results for a specific CV analysis.

#### Request

**Parameters:**
- `analysisId` (required): MongoDB ObjectId of the analysis

**Headers:**
- `Authorization: Bearer <token>`

#### Response

**Success (200 OK):**
```javascript
{
  success: true,
  data: {
    _id: "507f1f77bcf86cd799439011",
    userId: "507f1f77bcf86cd799439010",
    originalFilename: "john_doe_resume.pdf",
    status: "completed",
    jobData: {
      experienceLevel: "mid",
      major: "Computer Science",
      jobTitle: "Software Engineer",
      jobDescription: "..."
    },
    aiAnalysis: {
      overallScore: 82,
      sections: {
        atsCompatibility: {
          score: 90,
          strengths: ["Clear formatting", "Standard sections"],
          weaknesses: ["Missing keywords"],
          recommendations: ["Add more technical keywords"]
        },
        skillsAlignment: {
          score: 75,
          presentSkills: ["JavaScript", "React", "Node.js"],
          missingSkills: ["Docker", "Kubernetes"],
          suggestions: ["Add containerization experience"]
        },
        experienceRelevance: {
          score: 80,
          strengths: ["Relevant work experience", "Progressive career growth"],
          improvements: ["Quantify achievements better"]
        }
      }
    },
    recommendations: [
      {
        priority: "high",
        category: "skills",
        suggestion: "Add Kubernetes and Docker to technical skills",
        impact: "Could increase job match rate by 25%",
        actionable: true
      }
    ],
    skillsAnalysis: {
      technical: ["JavaScript", "React", "Node.js", "MongoDB"],
      soft: ["Communication", "Leadership", "Problem-solving"],
      proficiencyLevels: {
        "JavaScript": "advanced",
        "React": "intermediate",
        "Node.js": "intermediate"
      }
    },
    matchingScore: {
      overall: 78,
      breakdown: {
        skills: 75,
        experience: 80,
        education: 85
      }
    },
    createdAt: "2025-08-04T10:30:00.000Z",
    updatedAt: "2025-08-04T10:32:15.000Z"
  }
}
```

**Error (404 Not Found):**
```javascript
{
  success: false,
  message: "Analysis not found"
}
```

#### Example

```bash
curl -X GET /api/v1/cv-analyzer/results/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <token>"
```

---

### 3. Get Analysis History

**GET** `/history`

Retrieves the user's CV analysis history with pagination.

#### Request

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 50)
- `status` (optional): Filter by status ("processing" | "completed" | "failed")

**Headers:**
- `Authorization: Bearer <token>`

#### Response

**Success (200 OK):**
```javascript
{
  success: true,
  data: {
    docs: [
      {
        _id: "507f1f77bcf86cd799439011",
        originalFilename: "resume_v2.pdf",
        status: "completed",
        jobData: {
          experienceLevel: "mid",
          major: "Computer Science"
        },
        matchingScore: {
          overall: 82
        },
        createdAt: "2025-08-04T10:30:00.000Z"
      }
    ],
    totalDocs: 15,
    limit: 10,
    totalPages: 2,
    page: 1,
    pagingCounter: 1,
    hasPrevPage: false,
    hasNextPage: true,
    prevPage: null,
    nextPage: 2
  }
}
```

#### Example

```bash
curl -X GET "/api/v1/cv-analyzer/history?page=1&limit=5&status=completed" \
  -H "Authorization: Bearer <token>"
```

---

### 4. Reanalyze CV

**POST** `/reanalyze/:analysisId`

Reanalyzes an existing CV with new parameters (experience level, major, or job).

#### Request

**Parameters:**
- `analysisId` (required): MongoDB ObjectId of the existing analysis

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <token>`

**Body:**
```javascript
{
  experienceLevel: String,     // Optional: "entry" | "mid" | "senior" | "executive"
  major: String,              // Optional: Field of study/work (2-100 chars)
  jobId: String               // Optional: MongoDB ObjectId of target job
}
```

#### Response

**Success (200 OK):**
```javascript
{
  success: true,
  message: "CV reanalysis started successfully",
  data: {
    analysisId: "507f1f77bcf86cd799439011",
    status: "processing"
  }
}
```

**Error (404 Not Found):**
```javascript
{
  success: false,
  message: "Analysis not found"
}
```

#### Example

```bash
curl -X POST /api/v1/cv-analyzer/reanalyze/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "experienceLevel": "senior",
    "jobId": "507f1f77bcf86cd799439012"
  }'
```

---

### 5. Delete Analysis

**DELETE** `/:analysisId`

Deletes a CV analysis and its associated file.

#### Request

**Parameters:**
- `analysisId` (required): MongoDB ObjectId of the analysis

**Headers:**
- `Authorization: Bearer <token>`

#### Response

**Success (200 OK):**
```javascript
{
  success: true,
  message: "Analysis deleted successfully"
}
```

**Error (404 Not Found):**
```javascript
{
  success: false,
  message: "Analysis not found"
}
```

#### Example

```bash
curl -X DELETE /api/v1/cv-analyzer/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer <token>"
```

---

### 6. Get Analytics

**GET** `/analytics`

Retrieves user's CV analysis analytics and insights.

#### Request

**Query Parameters:**
- `timeframe` (optional): "7d" | "30d" | "90d" | "1y" (default: "30d")

**Headers:**
- `Authorization: Bearer <token>`

#### Response

**Success (200 OK):**
```javascript
{
  success: true,
  data: {
    summary: {
      totalAnalyses: 25,
      averageScore: 78.5,
      improvementTrend: "+12%",
      lastAnalysisDate: "2025-08-04T10:30:00.000Z"
    },
    scoreDistribution: {
      excellent: 5,    // 90-100
      good: 12,        // 80-89
      average: 6,      // 70-79
      poor: 2          // <70
    },
    topSkills: [
      { skill: "JavaScript", frequency: 20, averageScore: 85 },
      { skill: "React", frequency: 18, averageScore: 80 }
    ],
    improvementAreas: [
      { area: "ATS Compatibility", currentScore: 65, potentialGain: 20 },
      { area: "Skills Alignment", currentScore: 72, potentialGain: 15 }
    ],
    trendsOverTime: [
      { date: "2025-07-01", averageScore: 65 },
      { date: "2025-08-01", averageScore: 78 }
    ]
  }
}
```

#### Example

```bash
curl -X GET "/api/v1/cv-analyzer/analytics?timeframe=90d" \
  -H "Authorization: Bearer <token>"
```

---

### 7. Health Check

**GET** `/health`

Checks the health status of the CV Analyzer service.

#### Request

**Headers:**
- `Authorization: Bearer <token>`

#### Response

**Success (200 OK):**
```javascript
{
  success: true,
  message: "CV Analyzer service is running",
  timestamp: "2025-08-04T10:30:00.000Z",
  services: {
    openai: "configured",
    storage: "local",
    database: "connected"
  }
}
```

#### Example

```bash
curl -X GET /api/v1/cv-analyzer/health \
  -H "Authorization: Bearer <token>"
```

---

## Error Handling

All endpoints return standardized error responses:

### Common Error Codes

- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Duplicate resource
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Error Response Format

```javascript
{
  success: false,
  message: "Error description",
  error: "Detailed error message (development only)",
  field: "fieldName (for validation errors)",
  code: "ERROR_CODE (for specific error types)"
}
```

## Rate Limiting

- **CV Upload**: Maximum 5 uploads per minute per user
- **Analysis Results**: No specific limit (cached responses)
- **Reanalysis**: Maximum 3 reanalyses per minute per user

## File Constraints

- **File Types**: PDF only
- **File Size**: Maximum 10MB
- **Security**: Files are scanned and validated before processing
- **Storage**: Files are stored securely and deleted after analysis completion (optional retention)

## Performance Considerations

- **Async Processing**: CV analysis is performed asynchronously
- **Caching**: Frequent requests are cached for better performance
- **Pagination**: Large result sets are paginated
- **Background Jobs**: Long-running operations are handled in background

## Integration Examples

### JavaScript/React Frontend

```javascript
// Upload CV
const uploadCV = async (cvFile, experienceLevel, major) => {
  const formData = new FormData();
  formData.append('cv', cvFile);
  formData.append('experienceLevel', experienceLevel);
  formData.append('major', major);

  const response = await fetch('/api/v1/cv-analyzer/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return response.json();
};

// Poll for results
const pollResults = async (analysisId) => {
  const response = await fetch(`/api/v1/cv-analyzer/results/${analysisId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  
  if (data.data.status === 'processing') {
    // Continue polling
    setTimeout(() => pollResults(analysisId), 5000);
  } else {
    // Analysis complete
    displayResults(data.data);
  }
};
```

### Node.js Backend Integration

```javascript
import axios from 'axios';

const analyzeUserCV = async (userId, cvBuffer, jobData) => {
  const formData = new FormData();
  formData.append('cv', cvBuffer, 'resume.pdf');
  formData.append('experienceLevel', jobData.experienceLevel);
  formData.append('major', jobData.major);

  const response = await axios.post('/api/v1/cv-analyzer/upload', formData, {
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'multipart/form-data'
    }
  });

  return response.data;
};
```

## Security Notes

- All file uploads are validated and scanned
- JWT tokens are required for all operations
- Users can only access their own analyses
- Rate limiting prevents abuse
- Sensitive data is encrypted at rest
- File paths are sanitized to prevent directory traversal
- OpenAI API keys are securely managed
