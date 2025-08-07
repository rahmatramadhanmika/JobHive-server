# CV Analyzer Deployment Guide

This comprehensive guide covers deploying the CV Analyzer module to production environments, including setup, configuration, monitoring, and maintenance procedures.

## Deployment Overview

### Production Architecture

```
Internet
    |
┌───▼──────────────────┐
│   Load Balancer      │ ← NGINX/ALB
│   (SSL Termination)  │
└───┬──────────────────┘
    |
┌───▼──────────────────┐
│   Application Tier   │ ← Node.js Cluster
│   (Auto Scaling)     │ ← Docker/K8s
└───┬──────────────────┘
    |
┌───▼──────────────────┐
│   Caching Layer      │ ← Redis Cluster
└───┬──────────────────┘
    |
┌───▼──────────────────┐
│   Message Queue      │ ← Bull/RabbitMQ
└───┬──────────────────┘
    |
┌───▼──────────────────┐
│   Database Layer     │ ← MongoDB Replica Set
└───┬──────────────────┘
    |
┌───▼──────────────────┐
│   File Storage       │ ← AWS S3/MinIO
└──────────────────────┘
```

## Prerequisites

### System Requirements

**Minimum Requirements:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 50GB SSD
- Network: 100Mbps

**Recommended Production:**
- CPU: 8+ cores
- RAM: 16GB+
- Storage: 200GB+ SSD
- Network: 1Gbps

### Software Dependencies

```bash
# Node.js (v18 or higher)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# MongoDB (v6.0 or higher)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Redis (v7.0 or higher)
sudo apt update
sudo apt install redis-server

# PM2 (Process Manager)
npm install -g pm2

# NGINX (Load Balancer)
sudo apt update
sudo apt install nginx
```

## Environment Configuration

### Production Environment Variables

```bash
# .env.production
NODE_ENV=production
PORT=3000

# Database Configuration
MONGODB_URI=mongodb://mongo1:27017,mongo2:27017,mongo3:27017/jobportal?replicaSet=rs0
MONGODB_OPTIONS=authSource=admin&ssl=true&retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_EXPIRE=24h

# Redis Configuration
REDIS_HOST=redis-cluster.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.3
OPENAI_TIMEOUT=120000

# File Storage Configuration
FILE_STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=cv-analyzer-files
S3_BUCKET_REGION=us-east-1

# Security Configuration
FILE_ENCRYPTION_KEY=your-file-encryption-key-256-bit
SESSION_SECRET=your-session-secret-here
CORS_ORIGIN=https://yourapp.com,https://app.yourapp.com

# Monitoring Configuration
ELASTIC_APM_SERVER_URL=https://your-apm-server.com
ELASTIC_APM_SECRET_TOKEN=your-apm-token
PROMETHEUS_ENDPOINT=/metrics

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json
SYSLOG_HOST=your-syslog-server.com
SYSLOG_PORT=514
```

### Security Configuration

```bash
# security-config.sh
#!/bin/bash

# Create secure directories
sudo mkdir -p /opt/cv-analyzer/{logs,uploads,temp}
sudo chown -R nodejs:nodejs /opt/cv-analyzer
sudo chmod 750 /opt/cv-analyzer

# Set file permissions
sudo chmod 600 /opt/cv-analyzer/.env
sudo chmod 755 /opt/cv-analyzer/uploads
sudo chmod 700 /opt/cv-analyzer/logs

# Configure firewall
sudo ufw enable
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 3000/tcp    # App (internal)
sudo ufw deny 27017/tcp    # MongoDB (block external)

# Set up fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Docker Deployment

### Production Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --no-audit && \
    npm cache clean --force

# Production stage
FROM node:18-alpine

# Install security updates and dumb-init
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init tini && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy application files
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs . .

# Create necessary directories
RUN mkdir -p uploads/cv-analyzer logs && \
    chown -R nodejs:nodejs uploads logs

# Set environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=1024 --enable-source-maps"

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node healthcheck.js

# Use tini for proper signal handling
ENTRYPOINT ["tini", "--"]
CMD ["node", "index.js"]
```

