# CV Analyzer Security Considerations

This document outlines comprehensive security measures implemented in the CV Analyzer module to protect user data, prevent attacks, and ensure compliance with data protection regulations.

## Security Architecture

### Defense in Depth Strategy

The CV Analyzer implements multiple layers of security:

1. **Network Security**: HTTPS, CORS, rate limiting
2. **Authentication & Authorization**: JWT-based auth, user isolation
3. **Input Validation**: File validation, content sanitization
4. **Data Protection**: Encryption, secure storage, data minimization
5. **API Security**: Rate limiting, request validation, secure headers
6. **Third-party Security**: OpenAI API security, secure integrations

## File Upload Security

### File Validation

```javascript
// File type validation
const allowedMimeTypes = ['application/pdf'];
const allowedExtensions = ['.pdf'];

const validateFileType = (file) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new SecurityError('Invalid file type. Only PDF files are allowed.');
  }
  
  const extension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    throw new SecurityError('Invalid file extension.');
  }
};

// File size validation
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const validateFileSize = (file) => {
  if (file.size > MAX_FILE_SIZE) {
    throw new SecurityError('File size exceeds maximum limit of 10MB.');
  }
  
  if (file.size === 0) {
    throw new SecurityError('Empty files are not allowed.');
  }
};
```

### File Content Scanning

```javascript
import crypto from 'crypto';
import { execSync } from 'child_process';

class FileSecurityScanner {
  
  // Virus scanning (production implementation)
  async scanForMalware(filePath) {
    try {
      // In production, integrate with ClamAV or similar
      execSync(`clamscan --no-summary --infected ${filePath}`);
      return { safe: true };
    } catch (error) {
      throw new SecurityError('File contains malicious content');
    }
  }
  
  // PDF structure validation
  async validatePDFStructure(filePath) {
    const buffer = await fs.readFile(filePath);
    
    // Check PDF header
    if (!buffer.toString('ascii', 0, 4) === '%PDF') {
      throw new SecurityError('Invalid PDF file structure');
    }
    
    // Check for embedded scripts or suspicious content
    const content = buffer.toString('ascii');
    const suspiciousPatterns = [
      /\/JavaScript/i,
      /\/JS/i,
      /\/OpenAction/i,
      /\/AA/i,
      /\/AcroForm/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        throw new SecurityError('PDF contains potentially malicious content');
      }
    }
    
    return { valid: true };
  }
  
  // Generate secure filename
  generateSecureFilename(originalName) {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(originalName);
    
    // Sanitize original name
    const baseName = path.basename(originalName, extension)
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 50);
    
    return `${timestamp}_${randomBytes}_${baseName}${extension}`;
  }
}
```

### Secure File Storage

```javascript
class SecureFileManager {
  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'cv-analyzer');
    this.encryptionKey = process.env.FILE_ENCRYPTION_KEY;
  }
  
  // Encrypt file at rest
  async encryptFile(filePath) {
    const algorithm = 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, this.encryptionKey, iv);
    
    const input = fs.createReadStream(filePath);
    const output = fs.createWriteStream(`${filePath}.enc`);
    
    return new Promise((resolve, reject) => {
      input.pipe(cipher).pipe(output);
      output.on('finish', () => {
        fs.unlink(filePath); // Delete original
        resolve(`${filePath}.enc`);
      });
      output.on('error', reject);
    });
  }
  
  // Decrypt file for processing
  async decryptFile(encryptedPath) {
    const algorithm = 'aes-256-gcm';
    const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
    
    const input = fs.createReadStream(encryptedPath);
    const output = fs.createWriteStream(encryptedPath.replace('.enc', ''));
    
    return new Promise((resolve, reject) => {
      input.pipe(decipher).pipe(output);
      output.on('finish', () => resolve(encryptedPath.replace('.enc', '')));
      output.on('error', reject);
    });
  }
  
  // Secure file deletion
  async secureDelete(filePath) {
    try {
      // Overwrite file multiple times before deletion
      const fileSize = (await fs.stat(filePath)).size;
      const randomData = crypto.randomBytes(fileSize);
      
      // Overwrite with random data 3 times
      for (let i = 0; i < 3; i++) {
        await fs.writeFile(filePath, randomData);
        await fs.fsync((await fs.open(filePath, 'r+')).fd);
      }
      
      // Final deletion
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Secure deletion failed:', error);
      // Fallback to regular deletion
      await fs.unlink(filePath);
    }
  }
}
```

