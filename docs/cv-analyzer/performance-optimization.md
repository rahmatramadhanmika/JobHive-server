# CV Analyzer Performance Optimization Guide

This document outlines performance optimization strategies, monitoring techniques, and best practices for the CV Analyzer module to ensure optimal performance under production loads.

## Performance Architecture

### System Performance Targets

- **Upload Response Time**: < 500ms
- **Analysis Completion**: < 3 minutes (95th percentile)
- **Results Retrieval**: < 200ms
- **Concurrent Users**: 1000+ simultaneous analyses
- **Throughput**: 10,000+ analyses per day
- **Availability**: 99.9% uptime

### Performance Stack

```
┌─────────────────┐
│   Load Balancer │ ← NGINX/HAProxy
├─────────────────┤
│ Application     │ ← Node.js Cluster
│ Servers (3+)    │ ← PM2 Process Manager
├─────────────────┤
│ Caching Layer   │ ← Redis Cluster
├─────────────────┤
│ Queue System    │ ← Bull/BullMQ
├─────────────────┤
│ Database        │ ← MongoDB Replica Set
├─────────────────┤
│ File Storage    │ ← S3/MinIO
└─────────────────┘
```

## Application Performance

### Node.js Optimization

#### Cluster Configuration

```javascript
// cluster.js
import cluster from 'cluster';
import os from 'os';
import app from './app.js';

const numWorkers = process.env.NODE_ENV === 'production' 
  ? os.cpus().length 
  : 1;

if (cluster.isPrimary) {
  console.log(`Master ${process.pid} is running`);
  
  // Fork workers
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // Restart worker
  });
} else {
  const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`Worker ${process.pid} started on port ${server.address().port}`);
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    server.close(() => {
      process.exit(0);
    });
  });
}
```

#### Memory Management

```javascript
// memory-optimizer.js
class MemoryOptimizer {
  
  constructor() {
    this.setupMemoryMonitoring();
    this.setupGarbageCollection();
  }
  
  setupMemoryMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      const threshold = 1024 * 1024 * 1024; // 1GB
      
      if (usage.heapUsed > threshold) {
        console.warn('High memory usage detected:', {
          heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
          external: Math.round(usage.external / 1024 / 1024) + 'MB'
        });
        
        // Trigger garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }, 30000); // Check every 30 seconds
  }
  
  setupGarbageCollection() {
    // Monitor GC events
    if (process.env.NODE_ENV === 'production') {
      const v8 = require('v8');
      
      setInterval(() => {
        const stats = v8.getHeapStatistics();
        
        if (stats.used_heap_size / stats.heap_size_limit > 0.8) {
          console.warn('Heap usage critical:', {
            usedPercent: Math.round((stats.used_heap_size / stats.heap_size_limit) * 100),
            mallocedMemory: Math.round(stats.malloced_memory / 1024 / 1024) + 'MB'
          });
        }
      }, 60000); // Check every minute
    }
  }
  
  // Clean up large objects
  cleanupLargeObjects() {
    // Force cleanup of cached data
    if (global.analysisCache) {
      global.analysisCache.clear();
    }
    
    // Clean up temporary files
    this.cleanupTempFiles();
  }
}
```

### Async Processing Optimization

#### Queue Management

