# Authentication & Authorization Guide

## Overview

The Capstone Kada Job Portal API uses JWT (JSON Web Tokens) for authentication and role-based authorization to secure endpoints.

## Authentication Flow

### 1. User Registration & Login
```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Server
    participant DB as Database

    C->>API: POST /auth/register (user data)
    API->>DB: Create user with hashed password
    DB-->>API: User created
    API-->>C: Success message

    C->>API: POST /auth/login (email, password)
    API->>DB: Find user by email
    DB-->>API: User data
    API->>API: Compare passwords
    API->>API: Generate JWT token
    API-->>C: Token + User data
```

### 2. Company Registration & Login
```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Server
    participant DB as Database

    C->>API: POST /company/register (company data)
    API->>DB: Create company with hashed password
    DB-->>API: Company created
    API-->>C: Success message

    C->>API: POST /company/login (email, password)
    API->>DB: Find company by email
    DB-->>API: Company data
    API->>API: Compare passwords
    API->>API: Generate JWT token
    API-->>C: Token + Company data
```

## JWT Token Structure

### User Token
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "type": "user",
  "iat": 1643723400,
  "exp": 1643809800
}
```

### Company Token
```json
{
  "companyId": "507f1f77bcf86cd799439011",
  "email": "company@example.com",
  "type": "company",
  "iat": 1643723400,
  "exp": 1643809800
}
```

## Sending Authentication Tokens

### Method 1: Authorization Header (Recommended)
```http
GET /api/jobs
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Method 2: Cookie
```http
GET /api/jobs
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Authentication Middleware

### authenticateUser
- **Purpose**: Validates user tokens
- **Usage**: Routes that require user authentication
- **Sets**: `req.user` object

```javascript
// Example protected route
router.get('/profile', authenticateUser, (req, res) => {
  res.json(req.user);
});
```

### authenticateCompany
- **Purpose**: Validates company tokens
- **Usage**: Routes that require company authentication
- **Sets**: `req.company` object

```javascript
// Example protected route
router.post('/jobs', authenticateCompany, (req, res) => {
  // req.company contains authenticated company data
});
```

### authenticateAny
- **Purpose**: Accepts either user or company tokens
- **Usage**: Routes accessible by both user types
- **Sets**: `req.user` or `req.company` + `req.userType`

```javascript
// Example route accessible by both
router.get('/search', authenticateAny, (req, res) => {
  if (req.userType === 'user') {
    // Handle user-specific logic
  } else if (req.userType === 'company') {
    // Handle company-specific logic
  }
});
```

### optionalAuth
- **Purpose**: Optional authentication (doesn't fail if no token)
- **Usage**: Routes with different behavior for authenticated/anonymous users
- **Sets**: `req.user` or `req.company` if token is valid

```javascript
// Example route with optional auth
router.get('/jobs', optionalAuth, (req, res) => {
  // Different response based on authentication status
  if (req.user) {
    // Include saved jobs status
  }
});
```

## Authorization Patterns

### Resource Ownership
Many endpoints implement ownership-based authorization:

```javascript
// Users can only access their own applications
router.get('/applications/:id', authenticateUser, async (req, res) => {
  const application = await Application.findById(req.params.id);
  
  if (application.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  
  res.json(application);
});

// Companies can only manage their own jobs
router.put('/jobs/:id', authenticateCompany, async (req, res) => {
  const job = await Job.findOne({ 
    _id: req.params.id, 
    companyId: req.company._id 
  });
  
  if (!job) {
    return res.status(404).json({ message: 'Job not found or unauthorized' });
  }
  
  // Update job...
});
```

## Error Responses

### 401 Unauthorized
```json
{
  "message": "Access denied. No token provided.",
  "statusCode": 401
}
```

```json
{
  "message": "Invalid token.",
  "statusCode": 401
}
```

### 403 Forbidden
```json
{
  "message": "Access denied. Invalid token type.",
  "statusCode": 403
}
```

```json
{
  "message": "Unauthorized",
  "statusCode": 403
}
```

## Security Best Practices

### Token Security
1. **Expiration**: Tokens expire after 24 hours
2. **HTTPS Only**: Use HTTPS in production
3. **Secure Storage**: Store tokens securely on client side
4. **Token Refresh**: Implement token refresh mechanism

### Password Security
1. **Hashing**: Passwords are hashed using bcrypt with salt rounds of 10
2. **Minimum Length**: 6 characters minimum
3. **No Plain Text**: Passwords are never stored in plain text

### API Security
1. **CORS**: Configured for specific origins
2. **Rate Limiting**: Implement rate limiting for production
3. **Input Validation**: Validate all inputs
4. **SQL Injection**: Protected by MongoDB and Mongoose

## Environment Variables

Required environment variables for authentication:

```env
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_characters
JWT_EXPIRE=24h
NODE_ENV=development
```

## Client-Side Implementation Examples

### JavaScript/Fetch
```javascript
// Login
const login = async (email, password, userType = 'user') => {
  const endpoint = userType === 'user' ? '/auth/login' : '/company/login';
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (response.ok) {
    // Store token
    localStorage.setItem('token', data.token);
    localStorage.setItem('userType', data.user ? 'user' : 'company');
    return data;
  } else {
    throw new Error(data.message);
  }
};

// Authenticated request
const makeAuthenticatedRequest = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.status === 401) {
    // Token expired or invalid
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
    // Redirect to login
    window.location.href = '/login';
  }
  
  return response;
};
```

### React Hook Example
```javascript
import { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userType, setUserType] = useState(localStorage.getItem('userType'));

  const login = async (email, password, type = 'user') => {
    const endpoint = type === 'user' ? '/auth/login' : '/company/login';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      setToken(data.token);
      setUser(data.user || data.company);
      setUserType(type);
      localStorage.setItem('token', data.token);
      localStorage.setItem('userType', type);
    } else {
      throw new Error(data.message);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setUserType(null);
    localStorage.removeItem('token');
    localStorage.removeItem('userType');
  };

  const authFetch = async (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': token ? `Bearer ${token}` : undefined
      }
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      userType,
      login,
      logout,
      authFetch,
      isAuthenticated: !!token
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

## Testing Authentication

### Manual Testing with curl
```bash
# User login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Use token in subsequent requests
curl -X GET http://localhost:3000/api/applications/my-applications \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Company login
curl -X POST http://localhost:3000/company/login \
  -H "Content-Type: application/json" \
  -d '{"email":"company@example.com","password":"password123"}'
```

### Unit Test Example
```javascript
import request from 'supertest';
import app from '../app.js';

describe('Authentication', () => {
  let userToken;
  let companyToken;

  beforeAll(async () => {
    // Create test user and company
    // Login and get tokens
    const userResponse = await request(app)
      .post('/auth/login')
      .send({ email: 'test@user.com', password: 'password123' });
    
    userToken = userResponse.body.token;

    const companyResponse = await request(app)
      .post('/company/login')
      .send({ email: 'test@company.com', password: 'password123' });
    
    companyToken = companyResponse.body.token;
  });

  test('should access protected user route with valid token', async () => {
    const response = await request(app)
      .get('/api/applications/my-applications')
      .set('Authorization', `Bearer ${userToken}`);
    
    expect(response.status).toBe(200);
  });

  test('should reject access without token', async () => {
    const response = await request(app)
      .get('/api/applications/my-applications');
    
    expect(response.status).toBe(401);
  });
});
```

---

*Last updated: July 31, 2025*