## Input Validation & Sanitization

### Request Validation

```javascript
import joi from 'joi';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

class InputValidator {
  
  // CV upload validation schema
  static cvUploadSchema = joi.object({
    experienceLevel: joi.string()
      .valid('entry', 'mid', 'senior', 'executive')
      .required(),
    major: joi.string()
      .min(2)
      .max(100)
      .pattern(/^[a-zA-Z0-9\s\-&,.()]+$/)
      .required(),
    jobId: joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
  });
  
  // Validate and sanitize input
  static validateCVUpload(data) {
    const { error, value } = this.cvUploadSchema.validate(data);
    
    if (error) {
      throw new ValidationError(error.details[0].message);
    }
    
    // Sanitize string inputs
    return {
      experienceLevel: value.experienceLevel,
      major: this.sanitizeString(value.major),
      jobId: value.jobId
    };
  }
  
  // Sanitize text content
  static sanitizeString(input) {
    if (typeof input !== 'string') return input;
    
    // Remove HTML tags and suspicious content
    const cleaned = purify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
    
    // Remove control characters and excessive whitespace
    return cleaned
      .replace(/[\x00-\x1F\x7F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  // Validate extracted CV text
  static validateCVText(text) {
    if (!text || typeof text !== 'string') {
      throw new ValidationError('Invalid CV text content');
    }
    
    if (text.length < 100) {
      throw new ValidationError('CV content too short for analysis');
    }
    
    if (text.length > 50000) {
      throw new ValidationError('CV content too long for analysis');
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:text\/html/i,
      /vbscript:/i
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(text)) {
        throw new SecurityError('CV contains suspicious content');
      }
    }
    
    return this.sanitizeString(text);
  }
}
```

### SQL Injection Prevention

```javascript
class DatabaseSecurity {
  
  // Parameterized queries with Mongoose
  static async findAnalysisByUser(userId, analysisId) {
    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId) || 
        !mongoose.Types.ObjectId.isValid(analysisId)) {
      throw new ValidationError('Invalid ID format');
    }
    
    // Use Mongoose built-in protection
    return CVAnalysis.findOne({
      _id: analysisId,
      userId: userId
    });
  }
  
  // Prevent NoSQL injection
  static sanitizeQuery(query) {
    if (typeof query !== 'object' || query === null) {
      return query;
    }
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(query)) {
      // Remove potential injection operators
      if (key.startsWith('$') || key.includes('.')) {
        continue;
      }
      
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeQuery(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
}
```

## Authentication & Authorization

### JWT Security

```javascript
class AuthSecurity {
  
  // Enhanced JWT validation
  static async validateJWT(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'],
        maxAge: '24h',
        issuer: 'jobportal-api',
        audience: 'jobportal-users'
      });
      
      // Additional token validation
      if (!decoded.userId || !decoded.type) {
        throw new AuthError('Invalid token structure');
      }
      
      // Check token blacklist (Redis-based in production)
      if (await this.isTokenBlacklisted(token)) {
        throw new AuthError('Token has been revoked');
      }
      
      return decoded;
    } catch (error) {
      throw new AuthError('Invalid or expired token');
    }
  }
  
  // User isolation enforcement
  static enforceUserIsolation(requestUserId, resourceUserId) {
    if (requestUserId.toString() !== resourceUserId.toString()) {
      throw new AuthorizationError('Access denied to resource');
    }
  }
  
  // Rate limiting per user
  static async checkUserRateLimit(userId, operation) {
    const key = `rate_limit:${userId}:${operation}`;
    const current = await redis.get(key);
    
    const limits = {
      cv_upload: { max: 5, window: 300 },    // 5 uploads per 5 minutes
      analysis: { max: 10, window: 3600 },   // 10 analyses per hour
      results: { max: 100, window: 3600 }    // 100 result fetches per hour
    };
    
    const limit = limits[operation];
    if (!limit) return true;
    
    if (current >= limit.max) {
      throw new RateLimitError(`Rate limit exceeded for ${operation}`);
    }
    
    await redis.incr(key);
    await redis.expire(key, limit.window);
    
    return true;
  }
}
```

