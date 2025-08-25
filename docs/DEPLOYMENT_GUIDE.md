# ProdMatic Deployment Guide

This comprehensive guide covers deploying ProdMatic to production environments, including cloud platforms, self-hosted solutions, and containerized deployments.

## 📋 Prerequisites

Before deploying ProdMatic, ensure you have:

- Node.js 18+ and pnpm (or npm)
- PostgreSQL database (hosted or self-managed)
- Domain name and SSL certificate (for production)
- Environment variables configured
- Basic understanding of your chosen deployment platform

## 🌟 Deployment Options Overview

| Option | Best For | Complexity | Cost | Scalability |
|--------|----------|------------|------|-------------|
| Vercel + Supabase | Startups, MVP | Low | Low-Medium | High |
| Netlify + PlanetScale | Small teams | Low | Low-Medium | High |
| Railway | Simple deployment | Low | Low | Medium |
| Docker + Cloud VPS | Custom setups | Medium | Low-Medium | Medium |
| AWS/GCP/Azure | Enterprise | High | Medium-High | Very High |
| Self-hosted | Privacy/compliance | High | Low | Medium |

## 🚀 Option 1: Vercel + Supabase (Recommended)

**Perfect for**: Most use cases, easy scaling, minimal configuration

### Step 1: Database Setup (Supabase)

1. **Create Supabase Project**:
   ```bash
   # Visit https://supabase.com and create a new project
   # Note down your project URL and anon key
   ```

2. **Configure Database**:
   ```sql
   -- Enable required extensions (in Supabase SQL Editor)
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "citext";
   ```

3. **Get Connection URL**:
   - Go to Settings > Database
   - Copy the Connection String (use connection pooling URL for production)

### Step 2: Application Deployment (Vercel)

1. **Connect Repository**:
   ```bash
   # Push your code to GitHub
   git remote add origin https://github.com/yourusername/prodmatic.git
   git push -u origin main
   
   # Visit https://vercel.com and import your GitHub repository
   ```

2. **Configure Environment Variables**:
   In Vercel dashboard, add these variables:
   ```env
   # Database
   DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres?pgbouncer=true&connection_limit=1
   
   # NextAuth
   NEXTAUTH_SECRET=your-super-secret-jwt-key-min-32-chars
   NEXTAUTH_URL=https://your-app.vercel.app
   
   # OAuth (Optional)
   GITHUB_ID=your-github-oauth-client-id
   GITHUB_SECRET=your-github-oauth-client-secret
   GOOGLE_CLIENT_ID=your-google-oauth-client-id
   GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
   
   # Email (Resend)
   RESEND_API_KEY=your-resend-api-key
   EMAIL_FROM=noreply@your-domain.com
   
   # Supabase (Optional - for file uploads)
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Feature Flags
   NEXT_PUBLIC_ENABLE_ANALYTICS=true
   NEXT_PUBLIC_ENABLE_AI_ASSIST=false
   ```

3. **Deploy**:
   ```bash
   # Vercel will automatically deploy on git push
   # Or trigger manual deployment in dashboard
   ```

### Step 3: Database Migration

```bash
# After deployment, run migrations
npx prisma migrate deploy

# Seed with initial data (optional)
npx prisma db seed
```

### Step 4: Custom Domain (Optional)

1. In Vercel dashboard: Settings > Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Update `NEXTAUTH_URL` environment variable

## 🚢 Option 2: Docker Deployment

**Perfect for**: Self-hosted environments, VPS, cloud instances

### Step 1: Create Dockerfile

```dockerfile
# Production Dockerfile
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### Step 2: Docker Compose Setup

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/prodmatic
      - NEXTAUTH_SECRET=your-production-secret
      - NEXTAUTH_URL=https://your-domain.com
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: prodmatic
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your-secure-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
```

### Step 3: Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Step 4: Deploy with Docker

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose exec app npx prisma migrate deploy

