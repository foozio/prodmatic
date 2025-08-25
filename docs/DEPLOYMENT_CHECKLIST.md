# ProdMatic Deployment Checklist

Use this checklist to ensure a smooth production deployment of ProdMatic.

## 📋 Pre-Deployment Checklist

### Environment Setup
- [ ] **Database ready**: PostgreSQL instance configured and accessible
- [ ] **Domain configured**: DNS pointing to your hosting provider
- [ ] **SSL certificate**: HTTPS enabled (Let's Encrypt, Cloudflare, or custom)
- [ ] **Email service**: Resend, SendGrid, or SMTP configured
- [ ] **Environment variables**: All required variables configured securely

### Code Preparation
- [ ] **Tests passing**: All unit and integration tests pass
- [ ] **Build successful**: `npm run build` completes without errors
- [ ] **Type checking**: `npm run typecheck` passes
- [ ] **Linting**: Code passes ESLint and Prettier checks
- [ ] **Dependencies updated**: Security vulnerabilities addressed

## 🚀 Deployment Steps

### 1. Database Setup
- [ ] **Create database**: PostgreSQL instance with appropriate resources
- [ ] **Run migrations**: `npx prisma migrate deploy`
- [ ] **Verify schema**: Database structure matches Prisma schema
- [ ] **Test connection**: Application can connect to database
- [ ] **Seed data** (optional): `npx prisma db seed` for sample data

### 2. Application Deployment

#### Vercel Deployment
- [ ] **Repository connected**: GitHub repo linked to Vercel project
- [ ] **Environment variables**: All required env vars configured in dashboard
- [ ] **Build settings**: Build command and output directory correct
- [ ] **Domain configured**: Custom domain added and DNS configured
- [ ] **Deploy**: Initial deployment successful

#### Docker Deployment
- [ ] **Dockerfile ready**: Production Dockerfile configured
- [ ] **Image built**: `docker build` successful
- [ ] **Container running**: Application starts without errors
- [ ] **Health check**: `/api/health` endpoint responding
- [ ] **Reverse proxy**: Nginx or similar configured for SSL

#### Cloud Provider Deployment
- [ ] **Service configured**: Container service or VM set up
- [ ] **Load balancer**: Traffic distribution configured
- [ ] **Auto-scaling**: Resource scaling policies set
- [ ] **Monitoring**: Application and infrastructure monitoring enabled

### 3. Environment Variables Configuration

#### Required Variables
```bash
DATABASE_URL=postgresql://user:pass@host:port/db
NEXTAUTH_SECRET=your-32-char-secret  # Generate with: openssl rand -base64 32
NEXTAUTH_URL=https://your-domain.com
```

#### Email Configuration
```bash
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@your-domain.com
```

#### OAuth Providers (Optional)
```bash
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### Additional Services (Optional)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
OPENAI_API_KEY=your-openai-api-key  # For AI features
```

## ✅ Post-Deployment Verification

### Functionality Tests
- [ ] **Application loads**: Main page accessible via HTTPS
- [ ] **Authentication works**: Registration and login functional
- [ ] **Database queries**: Data retrieval and creation working
- [ ] **Email sending**: Registration and notification emails sent
- [ ] **File uploads** (if enabled): Document uploads working
- [ ] **API endpoints**: Health check and auth endpoints responding

### Performance Tests
- [ ] **Page load times**: < 3 seconds for main pages
- [ ] **Database queries**: No N+1 queries or slow operations
- [ ] **Memory usage**: Application not leaking memory
- [ ] **Error rates**: < 1% error rate on critical paths
- [ ] **Uptime monitoring**: Health checks configured

### Security Verification
- [ ] **HTTPS enforced**: HTTP traffic redirects to HTTPS
- [ ] **Security headers**: Proper headers configured (CSP, HSTS, etc.)
- [ ] **Authentication**: Session management secure
- [ ] **Authorization**: Role-based access working correctly
- [ ] **Rate limiting**: API protection enabled
- [ ] **Secrets secure**: No sensitive data exposed in logs/errors

## 🔧 Configuration Checklist

### Authentication Setup
- [ ] **OAuth apps created**: GitHub/Google OAuth applications configured
- [ ] **Redirect URIs**: Correct callback URLs in OAuth settings
- [ ] **Session configuration**: Appropriate session timeout
- [ ] **Password policy**: Strong password requirements if using credentials

### Database Optimization
- [ ] **Indexes created**: Database indexes for performance
- [ ] **Connection pooling**: Proper connection management
- [ ] **Backup strategy**: Automated database backups configured
- [ ] **Migration strategy**: Database update procedures defined

### Monitoring Setup
- [ ] **Application monitoring**: Error tracking (Sentry, etc.)
- [ ] **Performance monitoring**: APM tools configured
- [ ] **Uptime monitoring**: External monitoring service
- [ ] **Log aggregation**: Centralized logging (if needed)
- [ ] **Alerting**: Critical error notifications

### CDN and Performance
- [ ] **CDN configured**: Static assets served via CDN
- [ ] **Caching strategy**: Appropriate cache headers
- [ ] **Image optimization**: Next.js image optimization enabled
- [ ] **Bundle optimization**: Code splitting and tree shaking

## 🚨 Rollback Plan

### Preparation
- [ ] **Previous version tagged**: Git tag for current production version
- [ ] **Database backup**: Recent backup before deployment
- [ ] **Environment backup**: Current environment variables documented
- [ ] **Rollback procedure**: Steps documented and tested

### Rollback Steps (if needed)
1. **Immediate**: Revert to previous deployment/container
2. **Database**: Restore from backup (if schema changed)
3. **Configuration**: Restore previous environment variables
4. **Verification**: Confirm application functionality
5. **Communication**: Notify stakeholders of rollback

## 📊 Success Metrics

### Technical Metrics
- [ ] **Uptime**: 99.9%+ availability
- [ ] **Response time**: < 500ms average
- [ ] **Error rate**: < 0.1% for critical operations
- [ ] **Database performance**: Query times within limits
- [ ] **Memory usage**: Stable memory consumption

### Business Metrics
- [ ] **User registration**: Registration flow working
- [ ] **Core features**: Key user journeys functional
- [ ] **Data integrity**: No data corruption or loss
- [ ] **Security**: No security vulnerabilities exposed

## 📞 Deployment Support

### Common Issues
- **Database connection**: Check connection string and network access
- **Build failures**: Verify Node.js version and dependencies
- **Authentication errors**: Confirm OAuth settings and secrets
- **Performance issues**: Check database queries and caching
- **SSL issues**: Verify certificate and redirect configuration

### Support Contacts
- **Technical issues**: Development team contact
- **Infrastructure**: DevOps/Platform team contact
- **Database**: DBA or database service support
- **Domain/DNS**: Domain registrar support
- **Hosting**: Cloud provider support

---

## 🎯 Quick Commands Reference

```bash
# Database operations
npx prisma migrate deploy
npx prisma db seed
npx prisma generate

# Build and test
npm run build
npm run test
npm run typecheck

# Health check
curl https://your-domain.com/api/health

# View logs (Docker)
docker-compose logs -f app

# Restart services (Docker)
docker-compose restart app
```

**✅ Complete this checklist before marking deployment as successful!**