```javascript
// queue-manager.js
import Bull from 'bull';
import Redis from 'ioredis';

class CVAnalysisQueueManager {
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true
    });
    
    this.analysisQueue = new Bull('cv-analysis', {
      redis: this.redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });
    
    this.setupProcessors();
    this.setupMonitoring();
  }
  
  setupProcessors() {
    // Priority-based processing
    this.analysisQueue.process('high-priority', 5, this.processHighPriorityAnalysis);
    this.analysisQueue.process('normal-priority', 10, this.processNormalAnalysis);
    this.analysisQueue.process('batch-analysis', 2, this.processBatchAnalysis);
  }
  
  async addAnalysisJob(analysisData, priority = 'normal') {
    const jobOptions = {
      priority: priority === 'high' ? 10 : 5,
      delay: priority === 'batch' ? 60000 : 0, // Batch jobs delayed 1 minute
      jobId: analysisData.analysisId
    };
    
    return this.analysisQueue.add(`${priority}-priority`, analysisData, jobOptions);
  }
  
  async processNormalAnalysis(job) {
    const { analysisId, cvText, jobData } = job.data;
    
    try {
      // Update progress
      job.progress(10);
      
      // Perform analysis
      const startTime = Date.now();
      const analysis = await this.performAnalysis(cvText, jobData);
      
      job.progress(90);
      
      // Save results
      await this.saveAnalysisResults(analysisId, analysis);
      
      job.progress(100);
      
      // Track performance
      const duration = Date.now() - startTime;
      await this.trackPerformanceMetrics(analysisId, duration);
      
      return { success: true, analysisId, duration };
    } catch (error) {
      await this.handleAnalysisError(analysisId, error);
      throw error;
    }
  }
  
  setupMonitoring() {
    // Queue health monitoring
    setInterval(async () => {
      const waiting = await this.analysisQueue.waiting();
      const active = await this.analysisQueue.active();
      const completed = await this.analysisQueue.completed();
      const failed = await this.analysisQueue.failed();
      
      const queueHealth = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        timestamp: new Date()
      };
      
      // Alert if queue is backing up
      if (waiting.length > 100) {
        await this.sendQueueAlert('High queue backlog', queueHealth);
      }
      
      // Log queue statistics
      console.log('Queue Health:', queueHealth);
    }, 30000);
  }
}
```

### Database Performance

#### MongoDB Optimization

```javascript
// database-optimizer.js
class DatabaseOptimizer {
  
  static async optimizeIndexes() {
    // CV Analysis indexes
    await CVAnalysis.collection.createIndex(
      { userId: 1, createdAt: -1 },
      { background: true }
    );
    
    await CVAnalysis.collection.createIndex(
      { status: 1, createdAt: -1 },
      { background: true }
    );
    
    await CVAnalysis.collection.createIndex(
      { 'jobData.experienceLevel': 1, 'jobData.major': 1 },
      { background: true }
    );
    
    // Compound index for analytics queries
    await CVAnalysis.collection.createIndex(
      { userId: 1, status: 1, createdAt: -1 },
      { background: true }
    );
    
    // TTL index for automatic cleanup
    await CVAnalysis.collection.createIndex(
      { createdAt: 1 },
      { 
        expireAfterSeconds: 7776000, // 90 days
        background: true 
      }
    );
  }
  
  static async optimizeQueries() {
    // Use lean queries for read-only operations
    CVAnalysis.find = function(filter, projection) {
      return mongoose.Query.prototype.find.call(this, filter, projection).lean();
    };
    
    // Implement query result caching
    CVAnalysis.findWithCache = async function(filter, cacheKey, ttl = 300) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      
      const result = await this.find(filter).lean();
      await redis.setex(cacheKey, ttl, JSON.stringify(result));
      
      return result;
    };
  }
  
  static async setupConnectionOptimization() {
    mongoose.set('bufferCommands', false);
    mongoose.set('bufferMaxEntries', 0);
    
    // Connection pool optimization
    const options = {
      maxPoolSize: 50,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4
      bufferCommands: false,
      bufferMaxEntries: 0
    };
    
    return mongoose.connect(process.env.MONGODB_URI, options);
  }
}
```

### Caching Strategy

#### Multi-Layer Caching