# Seed database (optional)
docker-compose exec app npx prisma db seed
```

## ☁️ Option 3: Cloud Provider Deployment

### AWS Deployment

#### Using AWS App Runner

1. **Create ECR Repository**:
   ```bash
   aws ecr create-repository --repository-name prodmatic
   ```

2. **Build and Push Image**:
   ```bash
   # Get login token
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [account].dkr.ecr.us-east-1.amazonaws.com

   # Build and tag
   docker build -t prodmatic .
   docker tag prodmatic:latest [account].dkr.ecr.us-east-1.amazonaws.com/prodmatic:latest

   # Push
   docker push [account].dkr.ecr.us-east-1.amazonaws.com/prodmatic:latest
   ```

3. **Create App Runner Service**:
   ```json
   {
     "ServiceName": "prodmatic-app",
     "SourceConfiguration": {
       "ImageRepository": {
         "ImageIdentifier": "[account].dkr.ecr.us-east-1.amazonaws.com/prodmatic:latest",
         "ImageConfiguration": {
           "Port": "3000",
           "RuntimeEnvironmentVariables": {
             "DATABASE_URL": "your-rds-url",
             "NEXTAUTH_SECRET": "your-secret"
           }
         }
       }
     }
   }
   ```

#### Using ECS with Fargate

1. **Create Task Definition**:
   ```json
   {
     "family": "prodmatic-task",
     "networkMode": "awsvpc",
     "requiresCompatibilities": ["FARGATE"],
     "cpu": "512",
     "memory": "1024",
     "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
     "containerDefinitions": [
       {
         "name": "prodmatic",
         "image": "[account].dkr.ecr.us-east-1.amazonaws.com/prodmatic:latest",
         "portMappings": [{"containerPort": 3000}],
         "environment": [
           {"name": "DATABASE_URL", "value": "your-rds-url"},
           {"name": "NEXTAUTH_SECRET", "value": "your-secret"}
         ]
       }
     ]
   }
   ```

### Google Cloud Deployment

#### Using Cloud Run

```bash
# Build and deploy
gcloud run deploy prodmatic \
  --image gcr.io/project-id/prodmatic \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="your-cloud-sql-url",NEXTAUTH_SECRET="your-secret"
```

### Azure Deployment

#### Using Container Instances

```bash
# Deploy container
az container create \
  --resource-group prodmatic-rg \
  --name prodmatic-app \
  --image your-registry.azurecr.io/prodmatic:latest \
  --dns-name-label prodmatic \
  --ports 3000 \
  --environment-variables DATABASE_URL="your-azure-db-url" NEXTAUTH_SECRET="your-secret"
```

## 🔧 Environment Configuration

### Required Environment Variables

```env
# Core Configuration
DATABASE_URL=postgresql://user:password@host:port/database
NEXTAUTH_SECRET=your-super-secret-jwt-key-minimum-32-characters
NEXTAUTH_URL=https://your-production-domain.com

# Authentication Providers (Optional)
GITHUB_ID=your-github-oauth-client-id
GITHUB_SECRET=your-github-oauth-client-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Email Service (Choose one)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@your-domain.com

# File Storage (Optional - Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Feature Toggles
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_AI_ASSIST=false
NEXT_PUBLIC_ENABLE_WEBHOOKS=true

# Security
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### Optional Environment Variables

```env
# AI Integration (OpenAI)
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-3.5-turbo

# Analytics (PostHog, Mixpanel, etc.)
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Error Tracking (Sentry)
SENTRY_DSN=your-sentry-dsn
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project

# Monitoring
HEALTH_CHECK_TOKEN=your-health-check-token
```

## 🗄️ Database Configuration

### PostgreSQL Setup Options

#### Option 1: Managed Database Services

**Supabase** (Recommended for simplicity):
```bash
# Connection with connection pooling
DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres?pgbouncer=true&connection_limit=1"
```

**AWS RDS**:
```bash
# Connection with SSL
DATABASE_URL="postgresql://username:password@prod-db.region.rds.amazonaws.com:5432/prodmatic?sslmode=require"
```

**Google Cloud SQL**:
```bash
# Connection via Unix socket
DATABASE_URL="postgresql://username:password@/prodmatic?host=/cloudsql/project:region:instance"
```

#### Option 2: Self-Managed PostgreSQL

**Docker PostgreSQL**:
```yaml
db:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: prodmatic
    POSTGRES_USER: prodmatic_user
    POSTGRES_PASSWORD: secure_password_here
  volumes:
    - postgres_data:/var/lib/postgresql/data
  ports:
    - "5432:5432"
```

**Configuration for Production**:
```sql
-- postgresql.conf optimizations
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
```

### Database Migration and Seeding

```bash
# Production migration (no interactive prompts)
npx prisma migrate deploy

# Reset database (WARNING: Destructive)
npx prisma migrate reset --force

# Seed with sample data
npx prisma db seed

# Generate Prisma client
npx prisma generate

# View database in browser
npx prisma studio
```

## 🔐 Security Configuration

### SSL/TLS Setup

#### Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Cloudflare SSL (Recommended)

1. Point your domain to Cloudflare
2. Enable "Full (strict)" SSL mode
3. Enable "Always Use HTTPS"
4. Configure origin certificates if using custom backend

### Authentication Security

```env
# Strong JWT secret (32+ characters)
NEXTAUTH_SECRET=your-super-secure-secret-key-with-32-plus-characters

# Session configuration
SESSION_STRATEGY=jwt  # or 'database'
SESSION_MAX_AGE=2592000  # 30 days in seconds
```

### Rate Limiting

```javascript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
})

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  return NextResponse.next()
}
```

## 📊 Monitoring and Logging

### Health Checks

