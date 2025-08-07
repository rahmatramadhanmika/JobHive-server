# Security Guide

## Overview
This guide covers security best practices for the Job Portal application, including environment variable management, authentication security, and data protection.

## Environment Variables Security

### Current Security Issue Resolution
If GitHub detected secrets in your repository, follow these steps:

1. **Immediate Actions Taken:**
   - Removed sensitive data from `.env` file
   - Updated `.env.example` with placeholder values
   - Ensured `.gitignore` excludes `.env` files

2. **Additional Steps Required:**
   ```powershell
   # Remove sensitive files from git history (if they were committed)
   git filter-branch --force --index-filter "git rm --cached --ignore-unmatch backend/.env" --prune-empty --tag-name-filter cat -- --all
   
   # Or use BFG Repo-Cleaner (recommended)
   # Download BFG and run:
   # java -jar bfg.jar --delete-files .env
   # git reflog expire --expire=now --all && git gc --prune=now --aggressive
   ```

3. **Force push to update remote repository:**
   ```powershell
   git push --force-with-lease origin main
   ```

### Environment Variable Best Practices

#### 1. Local Development
- Copy `.env.example` to `.env`
- Fill in your actual values in `.env`
- Never commit `.env` to version control

#### 2. Production Environment Variables
```bash
# Database - Use MongoDB Atlas or secure MongoDB instance
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jobportal_prod

# JWT - Generate strong secret (32+ characters)
JWT_SECRET=super_secure_random_string_min_32_chars
JWT_EXPIRE=24h

# Server
PORT=3000
NODE_ENV=production

# Admin - Strong random token
ADMIN_TOKEN=admin_secure_token_here

# Google OAuth (if using)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# CORS
FRONTEND_URL=https://your-frontend-domain.com
```

#### 3. Generating Secure Secrets
```javascript
// Generate JWT Secret
const crypto = require('crypto');
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('JWT_SECRET=' + jwtSecret);

// Generate Admin Token
const adminToken = crypto.randomBytes(32).toString('hex');
console.log('ADMIN_TOKEN=' + adminToken);
```

## Authentication Security

### JWT Token Security
- Use strong, random secrets (minimum 256 bits)
- Set appropriate expiration times
- Implement token refresh mechanism
- Store tokens securely on client-side

### Password Security
- Passwords are hashed using bcrypt (cost factor 12)
- Implement password strength requirements
- Add rate limiting for login attempts

### OAuth Security
- Validate OAuth tokens server-side
- Store minimal user data from OAuth providers
- Implement proper scope validation

## API Security

### Rate Limiting
```javascript
// Implement in app.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api', limiter);
```

### Input Validation
- Sanitize all user inputs
- Use Joi or similar for request validation
- Implement CORS properly
- Validate file uploads strictly

### Security Headers
```javascript
// Add security headers
const helmet = require('helmet');
app.use(helmet());

// CORS configuration
const cors = require('cors');
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

## Database Security

### MongoDB Security
- Use connection strings with authentication
- Implement database-level access controls
- Enable MongoDB audit logging
- Use encrypted connections (TLS/SSL)

### Data Protection
- Encrypt sensitive data at rest
- Implement proper data backup strategies
- Follow GDPR/privacy regulations
- Use parameterized queries (Mongoose handles this)

## File Upload Security

### Current Implementation
```javascript
// Secure file upload configuration
const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || ['pdf', 'doc', 'docx'];
const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5000000; // 5MB

// Validate file types and scan for malware
const multer = require('multer');
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
```

### Additional Security Measures
- Scan uploaded files for malware
- Store files outside web root
- Implement virus scanning
- Set file size limits
- Validate file headers, not just extensions

## Deployment Security

### Production Checklist
- [ ] Use HTTPS only
- [ ] Set NODE_ENV=production
- [ ] Remove development dependencies
- [ ] Enable security headers
- [ ] Configure proper logging
- [ ] Set up monitoring and alerts
- [ ] Regular security updates
- [ ] Database backup strategy
- [ ] Implement CI/CD security scans

### Environment-Specific Configurations
```javascript
// Production-specific middleware
if (process.env.NODE_ENV === 'production') {
  // Enhanced security in production
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"]
      }
    }
  }));
}
```

## Monitoring and Logging

### Security Logging
- Log authentication attempts
- Monitor failed login attempts
- Track API usage patterns
- Alert on suspicious activities

### Log Security
- Don't log sensitive data (passwords, tokens)
- Implement log rotation
- Secure log storage
- Regular log analysis

## Incident Response

### Security Breach Protocol
1. **Immediate Response:**
   - Identify and contain the breach
   - Revoke compromised credentials
   - Update all secrets and tokens

2. **Investigation:**
   - Analyze logs for breach extent
   - Identify affected data
   - Document timeline of events

3. **Recovery:**
   - Apply security patches
   - Update security measures
   - Notify affected users if required

4. **Prevention:**
   - Implement additional security measures
   - Update security policies
   - Conduct security training

## Security Tools and Resources

### Recommended Tools
- **Helmet.js** - Security headers
- **express-rate-limit** - Rate limiting
- **bcrypt** - Password hashing
- **joi** - Input validation
- **express-validator** - Request validation
- **morgan** - Logging middleware

### Security Scanning
```powershell
# NPM audit for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Install security-focused packages
npm install helmet express-rate-limit express-validator morgan
```

### Code Security Analysis
- Use ESLint security plugins
- Implement Snyk or similar security scanning
- Regular dependency updates
- Code security reviews

## Contact and Support
For security-related issues:
- Report vulnerabilities privately
- Follow responsible disclosure
- Keep security documentation updated
