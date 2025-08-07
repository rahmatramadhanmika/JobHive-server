# Job Portal Backend API

A comprehensive MERN stack backend for a job portal application with integrated CV analysis capabilities powered by OpenAI GPT-4.

## 🚀 Features

### Core Job Portal Features
- **User Management**: Registration, authentication, profile management
- **Company Management**: Company profiles, job posting management
- **Job Management**: Job listings, applications, search and filtering
- **Application Tracking**: Application status management and notifications

### 🆕 CV Analyzer Module (NEW)
- **AI-Powered CV Analysis**: OpenAI GPT-4 integration for intelligent resume analysis
- **ATS Compatibility**: Automated Applicant Tracking System compatibility assessment
- **Skills Gap Analysis**: Identification of missing skills and improvement recommendations
- **Market Positioning**: Industry-specific insights and salary benchmarking
- **Performance Analytics**: User analytics and improvement tracking
- **Enterprise Security**: Comprehensive security measures and data protection

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [CV Analyzer Module](#cv-analyzer-module)
- [Environment Configuration](#environment-configuration)
- [Database Schema](#database-schema)
- [Security](#security)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6.0 or higher)
- Redis (v7.0 or higher)
- OpenAI API key (for CV Analyzer)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bootcamp-capstone/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the services**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

### Using Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000
```

### Core Endpoints

#### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

#### Jobs
- `GET /api/jobs` - List jobs with filtering
- `POST /api/jobs` - Create job (company only)
- `GET /api/jobs/:id` - Get job details
- `PUT /api/jobs/:id` - Update job (company only)
- `DELETE /api/jobs/:id` - Delete job (company only)

#### Applications
- `POST /api/applications` - Submit job application
- `GET /api/applications` - Get user applications
- `GET /api/applications/:id` - Get application details

#### Companies
- `GET /company/profile` - Get company profile
- `PUT /company/profile` - Update company profile
- `GET /company/jobs` - Get company's jobs

### 🆕 CV Analyzer Endpoints

#### Upload & Analysis
- `POST /api/v1/cv-analyzer/upload` - Upload and analyze CV
- `GET /api/v1/cv-analyzer/results/:analysisId` - Get analysis results
- `POST /api/v1/cv-analyzer/reanalyze/:analysisId` - Reanalyze with new parameters

#### History & Analytics
- `GET /api/v1/cv-analyzer/history` - Get analysis history
- `GET /api/v1/cv-analyzer/analytics` - Get user analytics
- `DELETE /api/v1/cv-analyzer/:analysisId` - Delete analysis

#### Health Check
- `GET /api/v1/cv-analyzer/health` - Service health status

For detailed API documentation, see [CV Analyzer API Documentation](./docs/cv-analyzer/api-documentation.md).

## 🔬 CV Analyzer Module

The CV Analyzer is an enterprise-grade module that leverages OpenAI GPT-4 to provide intelligent CV analysis and career insights.

### Key Features

- **🤖 AI Analysis**: Advanced prompt engineering for comprehensive CV evaluation
- **📊 ATS Compatibility**: Automated scanning for ATS-friendly formatting
- **💼 Skills Assessment**: Multi-dimensional skill analysis with proficiency levels
- **📈 Market Insights**: Industry benchmarking and salary analysis
- **🔒 Enterprise Security**: Advanced security measures and data protection
- **⚡ High Performance**: Async processing and caching for scalability

### Analysis Output

```json
{
  "overallScore": 85,
  "sections": {
    "atsCompatibility": { "score": 90, "recommendations": [...] },
    "skillsAlignment": { "score": 80, "missingSkills": [...] },
    "experienceRelevance": { "score": 85, "strengths": [...] },
    "achievementQuantification": { "score": 70, "improvements": [...] },
    "marketPositioning": { "score": 88, "competitiveAnalysis": {...} }
  },
  "recommendations": [
    {
      "priority": "high",
      "category": "skills",
      "suggestion": "Add Docker and Kubernetes experience",
      "impact": "Could increase job match rate by 25%"
    }
  ],
  "marketInsights": {
    "salaryRange": "$80K - $120K",
    "demandLevel": "high",
    "competitionLevel": "moderate"
  }
}
```

### Documentation

- [🏗️ Architecture](./docs/cv-analyzer/architecture.md)
- [🤖 OpenAI Integration](./docs/cv-analyzer/openai-integration.md)
- [🔒 Security Considerations](./docs/cv-analyzer/security-considerations.md)
- [⚡ Performance Optimization](./docs/cv-analyzer/performance-optimization.md)
- [🚀 Deployment Guide](./docs/cv-analyzer/deployment-guide.md)

## ⚙️ Environment Configuration

### Required Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/jobportal
REDIS_HOST=localhost
REDIS_PORT=6379

# Authentication
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret

# CV Analyzer
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.3

# File Upload
CV_MAX_FILE_SIZE=10485760
CV_UPLOAD_DIR=uploads/cv-analyzer

# Security
FILE_ENCRYPTION_KEY=your-256-bit-encryption-key
```

### Optional Configuration

```env
# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Production Settings
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://yourapp.com

# Monitoring
ELASTIC_APM_SERVER_URL=https://your-apm-server
PROMETHEUS_ENDPOINT=/metrics
```

## 🗄️ Database Schema

### Core Models

- **User**: User profiles and authentication
- **Company**: Company profiles and information
- **Job**: Job listings and requirements
- **Application**: Job applications and status
- **Category**: Job categories and classifications

### CV Analyzer Models

- **CVAnalysis**: Complete analysis records and results
- **UserConsent**: GDPR compliance and consent tracking
- **AuditLog**: Security and access logging
- **SecurityIncident**: Security incident tracking

For detailed schema documentation, see [Database Schema](./docs/cv-analyzer/database-schema.md).

## 🔒 Security

### Security Features

- **Authentication**: JWT-based authentication with refresh tokens
- **Authorization**: Role-based access control (User/Company/Admin)
- **File Security**: Malware scanning and content validation
- **Data Protection**: Encryption at rest and in transit
- **Rate Limiting**: API rate limiting and DDoS protection
- **Input Validation**: Comprehensive input sanitization
- **Security Headers**: CORS, CSP, and security headers
- **Audit Logging**: Complete audit trail for security events

### GDPR Compliance

- Data minimization and retention policies
- User data export and deletion capabilities
- Consent management and tracking
- Privacy by design architecture

For detailed security information, see [Security Considerations](./docs/cv-analyzer/security-considerations.md).

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# CV Analyzer tests
npm run test:cv-analyzer

# Load testing
npm run test:load

# Test coverage
npm run test:coverage
```

### Test Structure

```
tests/
├── unit/                 # Unit tests
├── integration/          # Integration tests
├── cv-analyzer.test.js   # CV Analyzer tests
└── fixtures/             # Test data and fixtures
```

## 🚀 Deployment

### Development

```bash
npm run dev
```

### Production with PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 status
pm2 logs
```

### Docker Deployment

```bash
# Build image
docker build -t cv-analyzer-api .

# Run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f cv-analyzer-api
```

### Kubernetes

```bash
# Apply manifests
kubectl apply -f k8s/

# Check status
kubectl get pods -n cv-analyzer

# View logs
kubectl logs -f deployment/cv-analyzer-api -n cv-analyzer
```

For detailed deployment instructions, see [Deployment Guide](./docs/cv-analyzer/deployment-guide.md).

## 📊 Monitoring

### Metrics and Monitoring

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Dashboard and visualization
- **Elastic APM**: Application performance monitoring
- **Health Checks**: Endpoint health monitoring

### Key Metrics

- CV analysis completion time
- OpenAI API response time and cost
- Queue size and processing rate
- Error rates and success rates
- Resource utilization

## 🔧 Performance

### Optimization Features

- **Async Processing**: Background job processing with Bull Queue
- **Caching**: Multi-layer caching with Redis and in-memory cache
- **Database Optimization**: Optimized indexes and queries
- **File Processing**: Parallel PDF processing with worker threads
- **API Optimization**: Response compression and streaming

### Performance Targets

- Upload response time: < 500ms
- Analysis completion: < 3 minutes (95th percentile)
- Results retrieval: < 200ms
- Concurrent users: 1000+ simultaneous analyses
- Throughput: 10,000+ analyses per day

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards

- ESLint for code linting
- Prettier for code formatting
- JSDoc for documentation
- Conventional commits for commit messages

### Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure CI/CD passes
4. Request review from maintainers

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation

- [CV Analyzer Architecture](./docs/cv-analyzer/architecture.md)
- [API Documentation](./docs/cv-analyzer/api-documentation.md)
- [Troubleshooting Guide](./docs/cv-analyzer/troubleshooting.md)

### Getting Help

- Create an issue for bug reports
- Use discussions for questions
- Check existing documentation first

## 🔄 Changelog

### v2.0.0 - CV Analyzer Module
- ✨ Added AI-powered CV analysis
- ✨ OpenAI GPT-4 integration
- ✨ ATS compatibility checking
- ✨ Skills gap analysis
- ✨ Market positioning insights
- ✨ Enterprise security features
- ✨ Performance optimization
- ✨ Comprehensive documentation

### v1.0.0 - Core Job Portal
- ✨ User and company management
- ✨ Job posting and applications
- ✨ Authentication and authorization
- ✨ File upload capabilities
- ✨ Basic API endpoints

---

**Built with ❤️ by the Job Portal Team**

For questions or support, please contact the development team or create an issue in the repository.
