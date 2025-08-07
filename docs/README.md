# Documentation Index

Welcome to the Capstone Kada Job Portal API documentation. This directory contains comprehensive guides for understanding, implementing, and maintaining the backend system.

## 📚 Documentation Files

### 1. [API Documentation](./api.md)
Complete API reference including all endpoints, request/response formats, and examples.

**What you'll find:**
- Complete endpoint documentation
- Request/response schemas
- Authentication requirements
- Error codes and handling
- Query parameters and filtering
- File upload specifications

### 2. [Authentication & Authorization](./authentication.md)
Detailed guide on the authentication system using JWT tokens.

**What you'll find:**
- JWT token structure and flow
- Authentication middleware explanation
- Role-based access control
- Security best practices
- Client-side implementation examples
- Testing authentication

### 3. [Database Schema & ERD](./database.md)
Complete database documentation with entity relationships and schema details.

**What you'll find:**
- Entity Relationship Diagram (ERD)
- Detailed schema definitions
- Database indexes for performance
- Data relationships explanation
- Virtual fields and methods
- Migration scripts

### 4. [Security Guide](./security.md)
Comprehensive security documentation covering environment variables, authentication, and deployment security.

**What you'll find:**
- Environment variable security best practices
- GitHub secrets resolution steps
- Authentication and JWT security
- API security measures
- Database protection strategies
- File upload security
- Production deployment security
- Incident response procedures

### 5. [Data Models](./models.md)
Comprehensive documentation of all Mongoose models.

**What you'll find:**
- User, Company, Job, Application models
- Category and SavedJob models
- Schema field specifications
- Model methods and middleware
- Validation rules
- Relationships between models

### 6. [Setup & Deployment](./setup.md)
Complete guide for setting up development environment and production deployment.

**What you'll find:**
- Development environment setup
- Environment configuration
- Database setup (local and cloud)
- File upload configuration
- Testing setup
- Production deployment strategies
- CI/CD pipeline configuration
- Monitoring and troubleshooting

## 🚀 Quick Start

1. **Read the Setup Guide**: Start with [setup.md](./setup.md) to get your development environment running
2. **Understand the Data**: Review [models.md](./models.md) and [database.md](./database.md) to understand the data structure
3. **Learn Authentication**: Check [authentication.md](./authentication.md) to understand security implementation
4. **API Reference**: Use [api.md](./api.md) as your complete API reference during development

## 🏗️ Architecture Overview

```
Frontend (React/Vite)
        ↓
   API Gateway/Nginx
        ↓
   Express.js Server
        ↓ ↓ ↓
   Auth    Routes    File Upload
        ↓
   MongoDB Database
```

### Key Technologies
- **Backend**: Node.js + Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer middleware
- **Validation**: Mongoose schema validation
- **Security**: bcrypt for password hashing

## 📋 API Endpoints Summary

| Category | Endpoints | Authentication |
|----------|-----------|----------------|
| **User Auth** | `/auth/*` | None/User |
| **Company Auth** | `/company/*` | None/Company |
| **Jobs** | `/api/jobs/*` | Optional/Company |
| **Applications** | `/api/applications/*` | User/Company |
| **Categories** | `/api/categories/*` | Optional |
| **Saved Jobs** | `/api/saved-jobs/*` | User |

## 🔐 Security Features

- **JWT Authentication** with role-based access control
- **Password Hashing** using bcrypt with salt rounds
- **Input Validation** at schema and route levels
- **File Upload Security** with type and size validation
- **CORS Configuration** for cross-origin requests
- **Environment Variables** for sensitive configuration

## 📊 Database Models

```
User ←→ SavedJob ←→ Job ←→ Company
 ↓                    ↑
Application ─────────┘
 ↓
Category
```

### Core Entities
- **User**: Job seekers with profiles, skills, and experience
- **Company**: Employers with company information and verification
- **Job**: Job postings with detailed requirements and benefits
- **Application**: Job applications with status tracking
- **Category**: Job categorization system
- **SavedJob**: User bookmarking system

## 🛠️ Development Workflow

1. **Environment Setup**
   ```bash
   npm install
   cp .env.example .env
   # Configure your .env file
   ```

2. **Database Seeding**
   ```bash
   npm run seed
   ```

3. **Development Server**
   ```bash
   npm run dev
   ```

4. **Testing**
   ```bash
   npm test
   ```

## 📈 Performance Considerations

- **Database Indexing**: Strategic indexes on frequently queried fields
- **Pagination**: Implemented on all list endpoints
- **File Upload Limits**: 5MB maximum file size with type validation
- **Query Optimization**: Efficient MongoDB queries with proper population
- **Text Search**: Full-text search capabilities on job fields

## 🔧 Configuration

### Required Environment Variables
```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_key_32_chars_minimum
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Optional Configuration
```env
MAX_FILE_SIZE=5000000
ALLOWED_FILE_TYPES=pdf,doc,docx,jpg,jpeg,png
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

## 🚀 Deployment Options

### Development
- Local MongoDB or MongoDB Atlas
- Node.js with nodemon for auto-restart
- File uploads to local filesystem

### Production
- MongoDB Atlas or managed MongoDB
- PM2 for process management
- Nginx as reverse proxy
- SSL/TLS certificates
- Cloud storage for file uploads (optional)

## 📞 API Usage Examples

### User Registration
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Doe","email":"john@example.com","password":"password123","phoneNumber":"1234567890"}'
```

### Get Jobs with Filters
```bash
curl "http://localhost:3000/api/jobs?type=full-time&location=San Francisco&page=1&limit=10"
```

### Submit Application (with file upload)
```bash
curl -X POST http://localhost:3000/api/applications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "jobId=job_id_here" \
  -F "fullName=John Doe" \
  -F "domicile=New York, NY" \
  -F "phoneNumber=+1234567890" \
  -F "resume=@/path/to/resume.pdf"
```

## 🧪 Testing

The API includes comprehensive testing setup:
- **Unit Tests**: Individual function and method testing
- **Integration Tests**: Full API endpoint testing
- **Authentication Tests**: JWT token validation testing
- **File Upload Tests**: Multer middleware testing

## 🔍 Monitoring & Debugging

### Development
- Console logging for requests and errors
- Detailed error messages with stack traces
- MongoDB query logging via Mongoose debug mode

### Production
- PM2 process monitoring
- Log aggregation and analysis
- Error tracking with Sentry (recommended)
- Performance monitoring with APM tools

## 📝 Contributing

When contributing to this project:

1. **Follow the established patterns** in existing routes and models
2. **Update documentation** when adding new features
3. **Write tests** for new functionality
4. **Use proper error handling** with consistent error formats
5. **Follow security best practices** for authentication and data validation

## 🆘 Support & Troubleshooting

Common issues and solutions:

1. **Database Connection Issues**: Check MongoDB URI and network access
2. **JWT Token Problems**: Verify JWT_SECRET length and token format
3. **File Upload Failures**: Check file size, type, and directory permissions
4. **CORS Errors**: Verify FRONTEND_URL configuration
5. **Port Conflicts**: Ensure port 3000 is available or change PORT environment variable

For more detailed troubleshooting, see the [Setup & Deployment Guide](./setup.md).

---

## 📁 File Structure Reference

```
docs/
├── README.md              # This file - documentation index
├── api.md                 # Complete API reference
├── authentication.md      # Auth system documentation
├── database.md           # Database schema and ERD
├── models.md             # Data models documentation
└── setup.md              # Setup and deployment guide
```

---

*This documentation is maintained alongside the codebase. Last updated: July 31, 2025*