### Docker Compose Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  cv-analyzer-api:
    build:
      context: .
      dockerfile: Dockerfile
    deploy:
      replicas: 3
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - REDIS_HOST=redis
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - cv_uploads:/app/uploads
      - cv_logs:/app/logs
    networks:
      - app-network
    depends_on:
      - mongodb
      - redis
    healthcheck:
      test: ["CMD", "node", "healthcheck.js"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    networks:
      - app-network
    depends_on:
      - cv-analyzer-api

  mongodb:
    image: mongo:6.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    volumes:
      - mongodb_data:/data/db
      - ./mongo-init:/docker-entrypoint-initdb.d:ro
    networks:
      - app-network
    command: mongod --replSet rs0 --bind_ip_all

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - app-network

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    networks:
      - app-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
    networks:
      - app-network

volumes:
  cv_uploads:
  cv_logs:
  mongodb_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  app-network:
    driver: bridge
```

## Kubernetes Deployment

### Kubernetes Manifests

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cv-analyzer

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cv-analyzer-config
  namespace: cv-analyzer
data:
  NODE_ENV: "production"
  REDIS_HOST: "redis-service"
  MONGODB_URI: "mongodb://mongodb-service:27017/jobportal"

---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: cv-analyzer-secrets
  namespace: cv-analyzer
type: Opaque
stringData:
  JWT_SECRET: "your-jwt-secret"
  OPENAI_API_KEY: "your-openai-key"
  MONGODB_PASSWORD: "your-db-password"

---
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cv-analyzer-api
  namespace: cv-analyzer
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cv-analyzer-api
  template:
    metadata:
      labels:
        app: cv-analyzer-api
    spec:
      containers:
      - name: cv-analyzer-api
        image: your-registry/cv-analyzer:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: cv-analyzer-config
        - secretRef:
            name: cv-analyzer-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/v1/cv-analyzer/health
            port: 3000
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/v1/cv-analyzer/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        volumeMounts:
        - name: uploads
          mountPath: /app/uploads
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: uploads
        persistentVolumeClaim:
          claimName: cv-uploads-pvc
      - name: logs
        persistentVolumeClaim:
          claimName: cv-logs-pvc

---
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: cv-analyzer-service
  namespace: cv-analyzer
spec:
  selector:
    app: cv-analyzer-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cv-analyzer-ingress
  namespace: cv-analyzer
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.yourapp.com
    secretName: cv-analyzer-tls
  rules:
  - host: api.yourapp.com
    http:
      paths:
      - path: /api/v1/cv-analyzer
        pathType: Prefix
        backend:
          service:
            name: cv-analyzer-service
            port:
              number: 80
```

### Horizontal Pod Autoscaler

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cv-analyzer-hpa
  namespace: cv-analyzer
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cv-analyzer-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Load Balancer Configuration

### NGINX Configuration

```nginx
# nginx/nginx.conf
user nginx;
worker_processes auto;
worker_rlimit_nofile 65535;

error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for" '
                   'rt=$request_time uct="$upstream_connect_time" '
                   'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # Performance optimizations
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=1r/s;

    # Upstream configuration
    upstream cv_analyzer_backend {
        least_conn;
        server cv-analyzer-api-1:3000 max_fails=3 fail_timeout=30s;
        server cv-analyzer-api-2:3000 max_fails=3 fail_timeout=30s;
        server cv-analyzer-api-3:3000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    server {
        listen 80;
        server_name api.yourapp.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name api.yourapp.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 1d;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

        # CV Analyzer API
        location /api/v1/cv-analyzer {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://cv_analyzer_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Upload endpoint with special rate limiting
        location /api/v1/cv-analyzer/upload {
            limit_req zone=upload burst=5 nodelay;
            
            proxy_pass http://cv_analyzer_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Extended timeouts for file upload
            proxy_connect_timeout 60s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
            
            # Large file support
            client_max_body_size 10M;
        }

        # Health check
        location /health {
            access_log off;
            proxy_pass http://cv_analyzer_backend/api/v1/cv-analyzer/health;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
        }
    }
}
```

## Database Setup

### MongoDB Replica Set

```javascript
// mongodb-init.js
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb-1:27017" },
    { _id: 1, host: "mongodb-2:27017" },
    { _id: 2, host: "mongodb-3:27017" }
  ]
});

// Create database and users
use admin;
db.createUser({
  user: "cvAnalyzerAdmin",
  pwd: "your-secure-password",
  roles: [
    { role: "readWrite", db: "jobportal" },
    { role: "dbAdmin", db: "jobportal" }
  ]
});

use jobportal;

// Create indexes for CV Analyzer
db.cvanalyses.createIndex({ userId: 1, createdAt: -1 });
db.cvanalyses.createIndex({ status: 1, createdAt: -1 });
db.cvanalyses.createIndex({ "jobData.experienceLevel": 1, "jobData.major": 1 });
db.cvanalyses.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL
```

### Redis Configuration

```bash
# redis.conf
bind 0.0.0.0
port 6379
requirepass your-redis-password

# Memory optimizations
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Security
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command DEBUG ""

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

## Monitoring Setup

### Prometheus Configuration

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "cv_analyzer_rules.yml"

scrape_configs:
  - job_name: 'cv-analyzer-api'
    static_configs:
      - targets: ['cv-analyzer-service:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-exporter:9113']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "CV Analyzer Monitoring",
    "panels": [
      {
        "title": "Analysis Requests per Second",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(cv_analysis_total[5m])",
            "legendFormat": "{{status}}"
          }
        ]
      },
      {
        "title": "Analysis Duration",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, cv_analysis_duration_seconds_bucket)",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.50, cv_analysis_duration_seconds_bucket)",
            "legendFormat": "50th percentile"
          }
        ]
      },
      {
        "title": "Queue Size",
        "type": "singlestat",
        "targets": [
          {
            "expr": "cv_analysis_queue_size",
            "legendFormat": "Queue Size"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(cv_analysis_total{status=\"failed\"}[5m]) / rate(cv_analysis_total[5m]) * 100",
            "legendFormat": "Error Rate %"
          }
        ]
      }
    ]
  }
}
```

## Deployment Scripts

### Deployment Automation

```bash
#!/bin/bash
# deploy.sh

set -e

# Configuration
APP_NAME="cv-analyzer"
REGISTRY="your-registry.com"
VERSION=${1:-latest}
ENVIRONMENT=${2:-production}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Pre-deployment checks
log "Running pre-deployment checks..."

# Check if required tools are installed
command -v docker >/dev/null 2>&1 || error "Docker is required but not installed"
command -v kubectl >/dev/null 2>&1 || error "kubectl is required but not installed"

# Check if cluster is accessible
kubectl cluster-info >/dev/null 2>&1 || error "Cannot connect to Kubernetes cluster"

# Build and push Docker image
log "Building Docker image..."
docker build -t ${REGISTRY}/${APP_NAME}:${VERSION} .

log "Pushing Docker image to registry..."
docker push ${REGISTRY}/${APP_NAME}:${VERSION}

# Update Kubernetes manifests
log "Updating Kubernetes manifests..."
sed -i "s|image: .*|image: ${REGISTRY}/${APP_NAME}:${VERSION}|g" k8s/deployment.yaml

# Apply database migrations
log "Running database migrations..."
kubectl apply -f k8s/migration-job.yaml
kubectl wait --for=condition=complete job/migration-job --timeout=300s

# Deploy to Kubernetes
log "Deploying to Kubernetes..."
kubectl apply -f k8s/

# Wait for deployment to complete
log "Waiting for deployment to complete..."
kubectl rollout status deployment/${APP_NAME}-api -n ${APP_NAME} --timeout=600s

# Run health checks
log "Running health checks..."
HEALTH_URL="https://api.yourapp.com/api/v1/cv-analyzer/health"
for i in {1..30}; do
    if curl -f -s ${HEALTH_URL} > /dev/null; then
        log "Health check passed"
        break
    fi
    
    if [ $i -eq 30 ]; then
        error "Health check failed after 30 attempts"
    fi
    
    warn "Health check attempt $i failed, retrying in 10 seconds..."
    sleep 10
done

# Run smoke tests
log "Running smoke tests..."
npm run test:smoke

log "Deployment completed successfully!"

# Post-deployment notifications
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ CV Analyzer ${VERSION} deployed successfully to ${ENVIRONMENT}\"}" \
        $SLACK_WEBHOOK_URL
fi
```

### Rollback Script

```bash
#!/bin/bash
# rollback.sh

set -e

APP_NAME="cv-analyzer"
PREVIOUS_VERSION=${1:-}

if [ -z "$PREVIOUS_VERSION" ]; then
    echo "Usage: $0 <previous_version>"
    exit 1
fi

log() {
    echo -e "\033[0;32m[$(date '+%Y-%m-%d %H:%M:%S')] $1\033[0m"
}

error() {
    echo -e "\033[0;31m[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1\033[0m"
    exit 1
}

log "Starting rollback to version ${PREVIOUS_VERSION}..."

# Update deployment image
kubectl set image deployment/${APP_NAME}-api ${APP_NAME}-api=your-registry.com/${APP_NAME}:${PREVIOUS_VERSION} -n ${APP_NAME}

# Wait for rollback to complete
log "Waiting for rollback to complete..."
kubectl rollout status deployment/${APP_NAME}-api -n ${APP_NAME} --timeout=300s

# Verify rollback
log "Verifying rollback..."
CURRENT_IMAGE=$(kubectl get deployment ${APP_NAME}-api -n ${APP_NAME} -o jsonpath='{.spec.template.spec.containers[0].image}')

if [[ "$CURRENT_IMAGE" == *"${PREVIOUS_VERSION}"* ]]; then
    log "Rollback completed successfully to version ${PREVIOUS_VERSION}"
else
    error "Rollback verification failed. Current image: ${CURRENT_IMAGE}"
fi

# Send notification
if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"⚠️ CV Analyzer rolled back to ${PREVIOUS_VERSION}\"}" \
        $SLACK_WEBHOOK_URL
fi
```

## Maintenance Procedures

### Regular Maintenance Tasks

```bash
#!/bin/bash
# maintenance.sh

# Database maintenance
log "Running database maintenance..."
kubectl exec -it mongodb-0 -n cv-analyzer -- mongo --eval "
  use jobportal;
  db.runCommand({compact: 'cvanalyses'});
  db.cvanalyses.reIndex();
"

# Clean up old files
log "Cleaning up old files..."
kubectl exec -it deployment/cv-analyzer-api -n cv-analyzer -- node -e "
  const CVAnalysis = require('./models/cvanalysis.model.js');
  const fs = require('fs').promises;
  
  (async () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    const oldAnalyses = await CVAnalysis.find({
      createdAt: { \$lt: cutoffDate }
    }).select('filePath');
    
    for (const analysis of oldAnalyses) {
      try {
        await fs.unlink(analysis.filePath);
        await CVAnalysis.findByIdAndDelete(analysis._id);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
    
    console.log(\`Cleaned up \${oldAnalyses.length} old analyses\`);
  })();
"

# Update SSL certificates
log "Checking SSL certificates..."
kubectl get secrets cv-analyzer-tls -n cv-analyzer -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates

log "Maintenance completed!"
```

## Backup and Recovery

### Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/cv-analyzer"
DATE=$(date +%Y%m%d_%H%M%S)

# MongoDB backup
mongodump --uri "mongodb://user:pass@mongodb-service:27017/jobportal" --out ${BACKUP_DIR}/mongodb_${DATE}

# Redis backup
kubectl exec redis-0 -n cv-analyzer -- redis-cli --rdb /tmp/dump_${DATE}.rdb
kubectl cp cv-analyzer/redis-0:/tmp/dump_${DATE}.rdb ${BACKUP_DIR}/redis_${DATE}.rdb

# File storage backup
aws s3 sync s3://cv-analyzer-files ${BACKUP_DIR}/files_${DATE}/

# Compress and upload
tar -czf ${BACKUP_DIR}/cv_analyzer_backup_${DATE}.tar.gz ${BACKUP_DIR}/*_${DATE}*
aws s3 cp ${BACKUP_DIR}/cv_analyzer_backup_${DATE}.tar.gz s3://cv-analyzer-backups/

# Cleanup local files older than 7 days
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +7 -delete

log "Backup completed: cv_analyzer_backup_${DATE}.tar.gz"
```

This comprehensive deployment guide provides everything needed to deploy the CV Analyzer module to production environments with proper monitoring, security, and maintenance procedures.