```javascript
// app/api/health/route.ts
export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version
    })
  } catch (error) {
    return Response.json(
      { status: 'unhealthy', error: error.message },
      { status: 500 }
    )
  }
}
```

### Application Monitoring

#### Sentry Error Tracking

```bash
npm install @sentry/nextjs

# Configure in next.config.js
const { withSentryConfig } = require('@sentry/nextjs')

module.exports = withSentryConfig({
  // Your Next.js config
}, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
})
```

#### Performance Monitoring

```javascript
// lib/analytics.ts
export function trackPageView(url: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'GA_TRACKING_ID', {
      page_path: url,
    })
  }
}
```

### Log Management

```javascript
// lib/logger.ts
import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
})
```

## 🚀 Performance Optimization

### Next.js Configuration

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  },
  images: {
    domains: ['your-domain.com', 'supabase-bucket.s3.amazonaws.com'],
    formats: ['image/webp', 'image/avif']
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  httpAgentOptions: {
    keepAlive: true,
  }
}

module.exports = nextConfig
```

### Database Optimization

```sql
-- Add database indexes for performance
CREATE INDEX CONCURRENTLY idx_ideas_product_status ON ideas(product_id, status);
CREATE INDEX CONCURRENTLY idx_features_epic_status ON features(epic_id, status);
CREATE INDEX CONCURRENTLY idx_tasks_sprint_assignee ON tasks(sprint_id, assignee_id);
CREATE INDEX CONCURRENTLY idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

### CDN Configuration

#### Cloudflare Settings

- **Caching Level**: Standard
- **Browser Cache TTL**: 4 hours
- **Always Online**: On
- **Minification**: HTML, CSS, JS
- **Brotli Compression**: On

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

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
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test
      - run: pnpm build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

## 🧪 Testing in Production

### Smoke Tests

```bash
#!/bin/bash
# smoke-test.sh

BASE_URL="https://your-production-domain.com"

# Test health endpoint
curl -f "$BASE_URL/api/health" || exit 1

# Test main page
curl -f "$BASE_URL" || exit 1

# Test API endpoints
curl -f "$BASE_URL/api/auth/session" || exit 1

echo "All smoke tests passed!"
```

### Load Testing

```javascript
// load-test.js (using k6)
import http from 'k6/http'
import { check } from 'k6'

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
}

export default function () {
  let response = http.get('https://your-production-domain.com')
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  })
}
```

## 🚨 Troubleshooting

### Common Deployment Issues

#### Database Connection Issues

```bash
# Check connection
npx prisma db pull

# Test with psql
psql "postgresql://user:password@host:port/database"

# Verify SSL requirements
psql "postgresql://user:password@host:port/database?sslmode=require"
```

#### Next.js Build Issues

```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules
rm -rf node_modules package-lock.json
npm install

# Type checking
npx tsc --noEmit
```

#### Authentication Issues

- Check `NEXTAUTH_URL` matches your domain
- Verify `NEXTAUTH_SECRET` is set and secure
- Confirm OAuth redirect URIs in provider settings
- Test session endpoints: `/api/auth/session`

#### Performance Issues

```bash
# Analyze bundle size
npx @next/bundle-analyzer

# Check database queries
npx prisma studio

# Monitor logs
tail -f /var/log/nginx/access.log
```

### Rollback Procedures

#### Vercel Rollback

```bash
# List deployments
vercel list

# Rollback to previous deployment
vercel rollback [deployment-url]
```

#### Docker Rollback

```bash
# Tag current version
docker tag prodmatic:latest prodmatic:backup

# Deploy previous version
docker-compose down
docker-compose pull
docker-compose up -d
```

## 🏁 Post-Deployment Checklist

### Immediate Actions

- [ ] Verify application loads correctly
- [ ] Test user registration and login
- [ ] Check database connections
- [ ] Confirm email sending works
- [ ] Test critical user flows
- [ ] Verify SSL certificate
- [ ] Check health endpoints
- [ ] Monitor error rates

### Security Checklist

- [ ] Update default passwords
- [ ] Configure rate limiting
- [ ] Enable security headers
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Test authentication flows
- [ ] Verify HTTPS redirect
- [ ] Check CORS settings

### Performance Checklist

- [ ] Enable CDN
- [ ] Configure caching
- [ ] Optimize images
- [ ] Set up monitoring
- [ ] Configure alerts
- [ ] Test under load
- [ ] Monitor database performance
- [ ] Check response times

---

## 📞 Support

For deployment issues:

1. Check the [troubleshooting section](#-troubleshooting)
2. Review application logs
3. Test health endpoints
4. Open an issue on GitHub with:
   - Deployment platform
   - Error messages
   - Environment configuration (without secrets)
   - Steps to reproduce

**Remember**: Never share production secrets or credentials in support requests!