```javascript
// cache-manager.js
import Redis from 'ioredis';
import NodeCache from 'node-cache';

class CacheManager {
  
  constructor() {
    // L1 Cache: In-memory (fast, small)
    this.memoryCache = new NodeCache({
      stdTTL: 300,           // 5 minutes
      maxKeys: 1000,         // Limit memory usage
      useClones: false       // Better performance
    });
    
    // L2 Cache: Redis (persistent, distributed)
    this.redisCache = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      lazyConnect: true,
      maxRetriesPerRequest: 3
    });
    
    this.setupCacheStrategy();
  }
  
  async get(key) {
    // Try L1 cache first
    let value = this.memoryCache.get(key);
    if (value !== undefined) {
      return value;
    }
    
    // Try L2 cache
    const redisValue = await this.redisCache.get(key);
    if (redisValue) {
      value = JSON.parse(redisValue);
      // Populate L1 cache
      this.memoryCache.set(key, value, 300);
      return value;
    }
    
    return null;
  }
  
  async set(key, value, ttl = 3600) {
    // Set in both caches
    this.memoryCache.set(key, value, Math.min(ttl, 300));
    await this.redisCache.setex(key, ttl, JSON.stringify(value));
  }
  
  async invalidate(pattern) {
    // Clear from memory cache
    this.memoryCache.flushAll();
    
    // Clear from Redis
    const keys = await this.redisCache.keys(pattern);
    if (keys.length > 0) {
      await this.redisCache.del(...keys);
    }
  }
  
  // Cache frequently accessed data
  async cacheAnalysisResults(analysisId, results) {
    const key = `analysis:${analysisId}`;
    await this.set(key, results, 3600); // 1 hour
  }
  
  async cacheUserHistory(userId, history) {
    const key = `history:${userId}`;
    await this.set(key, history, 600); // 10 minutes
  }
  
  async cacheAnalytics(userId, timeframe, analytics) {
    const key = `analytics:${userId}:${timeframe}`;
    await this.set(key, analytics, 1800); // 30 minutes
  }
}
```

### File Processing Optimization

#### Parallel Processing

```javascript
// file-processor.js
import cluster from 'cluster';
import { Worker } from 'worker_threads';

class OptimizedFileProcessor {
  
  constructor() {
    this.workerPool = [];
    this.maxWorkers = Math.min(os.cpus().length, 4);
    this.setupWorkerPool();
  }
  
  setupWorkerPool() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker('./workers/pdf-worker.js');
      worker.on('error', this.handleWorkerError);
      this.workerPool.push(worker);
    }
  }
  
  async processFileParallel(filePath) {
    return new Promise((resolve, reject) => {
      const worker = this.getAvailableWorker();
      
      worker.postMessage({ type: 'process', filePath });
      
      worker.once('message', (result) => {
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result.data);
        }
      });
      
      // Timeout handling
      setTimeout(() => {
        reject(new Error('PDF processing timeout'));
      }, 30000);
    });
  }
  
  getAvailableWorker() {
    // Simple round-robin selection
    return this.workerPool[Math.floor(Math.random() * this.workerPool.length)];
  }
}

// workers/pdf-worker.js
const { parentPort } = require('worker_threads');
const PDFParserService = require('../services/pdf-parser.service.js');

const parser = new PDFParserService();

parentPort.on('message', async (message) => {
  try {
    if (message.type === 'process') {
      const extractedText = await parser.extractText(message.filePath);
      parentPort.postMessage({ data: extractedText });
    }
  } catch (error) {
    parentPort.postMessage({ error: error.message });
  }
});
```

### API Performance

#### Response Optimization

```javascript
// response-optimizer.js
class ResponseOptimizer {
  
  // Compress responses
  static setupCompression(app) {
    const compression = require('compression');
    
    app.use(compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));
  }
  
  // HTTP/2 Server Push
  static setupHTTP2Push(app) {
    app.use((req, res, next) => {
      if (res.push && req.accepts('text/html')) {
        // Push critical resources
        res.push('/api/v1/cv-analyzer/health', {
          method: 'GET',
          request: { accept: 'application/json' }
        });
      }
      next();
    });
  }
  
  // Response streaming for large datasets
  static streamResponse(res, data) {
    res.setHeader('Content-Type', 'application/json');
    res.write('{"success":true,"data":[');
    
    for (let i = 0; i < data.length; i++) {
      if (i > 0) res.write(',');
      res.write(JSON.stringify(data[i]));
    }
    
    res.write(']}');
    res.end();
  }
}
```