### Session Security

```javascript
// Secure session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  name: 'sessionId',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,                                // Prevent XSS
    maxAge: 1000 * 60 * 60 * 24,                  // 24 hours
    sameSite: 'strict'                            // CSRF protection
  },
  store: new RedisStore({
    client: redisClient,
    prefix: 'sess:',
    ttl: 86400 // 24 hours
  })
}));
```

## Data Protection

### Encryption at Rest

```javascript
class DataEncryption {
  constructor() {
    this.encryptionKey = process.env.DATA_ENCRYPTION_KEY;
    this.algorithm = 'aes-256-gcm';
  }
  
  // Encrypt sensitive fields before database storage
  encryptSensitiveData(data) {
    const sensitiveFields = ['extractedText', 'aiAnalysis'];
    const encrypted = { ...data };
    
    sensitiveFields.forEach(field => {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(JSON.stringify(encrypted[field]));
      }
    });
    
    return encrypted;
  }
  
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.encryptionKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  decrypt(encryptedData) {
    const decipher = crypto.createDecipher(
      this.algorithm, 
      this.encryptionKey, 
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }
}
```

### Data Minimization

```javascript
class DataMinimization {
  
  // Remove sensitive data from responses
  static sanitizeAnalysisResponse(analysis) {
    const sanitized = { ...analysis };
    
    // Remove raw extracted text from responses
    delete sanitized.extractedText;
    
    // Remove OpenAI raw response
    if (sanitized.aiAnalysis?.rawResponse) {
      delete sanitized.aiAnalysis.rawResponse;
    }
    
    // Remove file path information
    delete sanitized.filePath;
    
    return sanitized;
  }
  
  // Automatic data cleanup
  static async cleanupExpiredData() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days retention
    
    const expiredAnalyses = await CVAnalysis.find({
      createdAt: { $lt: cutoffDate }
    });
    
    for (const analysis of expiredAnalyses) {
      // Secure file deletion
      if (analysis.filePath) {
        await secureFileManager.secureDelete(analysis.filePath);
      }
      
      // Remove database record
      await CVAnalysis.findByIdAndDelete(analysis._id);
    }
    
    console.log(`Cleaned up ${expiredAnalyses.length} expired analyses`);
  }
}
```

## API Security

### CORS Configuration

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'https://yourapp.com',
      'https://app.yourapp.com'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
```

### Security Headers

```javascript
import helmet from 'helmet';

// Security headers middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.openai.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Custom security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

### Request Logging & Monitoring

```javascript
class SecurityMonitoring {
  
  // Log suspicious activities
  static logSecurityEvent(type, details, req) {
    const event = {
      timestamp: new Date(),
      type,
      details,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      url: req.originalUrl,
      method: req.method
    };
    
    // In production, send to security monitoring service
    console.warn('Security Event:', event);
    
    // Alert on critical events
    if (['malware_detected', 'injection_attempt', 'brute_force'].includes(type)) {
      this.sendSecurityAlert(event);
    }
  }
  
  // Detect brute force attempts
  static async detectBruteForce(ip, endpoint) {
    const key = `brute_force:${ip}:${endpoint}`;
    const attempts = await redis.get(key) || 0;
    
    if (attempts > 10) {
      await this.blockIP(ip, 3600); // Block for 1 hour
      this.logSecurityEvent('brute_force', { ip, endpoint }, req);
      throw new SecurityError('IP blocked due to suspicious activity');
    }
    
    await redis.incr(key);
    await redis.expire(key, 300); // 5 minute window
  }
  
  // IP blocking
  static async blockIP(ip, duration) {
    await redis.setex(`blocked_ip:${ip}`, duration, '1');
  }
  
  static async isIPBlocked(ip) {
    return await redis.exists(`blocked_ip:${ip}`);
  }
}
```

