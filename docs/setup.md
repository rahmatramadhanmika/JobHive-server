# Setup & Deployment Guide

## Table of Contents
1. [Development Setup](#development-setup)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [File Upload Configuration](#file-upload-configuration)
5. [Running the Application](#running-the-application)
6. [Testing](#testing)
7. [Production Deployment](#production-deployment)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Monitoring & Logging](#monitoring--logging)
10. [Troubleshooting](#troubleshooting)

## Development Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- MongoDB (local or cloud)
- Git

### Installation Steps

1. **Clone the Repository**
```bash
git clone <repository-url>
cd bootcamp-capstone/backend
```

2. **Install Dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Create Upload Directory**
```bash
mkdir uploads
```

### Project Structure
```
backend/
├── config/
│   └── passport.js          # Passport configuration
├── docs/                    # Documentation
│   ├── api.md
│   ├── authentication.md
│   ├── database.md
│   └── setup.md
├── middleware/              # Custom middleware
│   └── auth.js             # Authentication middleware
├── models/                  # Mongoose models
│   ├── user.model.js
│   ├── company.model.js
│   ├── job.model.js
│   ├── application.model.js
│   ├── category.model.js
│   └── savedjob.model.js
├── routers/                 # API routes
│   ├── user.js
│   ├── company.js
│   ├── job.js
│   └── application.js
├── scripts/                 # Utility scripts
│   └── seed.js             # Database seeder
├── uploads/                 # File uploads
├── .env.example            # Environment template
├── .gitignore
├── app.js                  # Express app configuration
├── index.js                # Server entry point
└── package.json
```

## Environment Configuration

### .env File
```env
# Database Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_characters
JWT_EXPIRE=24h

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:5173

# File Upload Configuration
MAX_FILE_SIZE=5000000
ALLOWED_FILE_TYPES=pdf,doc,docx,jpg,jpeg,png

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Session Configuration
SESSION_SECRET=your_session_secret_here
```

### Environment Variables Description

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MONGODB_URI` | MongoDB connection string | - | Yes |
| `JWT_SECRET` | Secret key for JWT tokens (min 32 chars) | - | Yes |
| `JWT_EXPIRE` | JWT token expiration time | 24h | No |
| `PORT` | Server port | 3000 | No |
| `NODE_ENV` | Environment mode | development | No |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:5173 | No |
| `MAX_FILE_SIZE` | Maximum file upload size in bytes | 5000000 | No |
| `ALLOWED_FILE_TYPES` | Allowed file extensions | pdf,doc,docx,jpg,jpeg,png | No |

## Database Setup

### MongoDB Atlas (Recommended)

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a free account

2. **Create Cluster**
   - Create a new cluster (free tier available)
   - Choose your preferred region

3. **Create Database User**
   - Go to Database Access
   - Add new database user with read/write permissions

4. **Configure Network Access**
   - Go to Network Access
   - Add IP addresses that should have access

5. **Get Connection String**
   - Go to Clusters → Connect
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

### Local MongoDB

1. **Install MongoDB**
```bash
# macOS with Homebrew
brew install mongodb-community

# Ubuntu
sudo apt-get install mongodb

# Windows
# Download from https://www.mongodb.com/try/download/community
```

2. **Start MongoDB Service**
```bash
# macOS/Linux
sudo systemctl start mongod

# Or use brew services on macOS
brew services start mongodb-community
```

3. **Connection String**
```env
MONGODB_URI=mongodb://localhost:27017/capstone_kada
```

### Database Seeding

Run the seeder script to populate initial data:

```bash
npm run seed
```

The seeder creates:
- Sample categories
- Test users and companies
- Sample job postings
- Demo applications

## File Upload Configuration

### Upload Directory Setup
```bash
# Create uploads directory
mkdir uploads

# Set proper permissions (Linux/macOS)
chmod 755 uploads
```

### Multer Configuration
The application uses Multer for file uploads with the following settings:

- **Maximum file size**: 5MB
- **Allowed formats**: PDF, DOC, DOCX, JPG, JPEG, PNG
- **Storage location**: `./uploads/`
- **Filename format**: `timestamp + original_extension`

### File Security
- File type validation based on extension and MIME type
- File size limits enforced
- Sanitized file names to prevent directory traversal
- Files served through controlled endpoint

## Running the Application

### Development Mode
```bash
# Start with auto-reload (nodemon)
npm run dev

# Or start normally
npm start
```

### Production Mode
```bash
# Set production environment
export NODE_ENV=production

# Start application
npm start
```

### Available Scripts
```json
{
  "start": "node index.js",
  "dev": "nodemon index.js",
  "seed": "node scripts/seed.js",
  "test": "jest",
  "test:watch": "jest --watch"
}
```

### API Health Check
Test if the application is running:
```bash
curl http://localhost:3000/uploads
# Should return file listing or 404 if empty
```

## Testing

### Unit Testing Setup
```bash
# Install testing dependencies
npm install --save-dev jest supertest

# Create test directory
mkdir tests
```

### Sample Test File
```javascript
// tests/auth.test.js
import request from 'supertest';
import app from '../app.js';

describe('Authentication', () => {
  test('should register a new user', async () => {
    const userData = {
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      phoneNumber: '1234567890'
    };

    const response = await request(app)
      .post('/auth/register')
      .send(userData);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('User registered successfully.');
  });
});
```

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## Production Deployment

### Environment Setup

1. **Server Requirements**
   - Node.js 18+
   - PM2 for process management
   - Nginx for reverse proxy
   - SSL certificate

2. **Environment Variables**
```bash
# Production .env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://prod_user:password@prod-cluster.mongodb.net/prod_db
JWT_SECRET=super_secure_production_secret_key_32_chars_minimum
FRONTEND_URL=https://your-domain.com
```

### PM2 Deployment

1. **Install PM2**
```bash
npm install -g pm2
```

2. **Create PM2 Configuration**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'capstone-kada-api',
    script: 'index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

3. **Deploy with PM2**
```bash
# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/capstone-kada-api
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # File uploads
    client_max_body_size 10M;
}
```

### SSL Configuration (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Docker Deployment

1. **Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN mkdir -p uploads

EXPOSE 3000

USER node

CMD ["npm", "start"]
```

2. **docker-compose.yml**
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: unless-stopped
```

3. **Deploy with Docker**
```bash
# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f api

# Update deployment
docker-compose pull
docker-compose up -d --build
```

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/capstone-kada-api
            git pull origin main
            npm ci --only=production
            pm2 reload ecosystem.config.js --env production
```

## Monitoring & Logging

### PM2 Monitoring
```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart capstone-kada-api

# Check status
pm2 status
```

### Application Logging

```javascript
// Simple logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});
```

### Error Monitoring (Production)

For production, consider implementing:
- **Sentry** for error tracking
- **Winston** for structured logging
- **Morgan** for HTTP request logging

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
```bash
# Check connection string
echo $MONGODB_URI

# Test connection
mongosh "$MONGODB_URI"
```

2. **File Upload Issues**
```bash
# Check uploads directory permissions
ls -la uploads/

# Create directory if missing
mkdir -p uploads
chmod 755 uploads
```

3. **JWT Token Issues**
```bash
# Verify JWT secret length
echo $JWT_SECRET | wc -c
# Should be at least 32 characters
```

4. **Port Already in Use**
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

5. **CORS Issues**
```javascript
// Check CORS configuration in app.js
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
```

### Performance Optimization

1. **Database Indexes**
   - Ensure proper indexes are created (see database.md)
   - Monitor slow queries

2. **File Upload Optimization**
   - Implement file compression
   - Use cloud storage (AWS S3, Google Cloud Storage)

3. **Caching**
   - Implement Redis for session storage
   - Cache frequently accessed data

4. **Rate Limiting**
```bash
npm install express-rate-limit
```

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Health Checks

```javascript
// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});
```

### Backup Strategy

1. **Database Backups**
```bash
# MongoDB dump
mongodump --uri="$MONGODB_URI" --out=/backup/$(date +%Y%m%d)

# Restore
mongorestore --uri="$MONGODB_URI" /backup/20250131
```

2. **File Backups**
```bash
# Backup uploads directory
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/

# Sync to cloud storage
aws s3 sync uploads/ s3://your-bucket/uploads/
```

---

*Last updated: July 31, 2025*