## Monitoring & Analytics

### Performance Monitoring

```javascript
// performance-monitor.js
import prometheus from 'prom-client';

class PerformanceMonitor {
  
  constructor() {
    this.setupMetrics();
    this.setupCustomMetrics();
  }
  
  setupMetrics() {
    // Default Node.js metrics
    prometheus.collectDefaultMetrics({
      timeout: 5000,
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5]
    });
  }
  
  setupCustomMetrics() {
    // CV Analysis metrics
    this.analysisCounter = new prometheus.Counter({
      name: 'cv_analysis_total',
      help: 'Total number of CV analyses',
      labelNames: ['status', 'experience_level']
    });
    
    this.analysisHistogram = new prometheus.Histogram({
      name: 'cv_analysis_duration_seconds',
      help: 'CV analysis duration',
      buckets: [1, 5, 10, 30, 60, 120, 300]
    });
    
    this.queueGauge = new prometheus.Gauge({
      name: 'cv_analysis_queue_size',
      help: 'Number of analyses in queue'
    });
    
    this.openaiCounter = new prometheus.Counter({
      name: 'openai_requests_total',
      help: 'Total OpenAI API requests',
      labelNames: ['status', 'model']
    });
    
    this.openaiHistogram = new prometheus.Histogram({
      name: 'openai_request_duration_seconds',
      help: 'OpenAI API request duration',
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
    });
  }
  
  // Track analysis performance
  trackAnalysis(startTime, status, experienceLevel) {
    const duration = (Date.now() - startTime) / 1000;
    
    this.analysisCounter.labels(status, experienceLevel).inc();
    this.analysisHistogram.observe(duration);
  }
  
  // Track OpenAI performance
  trackOpenAI(startTime, status, model) {
    const duration = (Date.now() - startTime) / 1000;
    
    this.openaiCounter.labels(status, model).inc();
    this.openaiHistogram.observe(duration);
  }
  
  // Export metrics endpoint
  getMetrics() {
    return prometheus.register.metrics();
  }
}
```

### Application Performance Monitoring (APM)

```javascript
// apm-setup.js
import apm from 'elastic-apm-node';

// Initialize APM
const apmAgent = apm.start({
  serviceName: 'cv-analyzer-api',
  serverUrl: process.env.ELASTIC_APM_SERVER_URL,
  secretToken: process.env.ELASTIC_APM_SECRET_TOKEN,
  environment: process.env.NODE_ENV,
  captureBody: 'errors',
  errorOnAbortedRequests: true,
  captureErrorLogStackTraces: 'always'
});

class APMTracker {
  
  static trackAnalysisTransaction(analysisId, fn) {
    return apm.startTransaction('cv-analysis', 'process', () => {
      apm.setTransactionName(`CV Analysis ${analysisId}`);
      
      const span = apm.startSpan('analysis-processing');
      
      return fn().finally(() => {
        if (span) span.end();
      });
    });
  }
  
  static trackOpenAISpan(fn) {
    const span = apm.startSpan('openai-request', 'external');
    span.setLabel('service', 'openai');
    
    return fn().finally(() => {
      if (span) span.end();
    });
  }
  
  static trackDatabaseSpan(operation, fn) {
    const span = apm.startSpan(`db-${operation}`, 'db');
    span.setLabel('db.type', 'mongodb');
    
    return fn().finally(() => {
      if (span) span.end();
    });
  }
}
```

## Load Testing

### Load Testing Setup