## Third-Party Security

### OpenAI API Security

```javascript
class OpenAISecurityManager {
  
  // Sanitize data before sending to OpenAI
  static sanitizeForAI(text) {
    // Remove sensitive patterns
    const sensitivePatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g,           // SSN
      /\b\d{16}\b/g,                      // Credit card
      /\b[\w.-]+@[\w.-]+\.\w+\b/g,        // Email addresses
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,   // Phone numbers
      /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g // IP addresses
    ];
    
    let sanitized = text;
    sensitivePatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });
    
    return sanitized;
  }
  
  // Validate OpenAI responses
  static validateAIResponse(response) {
    // Check for potential data leakage in response
    const suspiciousPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/,           // SSN
      /\b\d{16}\b/,                      // Credit card
      /password/i,
      /secret/i,
      /token/i
    ];
    
    const content = JSON.stringify(response);
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        throw new SecurityError('AI response contains sensitive data');
      }
    }
    
    return response;
  }
  
  // Secure API key management
  static validateAPIKey() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new ConfigError('OpenAI API key not configured');
    }
    
    if (!apiKey.startsWith('sk-')) {
      throw new ConfigError('Invalid OpenAI API key format');
    }
    
    // In production, validate key with OpenAI
    return true;
  }
}
```

## Compliance & Privacy

### GDPR Compliance

```javascript
class GDPRCompliance {
  
  // Data subject rights implementation
  static async exportUserData(userId) {
    const userData = await CVAnalysis.find({ userId })
      .select('-extractedText -aiAnalysis.rawResponse')
      .lean();
    
    return {
      userId,
      exportDate: new Date(),
      data: userData,
      note: 'Raw CV content excluded for privacy'
    };
  }
  
  static async deleteUserData(userId) {
    const analyses = await CVAnalysis.find({ userId });
    
    // Secure file deletion
    for (const analysis of analyses) {
      if (analysis.filePath) {
        await secureFileManager.secureDelete(analysis.filePath);
      }
    }
    
    // Database deletion
    await CVAnalysis.deleteMany({ userId });
    
    // Log deletion for audit
    console.log(`GDPR deletion completed for user ${userId}`);
  }
  
  // Consent management
  static async recordConsent(userId, consentType, granted) {
    await UserConsent.create({
      userId,
      consentType,
      granted,
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
  }
}
```

### Audit Logging

```javascript
class AuditLogger {
  
  static async logDataAccess(userId, resource, action, details) {
    const auditLog = {
      timestamp: new Date(),
      userId,
      resource,
      action,
      details,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    };
    
    await AuditLog.create(auditLog);
  }
  
  static async logSecurityIncident(type, severity, details) {
    const incident = {
      timestamp: new Date(),
      type,
      severity,
      details,
      resolved: false
    };
    
    await SecurityIncident.create(incident);
    
    // Alert on high severity incidents
    if (severity === 'high' || severity === 'critical') {
      await this.sendSecurityAlert(incident);
    }
  }
}
```

## Security Testing

### Automated Security Tests

```javascript
describe('CV Analyzer Security Tests', () => {
  
  test('should reject malicious file uploads', async () => {
    const maliciousFile = {
      originalname: 'malicious.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      path: '/tmp/malicious.pdf'
    };
    
    // Test with malicious PDF content
    await expect(fileSecurityScanner.validatePDFStructure(maliciousFile.path))
      .rejects.toThrow('PDF contains potentially malicious content');
  });
  
  test('should sanitize input data', () => {
    const maliciousInput = '<script>alert("xss")</script>Computer Science';
    const sanitized = InputValidator.sanitizeString(maliciousInput);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('Computer Science');
  });
  
  test('should enforce user isolation', async () => {
    const user1Analysis = await CVAnalysis.create({
      userId: 'user1',
      /* ... other fields ... */
    });
    
    // User 2 trying to access User 1's analysis
    await expect(
      CVAnalysis.findOne({ _id: user1Analysis._id, userId: 'user2' })
    ).resolves.toBeNull();
  });
  
  test('should handle rate limiting', async () => {
    const userId = 'test-user';
    
    // Exceed rate limit
    for (let i = 0; i < 6; i++) {
      if (i < 5) {
        await expect(AuthSecurity.checkUserRateLimit(userId, 'cv_upload'))
          .resolves.toBe(true);
      } else {
        await expect(AuthSecurity.checkUserRateLimit(userId, 'cv_upload'))
          .rejects.toThrow('Rate limit exceeded');
      }
    }
  });
});
```

## Security Monitoring & Alerting

### Real-time Monitoring

```javascript
class SecurityMonitor {
  
  constructor() {
    this.setupMonitoring();
  }
  
  setupMonitoring() {
    // Monitor failed authentication attempts
    EventEmitter.on('auth_failed', (data) => {
      this.handleAuthFailure(data);
    });
    
    // Monitor suspicious file uploads
    EventEmitter.on('suspicious_upload', (data) => {
      this.handleSuspiciousUpload(data);
    });
    
    // Monitor OpenAI API anomalies
    EventEmitter.on('ai_anomaly', (data) => {
      this.handleAIAnomaly(data);
    });
  }
  
  async handleAuthFailure(data) {
    const { ip, userAgent, timestamp } = data;
    
    // Track failed attempts
    const key = `auth_failures:${ip}`;
    const failures = await redis.incr(key);
    await redis.expire(key, 300); // 5 minutes
    
    if (failures > 5) {
      await this.blockIP(ip, 3600);
      await this.sendAlert('Potential brute force attack', data);
    }
  }
  
  async sendAlert(title, details) {
    // In production, integrate with alerting service
    console.error(`🚨 Security Alert: ${title}`, details);
    
    // Send to monitoring service (e.g., Slack, PagerDuty)
    // await alertingService.send({ title, details, severity: 'high' });
  }
}
```

## Production Security Checklist

### Deployment Security

- [ ] All environment variables secured
- [ ] HTTPS enforced
- [ ] Database connections encrypted
- [ ] File permissions properly set
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] Logging and monitoring active
- [ ] Regular security updates scheduled
- [ ] Backup encryption verified
- [ ] Incident response plan documented

### Ongoing Security Maintenance

- [ ] Regular security audits
- [ ] Dependency vulnerability scanning
- [ ] Penetration testing
- [ ] Security awareness training
- [ ] Incident response drills
- [ ] Access reviews
- [ ] Key rotation procedures
- [ ] Compliance audits

## Emergency Response

### Security Incident Response

```javascript
class IncidentResponse {
  
  static async handleSecurityBreach(incidentType, details) {
    // Immediate containment
    await this.containIncident(incidentType, details);
    
    // Notification
    await this.notifyStakeholders(incidentType, details);
    
    // Investigation
    await this.startInvestigation(incidentType, details);
    
    // Recovery
    await this.initiateRecovery(incidentType, details);
  }
  
  static async containIncident(type, details) {
    switch (type) {
      case 'data_breach':
        await this.isolateAffectedSystems();
        await this.disableCompromisedAccounts();
        break;
      case 'malware_detected':
        await this.quarantineFiles();
        await this.scanAllUploads();
        break;
      case 'ddos_attack':
        await this.enableDDoSProtection();
        await this.blockAttackingIPs();
        break;
    }
  }
}
```

This comprehensive security framework ensures the CV Analyzer module maintains the highest security standards while providing a seamless user experience.