```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const analysisErrors = new Counter('analysis_errors');
const analysisSuccessRate = new Rate('analysis_success_rate');
const analysisTime = new Trend('analysis_duration');

export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 200 },   // Ramp to 200 users
    { duration: '5m', target: 200 },   // Stay at 200 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% under 500ms
    analysis_success_rate: ['rate>0.9'], // 90% success rate
    analysis_errors: ['count<100'],     // Less than 100 errors
  },
};

const BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'your-test-token';

export default function () {
  // Test analysis upload
  const uploadResponse = http.post(
    `${BASE_URL}/api/v1/cv-analyzer/upload`,
    {
      cv: http.file(generateTestPDF(), 'test.pdf'),
      experienceLevel: 'mid',
      major: 'Computer Science'
    },
    {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    }
  );
  
  const uploadSuccess = check(uploadResponse, {
    'upload status is 202': (r) => r.status === 202,
    'response has analysisId': (r) => r.json('data.analysisId') !== '',
  });
  
  analysisSuccessRate.add(uploadSuccess);
  
  if (!uploadSuccess) {
    analysisErrors.add(1);
    return;
  }
  
  const analysisId = uploadResponse.json('data.analysisId');
  
  // Poll for results
  let attempts = 0;
  let resultResponse;
  
  do {
    sleep(5); // Wait 5 seconds
    attempts++;
    
    resultResponse = http.get(
      `${BASE_URL}/api/v1/cv-analyzer/results/${analysisId}`,
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      }
    );
    
  } while (
    resultResponse.json('data.status') === 'processing' && 
    attempts < 36 // Max 3 minutes
  );
  
  const resultSuccess = check(resultResponse, {
    'result status is 200': (r) => r.status === 200,
    'analysis completed': (r) => r.json('data.status') === 'completed',
    'has overall score': (r) => r.json('data.aiAnalysis.overallScore') > 0,
  });
  
  analysisSuccessRate.add(resultSuccess);
  
  if (resultSuccess) {
    analysisTime.add(attempts * 5); // Track completion time
  } else {
    analysisErrors.add(1);
  }
  
  sleep(1);
}

function generateTestPDF() {
  // Generate a minimal test PDF content
  return new ArrayBuffer(1024); // Simplified for example
}
```

## Production Optimization

### Docker Optimization

```dockerfile
# Dockerfile.optimized
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy application files
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Optimize Node.js settings
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024"

USER nodejs

EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
```

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'cv-analyzer-api',
    script: './index.js',
    instances: 'max',
    exec_mode: 'cluster',
    
    // Performance settings
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    
    // Environment
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Logging
    log_file: './logs/app.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Monitoring
    monitoring: true,
    pmx: true,
    
    // Auto-restart settings
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Resource limits
    max_cpu_usage: 80,
    max_memory_restart: '1G'
  }]
};
```

## Performance Best Practices

### 1. Code Optimization
- Use async/await properly to avoid blocking
- Implement proper error handling to prevent crashes
- Use streams for large file processing
- Minimize object creation in hot paths
- Use appropriate data structures (Map vs Object)

### 2. Database Optimization
- Create proper indexes for frequent queries
- Use connection pooling
- Implement query result caching
- Use lean queries for read-only operations
- Implement database connection retry logic

### 3. Caching Strategy
- Cache frequently accessed data
- Use appropriate TTL values
- Implement cache invalidation strategies
- Use compression for cached data
- Monitor cache hit rates

### 4. File Processing
- Process files asynchronously
- Implement file size limits
- Use streaming for large files
- Clean up temporary files promptly
- Implement file processing queues

### 5. API Optimization
- Use HTTP/2 where possible
- Implement response compression
- Use appropriate HTTP status codes
- Implement proper pagination
- Use efficient JSON serialization

### 6. Monitoring & Alerting
- Monitor key performance metrics
- Set up alerts for performance degradation
- Track error rates and response times
- Monitor resource usage
- Implement health checks

This comprehensive performance optimization guide ensures the CV Analyzer module can handle production workloads efficiently while maintaining high availability and user experience.
