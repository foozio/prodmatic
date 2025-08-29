# Security Guide

This guide covers security best practices, implementation details, and security considerations for the ProdMatic Next.js application.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Data Protection](#data-protection)
3. [API Security](#api-security)
4. [Input Validation](#input-validation)
5. [Session Management](#session-management)
6. [Database Security](#database-security)
7. [Infrastructure Security](#infrastructure-security)
8. [Security Headers](#security-headers)
9. [Monitoring & Logging](#monitoring--logging)
10. [Incident Response](#incident-response)
11. [Compliance](#compliance)
12. [Security Testing](#security-testing)

## Authentication & Authorization

### NextAuth.js Configuration

ProdMatic uses NextAuth.js for secure authentication with multiple providers:

```javascript
// pages/api/auth/[...nextauth].js
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export default NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      // Log successful sign-ins
      console.log(`User ${user.email} signed in via ${account.provider}`)
    },
    async signOut({ token }) {
      // Log sign-outs
      console.log(`User ${token.email} signed out`)
    },
  },
})
```

### Role-Based Access Control (RBAC)

```typescript
// lib/auth/permissions.ts
export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER'
}

export enum Permission {
  // Organization permissions
  MANAGE_ORGANIZATION = 'MANAGE_ORGANIZATION',
  VIEW_ORGANIZATION = 'VIEW_ORGANIZATION',
  
  // Product permissions
  CREATE_PRODUCT = 'CREATE_PRODUCT',
  EDIT_PRODUCT = 'EDIT_PRODUCT',
  DELETE_PRODUCT = 'DELETE_PRODUCT',
  VIEW_PRODUCT = 'VIEW_PRODUCT',
  
  // Team permissions
  MANAGE_TEAM = 'MANAGE_TEAM',
  INVITE_MEMBERS = 'INVITE_MEMBERS',
  
  // Content permissions
  CREATE_IDEA = 'CREATE_IDEA',
  EDIT_IDEA = 'EDIT_IDEA',
  DELETE_IDEA = 'DELETE_IDEA',
  
  CREATE_FEATURE = 'CREATE_FEATURE',
  EDIT_FEATURE = 'EDIT_FEATURE',
  DELETE_FEATURE = 'DELETE_FEATURE',
}

const rolePermissions: Record<Role, Permission[]> = {
  [Role.OWNER]: [
    Permission.MANAGE_ORGANIZATION,
    Permission.VIEW_ORGANIZATION,
    Permission.CREATE_PRODUCT,
    Permission.EDIT_PRODUCT,
    Permission.DELETE_PRODUCT,
    Permission.VIEW_PRODUCT,
    Permission.MANAGE_TEAM,
    Permission.INVITE_MEMBERS,
    Permission.CREATE_IDEA,
    Permission.EDIT_IDEA,
    Permission.DELETE_IDEA,
    Permission.CREATE_FEATURE,
    Permission.EDIT_FEATURE,
    Permission.DELETE_FEATURE,
  ],
  [Role.ADMIN]: [
    Permission.VIEW_ORGANIZATION,
    Permission.CREATE_PRODUCT,
    Permission.EDIT_PRODUCT,
    Permission.VIEW_PRODUCT,
    Permission.MANAGE_TEAM,
    Permission.INVITE_MEMBERS,
    Permission.CREATE_IDEA,
    Permission.EDIT_IDEA,
    Permission.DELETE_IDEA,
    Permission.CREATE_FEATURE,
    Permission.EDIT_FEATURE,
    Permission.DELETE_FEATURE,
  ],
  [Role.MEMBER]: [
    Permission.VIEW_ORGANIZATION,
    Permission.VIEW_PRODUCT,
    Permission.CREATE_IDEA,
    Permission.EDIT_IDEA,
    Permission.CREATE_FEATURE,
    Permission.EDIT_FEATURE,
  ],
  [Role.VIEWER]: [
    Permission.VIEW_ORGANIZATION,
    Permission.VIEW_PRODUCT,
  ],
}

export const hasPermission = (userRole: Role, permission: Permission): boolean => {
  return rolePermissions[userRole]?.includes(permission) || false
}

export const requirePermission = (permission: Permission) => {
  return async (req: NextRequest, context: any) => {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = await getUserRole(session.user.id, context.params.organizationId)
    
    if (!hasPermission(userRole, permission)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return null // Continue to the actual handler
  }
}
```

### Multi-Factor Authentication (MFA)

```typescript
// lib/auth/mfa.ts
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'

export const generateMFASecret = (userEmail: string) => {
  const secret = speakeasy.generateSecret({
    name: `ProdMatic (${userEmail})`,
    issuer: 'ProdMatic',
    length: 32,
  })

  return {
    secret: secret.base32,
    qrCodeUrl: secret.otpauth_url,
  }
}

export const generateQRCode = async (otpauthUrl: string): Promise<string> => {
  return await QRCode.toDataURL(otpauthUrl)
}

export const verifyMFAToken = (token: string, secret: string): boolean => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Allow 2 time steps (60 seconds) of drift
  })
}

// Server action for enabling MFA
export const enableMFA = async (userId: string, token: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaSecret: true }
  })

  if (!user?.mfaSecret) {
    throw new Error('MFA secret not found')
  }

  const isValid = verifyMFAToken(token, user.mfaSecret)
  
  if (!isValid) {
    throw new Error('Invalid MFA token')
  }

  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: true }
  })

  return { success: true }
}
```

## Data Protection

### Encryption at Rest

```typescript
// lib/encryption.ts
import crypto from 'crypto'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY // 32 bytes key
const ALGORITHM = 'aes-256-gcm'

export const encrypt = (text: string): { encrypted: string; iv: string; tag: string } => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const tag = cipher.getAuthTag()
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  }
}

export const decrypt = (encryptedData: { encrypted: string; iv: string; tag: string }): string => {
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY)
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'))
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

// Usage in Prisma models
export const encryptSensitiveField = (value: string) => {
  if (!value) return null
  const encrypted = encrypt(value)
  return JSON.stringify(encrypted)
}

export const decryptSensitiveField = (encryptedValue: string | null) => {
  if (!encryptedValue) return null
  try {
    const parsed = JSON.parse(encryptedValue)
    return decrypt(parsed)
  } catch (error) {
    console.error('Failed to decrypt field:', error)
    return null
  }
}
```

### Data Anonymization

```typescript
// lib/anonymization.ts
import crypto from 'crypto'

export const anonymizeEmail = (email: string): string => {
  const [username, domain] = email.split('@')
  const anonymizedUsername = username.slice(0, 2) + '*'.repeat(username.length - 2)
  return `${anonymizedUsername}@${domain}`
}

export const anonymizeName = (name: string): string => {
  const parts = name.split(' ')
  return parts.map(part => part.charAt(0) + '*'.repeat(part.length - 1)).join(' ')
}

export const generateAnonymousId = (originalId: string): string => {
  return crypto.createHash('sha256').update(originalId + process.env.ANONYMIZATION_SALT).digest('hex').slice(0, 16)
}

export const anonymizeUserData = (user: any) => {
  return {
    id: generateAnonymousId(user.id),
    email: anonymizeEmail(user.email),
    name: anonymizeName(user.name),
    createdAt: user.createdAt,
    // Remove sensitive fields
    password: undefined,
    mfaSecret: undefined,
  }
}
```

## API Security

### Rate Limiting

```typescript
// lib/rate-limit.ts
import { NextRequest } from 'next/server'
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (req: NextRequest) => string
}

export const rateLimit = (config: RateLimitConfig) => {
  return async (req: NextRequest) => {
    const key = config.keyGenerator ? config.keyGenerator(req) : getClientIP(req)
    const windowKey = `rate_limit:${key}:${Math.floor(Date.now() / config.windowMs)}`
    
    const current = await redis.incr(windowKey)
    
    if (current === 1) {
      await redis.expire(windowKey, Math.ceil(config.windowMs / 1000))
    }
    
    if (current > config.maxRequests) {
      return new Response(
        JSON.stringify({ error: 'Too many requests' }),
        { 
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (Date.now() + config.windowMs).toString(),
          }
        }
      )
    }
    
    return null // Continue to the actual handler
  }
}

const getClientIP = (req: NextRequest): string => {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return req.ip || 'unknown'
}

// Usage in API routes
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
})

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // Stricter limit for auth endpoints
  keyGenerator: (req) => {
    const body = req.body as any
    return `auth:${body?.email || getClientIP(req)}`
  }
})
```

### API Key Management

```typescript
// lib/api-keys.ts
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

export const generateAPIKey = (): { key: string; hash: string } => {
  const key = `pk_${crypto.randomBytes(32).toString('hex')}`
  const hash = bcrypt.hashSync(key, 12)
  
  return { key, hash }
}

export const validateAPIKey = async (providedKey: string, storedHash: string): Promise<boolean> => {
  return await bcrypt.compare(providedKey, storedHash)
}

export const createAPIKey = async (userId: string, name: string, permissions: string[]) => {
  const { key, hash } = generateAPIKey()
  
  const apiKey = await prisma.apiKey.create({
    data: {
      name,
      keyHash: hash,
      permissions,
      userId,
      lastUsedAt: null,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    }
  })
  
  return { ...apiKey, key } // Return the plain key only once
}

export const authenticateAPIKey = async (keyString: string) => {
  if (!keyString.startsWith('pk_')) {
    return null
  }
  
  const apiKeys = await prisma.apiKey.findMany({
    where: {
      expiresAt: { gt: new Date() },
      revokedAt: null,
    },
    include: { user: true }
  })
  
  for (const apiKey of apiKeys) {
    const isValid = await validateAPIKey(keyString, apiKey.keyHash)
    
    if (isValid) {
      // Update last used timestamp
      await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() }
      })
      
      return apiKey
    }
  }
  
  return null
}
```

## Input Validation

### Zod Schemas

```typescript
// lib/validations/schemas.ts
import { z } from 'zod'

// User schemas
export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
           'Password must contain uppercase, lowercase, number, and special character'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  bio: z.string().max(500).optional(),
})

// Product schemas
export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(255),
  description: z.string().max(1000).optional(),
  organizationId: z.string().uuid('Invalid organization ID'),
})

// Idea schemas
export const createIdeaSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(1, 'Description is required'),
  impact: z.number().int().min(1).max(10),
  effort: z.number().int().min(1).max(10),
  confidence: z.number().int().min(1).max(10),
  tags: z.array(z.string().max(50)).max(10),
  productId: z.string().uuid(),
})

// File upload schemas
export const fileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/),
  size: z.number().max(10 * 1024 * 1024), // 10MB max
})

// Sanitization helpers
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim()
}

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>"'&]/g, (match) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      }
      return entities[match] || match
    })
    .trim()
}
```

### Server Action Validation

```typescript
// lib/validations/server-actions.ts
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/pages/api/auth/[...nextauth]'

export const withValidation = <T extends z.ZodSchema>(
  schema: T,
  handler: (data: z.infer<T>, session: any) => Promise<any>
) => {
  return async (formData: FormData | any) => {
    try {
      // Get session
      const session = await getServerSession(authOptions)
      if (!session?.user) {
        throw new Error('Unauthorized')
      }

      // Parse and validate data
      const rawData = formData instanceof FormData 
        ? Object.fromEntries(formData.entries())
        : formData
      
      const validatedData = schema.parse(rawData)
      
      // Call the actual handler
      return await handler(validatedData, session)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Usage example
export const createIdea = withValidation(
  createIdeaSchema,
  async (data, session) => {
    // Verify user has permission to create ideas in this product
    const product = await prisma.product.findFirst({
      where: {
        id: data.productId,
        organization: {
          memberships: {
            some: {
              userId: session.user.id,
              role: { in: ['OWNER', 'ADMIN', 'MEMBER'] }
            }
          }
        }
      }
    })
    
    if (!product) {
      throw new Error('Product not found or access denied')
    }
    
    const idea = await prisma.idea.create({
      data: {
        ...data,
        authorId: session.user.id,
        riceScore: (data.impact * data.confidence) / data.effort
      }
    })
    
    return { success: true, idea }
  }
)
```

## Session Management

### Secure Session Configuration

```typescript
// lib/session.ts
import { getServerSession } from 'next-auth'
import { authOptions } from '@/pages/api/auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export const getSecureSession = async () => {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return null
  }
  
  // Verify user still exists and is active
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      lastLoginAt: true,
      mfaEnabled: true,
    }
  })
  
  if (!user || !user.isActive) {
    return null
  }
  
  return {
    ...session,
    user: {
      ...session.user,
      ...user
    }
  }
}

export const requireAuth = async () => {
  const session = await getSecureSession()
  
  if (!session) {
    throw new Error('Authentication required')
  }
  
  return session
}

export const requireMFA = async () => {
  const session = await requireAuth()
  
  if (!session.user.mfaEnabled) {
    throw new Error('Multi-factor authentication required')
  }
  
  return session
}

// Session activity tracking
export const trackSessionActivity = async (userId: string, activity: string) => {
  await prisma.sessionActivity.create({
    data: {
      userId,
      activity,
      ipAddress: getClientIP(),
      userAgent: getUserAgent(),
      timestamp: new Date(),
    }
  })
}

// Detect suspicious activity
export const detectSuspiciousActivity = async (userId: string) => {
  const recentActivities = await prisma.sessionActivity.findMany({
    where: {
      userId,
      timestamp: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    },
    orderBy: { timestamp: 'desc' }
  })
  
  const suspiciousPatterns = [
    // Multiple failed login attempts
    recentActivities.filter(a => a.activity === 'failed_login').length > 5,
    
    // Login from multiple IP addresses
    new Set(recentActivities.map(a => a.ipAddress)).size > 3,
    
    // Unusual activity patterns
    recentActivities.filter(a => a.activity === 'password_change').length > 2,
  ]
  
  return suspiciousPatterns.some(Boolean)
}
```

## Database Security

### Connection Security

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Row Level Security (RLS) helpers
export const withRLS = async <T>(
  userId: string,
  organizationId: string,
  query: () => Promise<T>
): Promise<T> => {
  // Set RLS context
  await prisma.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`
  await prisma.$executeRaw`SELECT set_config('app.current_org_id', ${organizationId}, true)`
  
  try {
    return await query()
  } finally {
    // Clear RLS context
    await prisma.$executeRaw`SELECT set_config('app.current_user_id', '', true)`
    await prisma.$executeRaw`SELECT set_config('app.current_org_id', '', true)`
  }
}

// Audit logging
export const auditLog = async ({
  userId,
  action,
  resourceType,
  resourceId,
  metadata = {}
}: {
  userId: string
  action: string
  resourceType: string
  resourceId?: string
  metadata?: Record<string, any>
}) => {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      resourceType,
      resourceId,
      metadata,
      timestamp: new Date(),
      ipAddress: getClientIP(),
      userAgent: getUserAgent(),
    }
  })
}
```

### SQL Injection Prevention

```sql
-- Database policies for Row Level Security
-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY user_isolation ON users
  FOR ALL
  TO authenticated
  USING (id = current_setting('app.current_user_id')::uuid);

-- Organization members can see organization data
CREATE POLICY org_member_access ON organizations
  FOR ALL
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM memberships 
      WHERE user_id = current_setting('app.current_user_id')::uuid
    )
  );

-- Product access based on organization membership
CREATE POLICY product_org_access ON products
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM memberships 
      WHERE user_id = current_setting('app.current_user_id')::uuid
    )
  );

-- Ideas access based on product access
CREATE POLICY idea_product_access ON ideas
  FOR ALL
  TO authenticated
  USING (
    product_id IN (
      SELECT p.id 
      FROM products p
      JOIN memberships m ON p.organization_id = m.organization_id
      WHERE m.user_id = current_setting('app.current_user_id')::uuid
    )
  );
```

## Infrastructure Security

### Environment Variables

```bash
# .env.example - Security-focused environment variables

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/prodmatic?sslmode=require"

# Authentication
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-super-secret-key-here" # Generate with: openssl rand -base64 32

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-client-secret"

# Encryption
ENCRYPTION_KEY="your-32-byte-encryption-key" # Generate with: openssl rand -hex 32
ANONYMIZATION_SALT="your-anonymization-salt"

# Redis (for rate limiting and caching)
REDIS_URL="redis://localhost:6379"

# File uploads
UPLOAD_MAX_SIZE="10485760" # 10MB
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/gif,application/pdf,text/plain"

# Security headers
CSP_REPORT_URI="https://your-domain.com/api/csp-report"

# Monitoring
SENTRY_DSN="your-sentry-dsn"
LOG_LEVEL="info"
```

### Security Headers

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.github.com https://accounts.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `report-uri ${process.env.CSP_REPORT_URI}`
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)
  
  // HSTS (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }
  
  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

## Monitoring & Logging

### Security Event Logging

```typescript
// lib/security-logger.ts
import { prisma } from '@/lib/prisma'

export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  DATA_EXPORT = 'DATA_EXPORT',
  API_KEY_CREATED = 'API_KEY_CREATED',
  API_KEY_REVOKED = 'API_KEY_REVOKED',
}

interface SecurityEvent {
  type: SecurityEventType
  userId?: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export const logSecurityEvent = async (event: SecurityEvent) => {
  await prisma.securityLog.create({
    data: {
      type: event.type,
      userId: event.userId,
      ipAddress: event.ipAddress || getClientIP(),
      userAgent: event.userAgent || getUserAgent(),
      metadata: event.metadata || {},
      severity: event.severity,
      timestamp: new Date(),
    }
  })
  
  // Send alerts for high severity events
  if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
    await sendSecurityAlert(event)
  }
}

const sendSecurityAlert = async (event: SecurityEvent) => {
  // Implementation depends on your alerting system
  // Could be email, Slack, PagerDuty, etc.
  console.error('SECURITY ALERT:', event)
  
  // Example: Send to monitoring service
  if (process.env.SENTRY_DSN) {
    const Sentry = require('@sentry/nextjs')
    Sentry.captureException(new Error(`Security Event: ${event.type}`), {
      tags: {
        type: 'security_event',
        severity: event.severity,
      },
      extra: event,
    })
  }
}

// Usage examples
export const logFailedLogin = (email: string, ipAddress: string) => {
  logSecurityEvent({
    type: SecurityEventType.LOGIN_FAILURE,
    ipAddress,
    metadata: { email },
    severity: 'MEDIUM',
  })
}

export const logSuspiciousActivity = (userId: string, activity: string) => {
  logSecurityEvent({
    type: SecurityEventType.SUSPICIOUS_ACTIVITY,
    userId,
    metadata: { activity },
    severity: 'HIGH',
  })
}
```

### Intrusion Detection

```typescript
// lib/intrusion-detection.ts
import { prisma } from '@/lib/prisma'
import { logSecurityEvent, SecurityEventType } from '@/lib/security-logger'

interface ThreatPattern {
  name: string
  check: (events: any[]) => boolean
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

const threatPatterns: ThreatPattern[] = [
  {
    name: 'Brute Force Attack',
    check: (events) => {
      const failedLogins = events.filter(e => e.type === 'LOGIN_FAILURE')
      return failedLogins.length > 10 // 10 failed attempts in time window
    },
    severity: 'HIGH'
  },
  {
    name: 'Account Enumeration',
    check: (events) => {
      const uniqueEmails = new Set(
        events
          .filter(e => e.type === 'LOGIN_FAILURE')
          .map(e => e.metadata?.email)
      )
      return uniqueEmails.size > 20 // Trying many different emails
    },
    severity: 'MEDIUM'
  },
  {
    name: 'Privilege Escalation Attempt',
    check: (events) => {
      const permissionDenied = events.filter(e => e.type === 'PERMISSION_DENIED')
      return permissionDenied.length > 5 // Multiple permission denials
    },
    severity: 'HIGH'
  },
  {
    name: 'Data Exfiltration',
    check: (events) => {
      const dataExports = events.filter(e => e.type === 'DATA_EXPORT')
      return dataExports.length > 3 // Multiple data exports
    },
    severity: 'CRITICAL'
  }
]

export const analyzeSecurityEvents = async (timeWindowMinutes = 60) => {
  const since = new Date(Date.now() - timeWindowMinutes * 60 * 1000)
  
  // Group events by IP address
  const eventsByIP = await prisma.securityLog.groupBy({
    by: ['ipAddress'],
    where: {
      timestamp: { gte: since }
    },
    _count: true
  })
  
  for (const ipGroup of eventsByIP) {
    if (!ipGroup.ipAddress) continue
    
    const events = await prisma.securityLog.findMany({
      where: {
        ipAddress: ipGroup.ipAddress,
        timestamp: { gte: since }
      }
    })
    
    // Check each threat pattern
    for (const pattern of threatPatterns) {
      if (pattern.check(events)) {
        await logSecurityEvent({
          type: SecurityEventType.SUSPICIOUS_ACTIVITY,
          ipAddress: ipGroup.ipAddress,
          metadata: {
            pattern: pattern.name,
            eventCount: events.length,
            timeWindow: timeWindowMinutes
          },
          severity: pattern.severity
        })
        
        // Consider blocking the IP
        if (pattern.severity === 'HIGH' || pattern.severity === 'CRITICAL') {
          await blockIP(ipGroup.ipAddress, pattern.name)
        }
      }
    }
  }
}

const blockIP = async (ipAddress: string, reason: string) => {
  await prisma.blockedIP.create({
    data: {
      ipAddress,
      reason,
      blockedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    }
  })
  
  console.log(`Blocked IP ${ipAddress} for ${reason}`)
}

// Run analysis periodically
if (process.env.NODE_ENV === 'production') {
  setInterval(analyzeSecurityEvents, 5 * 60 * 1000) // Every 5 minutes
}
```

## Incident Response

### Security Incident Handling

```typescript
// lib/incident-response.ts
import { prisma } from '@/lib/prisma'
import { logSecurityEvent, SecurityEventType } from '@/lib/security-logger'

export enum IncidentSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum IncidentStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  CONTAINED = 'CONTAINED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

interface SecurityIncident {
  title: string
  description: string
  severity: IncidentSeverity
  affectedUsers?: string[]
  affectedSystems?: string[]
  metadata?: Record<string, any>
}

export const createSecurityIncident = async (incident: SecurityIncident) => {
  const securityIncident = await prisma.securityIncident.create({
    data: {
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      status: IncidentStatus.OPEN,
      affectedUsers: incident.affectedUsers || [],
      affectedSystems: incident.affectedSystems || [],
      metadata: incident.metadata || {},
      createdAt: new Date(),
    }
  })
  
  // Trigger incident response workflow
  await triggerIncidentResponse(securityIncident)
  
  return securityIncident
}

const triggerIncidentResponse = async (incident: any) => {
  // 1. Notify security team
  await notifySecurityTeam(incident)
  
  // 2. Auto-containment for critical incidents
  if (incident.severity === IncidentSeverity.CRITICAL) {
    await autoContainment(incident)
  }
  
  // 3. Create incident timeline
  await createIncidentTimeline(incident.id, 'Incident created and response initiated')
}

const notifySecurityTeam = async (incident: any) => {
  // Implementation depends on your notification system
  console.log('SECURITY INCIDENT:', incident)
  
  // Example: Send to Slack
  if (process.env.SLACK_SECURITY_WEBHOOK) {
    await fetch(process.env.SLACK_SECURITY_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 Security Incident: ${incident.title}`,
        attachments: [{
          color: incident.severity === 'CRITICAL' ? 'danger' : 'warning',
          fields: [
            { title: 'Severity', value: incident.severity, short: true },
            { title: 'Status', value: incident.status, short: true },
            { title: 'Description', value: incident.description, short: false }
          ]
        }]
      })
    })
  }
}

const autoContainment = async (incident: any) => {
  // Implement automatic containment measures
  
  // 1. Disable affected user accounts
  if (incident.affectedUsers?.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: incident.affectedUsers } },
      data: { isActive: false }
    })
    
    await createIncidentTimeline(
      incident.id,
      `Disabled ${incident.affectedUsers.length} affected user accounts`
    )
  }
  
  // 2. Revoke API keys
  if (incident.metadata?.compromisedApiKeys) {
    await prisma.apiKey.updateMany({
      where: { id: { in: incident.metadata.compromisedApiKeys } },
      data: { revokedAt: new Date() }
    })
    
    await createIncidentTimeline(
      incident.id,
      'Revoked compromised API keys'
    )
  }
  
  // 3. Block suspicious IP addresses
  if (incident.metadata?.suspiciousIPs) {
    for (const ip of incident.metadata.suspiciousIPs) {
      await blockIP(ip, `Security incident: ${incident.title}`)
    }
    
    await createIncidentTimeline(
      incident.id,
      `Blocked ${incident.metadata.suspiciousIPs.length} suspicious IP addresses`
    )
  }
}

const createIncidentTimeline = async (incidentId: string, event: string) => {
  await prisma.incidentTimeline.create({
    data: {
      incidentId,
      event,
      timestamp: new Date(),
    }
  })
}

// Incident recovery procedures
export const recoverFromIncident = async (incidentId: string) => {
  const incident = await prisma.securityIncident.findUnique({
    where: { id: incidentId }
  })
  
  if (!incident) {
    throw new Error('Incident not found')
  }
  
  // 1. Re-enable users after verification
  if (incident.affectedUsers?.length > 0) {
    // This should be done manually after investigation
    console.log('Manual action required: Verify and re-enable user accounts')
  }
  
  // 2. Generate new API keys for affected users
  // 3. Update security policies based on lessons learned
  // 4. Document incident in knowledge base
  
  await prisma.securityIncident.update({
    where: { id: incidentId },
    data: { status: IncidentStatus.RESOLVED }
  })
  
  await createIncidentTimeline(incidentId, 'Incident recovery completed')
}
```

## Compliance

### GDPR Compliance

```typescript
// lib/gdpr.ts
import { prisma } from '@/lib/prisma'
import { anonymizeUserData } from '@/lib/anonymization'

export const handleDataSubjectRequest = async (userId: string, requestType: 'access' | 'portability' | 'erasure') => {
  switch (requestType) {
    case 'access':
      return await exportUserData(userId)
    case 'portability':
      return await exportUserDataPortable(userId)
    case 'erasure':
      return await eraseUserData(userId)
    default:
      throw new Error('Invalid request type')
  }
}

const exportUserData = async (userId: string) => {
  const userData = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      ideas: true,
      features: true,
      documents: true,
      tasks: true,
      memberships: {
        include: { organization: true }
      },
      auditLogs: true,
      sessionActivities: true,
    }
  })
  
  if (!userData) {
    throw new Error('User not found')
  }
  
  // Log the data access request
  await logSecurityEvent({
    type: SecurityEventType.DATA_EXPORT,
    userId,
    metadata: { requestType: 'access' },
    severity: 'LOW'
  })
  
  return userData
}

const exportUserDataPortable = async (userId: string) => {
  const userData = await exportUserData(userId)
  
  // Convert to portable format (JSON)
  const portableData = {
    personal_information: {
      name: userData.name,
      email: userData.email,
      created_at: userData.createdAt,
      last_login: userData.lastLoginAt,
    },
    ideas: userData.ideas.map(idea => ({
      title: idea.title,
      description: idea.description,
      created_at: idea.createdAt,
      impact: idea.impact,
      effort: idea.effort,
      confidence: idea.confidence,
    })),
    features: userData.features.map(feature => ({
      title: feature.title,
      description: feature.description,
      created_at: feature.createdAt,
      priority: feature.priority,
      status: feature.status,
    })),
    organizations: userData.memberships.map(membership => ({
      organization_name: membership.organization.name,
      role: membership.role,
      joined_at: membership.createdAt,
    }))
  }
  
  return portableData
}

const eraseUserData = async (userId: string) => {
  // This is a complex operation that needs careful consideration
  // Some data might need to be retained for legal/business reasons
  
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  
  if (!user) {
    throw new Error('User not found')
  }
  
  // 1. Anonymize instead of delete where business continuity is needed
  const anonymizedData = anonymizeUserData(user)
  
  // 2. Delete personal data
  await prisma.$transaction(async (tx) => {
    // Delete or anonymize user-generated content
    await tx.idea.updateMany({
      where: { authorId: userId },
      data: {
        authorId: null,
        // Keep the content but remove personal attribution
      }
    })
    
    await tx.feature.updateMany({
      where: { authorId: userId },
      data: {
        authorId: null,
      }
    })
    
    // Delete personal sessions and activities
    await tx.sessionActivity.deleteMany({
      where: { userId }
    })
    
    // Update user record with anonymized data
    await tx.user.update({
      where: { id: userId },
      data: {
        email: anonymizedData.email,
        name: anonymizedData.name,
        password: null,
        mfaSecret: null,
        isActive: false,
        deletedAt: new Date(),
      }
    })
  })
  
  // Log the erasure request
  await logSecurityEvent({
    type: SecurityEventType.DATA_EXPORT,
    userId,
    metadata: { requestType: 'erasure' },
    severity: 'MEDIUM'
  })
  
  return { success: true, message: 'User data has been erased' }
}

// Data retention policy
export const enforceDataRetention = async () => {
  const retentionPeriod = 7 * 365 * 24 * 60 * 60 * 1000 // 7 years in milliseconds
  const cutoffDate = new Date(Date.now() - retentionPeriod)
  
  // Delete old audit logs
  await prisma.auditLog.deleteMany({
    where: {
      timestamp: { lt: cutoffDate }
    }
  })
  
  // Delete old session activities
  await prisma.sessionActivity.deleteMany({
    where: {
      timestamp: { lt: cutoffDate }
    }
  })
  
  // Archive old security logs
  const oldSecurityLogs = await prisma.securityLog.findMany({
    where: {
      timestamp: { lt: cutoffDate }
    }
  })
  
  // Move to archive storage (implementation depends on your setup)
  // await archiveSecurityLogs(oldSecurityLogs)
  
  await prisma.securityLog.deleteMany({
    where: {
      timestamp: { lt: cutoffDate }
    }
  })
  
  console.log(`Data retention cleanup completed. Removed records older than ${cutoffDate}`)
}

// Run retention cleanup monthly
if (process.env.NODE_ENV === 'production') {
  setInterval(enforceDataRetention, 30 * 24 * 60 * 60 * 1000) // Every 30 days
}
```

## Security Testing

### Automated Security Tests

```typescript
// tests/security/auth.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { testClient } from '../utils/test-client'
import { createTestUser, cleanupTestData } from '../utils/test-helpers'

describe('Authentication Security', () => {
  beforeEach(async () => {
    await cleanupTestData()
  })
  
  it('should prevent brute force attacks', async () => {
    const email = 'test@example.com'
    const wrongPassword = 'wrongpassword'
    
    // Attempt multiple failed logins
    const attempts = []
    for (let i = 0; i < 6; i++) {
      attempts.push(
        testClient.post('/api/auth/signin', {
          email,
          password: wrongPassword
        })
      )
    }
    
    const responses = await Promise.all(attempts)
    
    // After 5 failed attempts, should be rate limited
    expect(responses[5].status).toBe(429)
    expect(responses[5].data.error).toContain('Too many requests')
  })
  
  it('should enforce strong password requirements', async () => {
    const weakPasswords = [
      '123456',
      'password',
      'abc123',
      'Password', // Missing special character
      'password123', // Missing uppercase
      'PASSWORD123!', // Missing lowercase
    ]
    
    for (const password of weakPasswords) {
      const response = await testClient.post('/api/auth/signup', {
        email: 'test@example.com',
        password,
        name: 'Test User'
      })
      
      expect(response.status).toBe(400)
      expect(response.data.errors).toBeDefined()
    }
  })
  
  it('should prevent session fixation', async () => {
    // Create a user and get initial session
    const user = await createTestUser()
    const loginResponse = await testClient.post('/api/auth/signin', {
      email: user.email,
      password: 'TestPassword123!'
    })
    
    const initialSessionId = loginResponse.headers['set-cookie']?.[0]
    
    // Logout and login again
    await testClient.post('/api/auth/signout')
    
    const secondLoginResponse = await testClient.post('/api/auth/signin', {
      email: user.email,
      password: 'TestPassword123!'
    })
    
    const newSessionId = secondLoginResponse.headers['set-cookie']?.[0]
    
    // Session ID should be different
    expect(newSessionId).not.toBe(initialSessionId)
  })
  
  it('should validate JWT tokens properly', async () => {
    const user = await createTestUser()
    
    // Test with invalid JWT
    const invalidTokens = [
      'invalid.jwt.token',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
      '', // Empty token
      'Bearer invalid-token'
    ]
    
    for (const token of invalidTokens) {
      const response = await testClient.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      expect(response.status).toBe(401)
    }
  })
})

describe('Authorization Security', () => {
  it('should enforce role-based access control', async () => {
    const owner = await createTestUser({ role: 'OWNER' })
    const member = await createTestUser({ role: 'MEMBER' })
    const viewer = await createTestUser({ role: 'VIEWER' })
    
    // Test organization management (OWNER only)
    const ownerClient = testClient.withAuth(owner.token)
    const memberClient = testClient.withAuth(member.token)
    const viewerClient = testClient.withAuth(viewer.token)
    
    const orgData = { name: 'Test Org', description: 'Test' }
    
    // Owner should be able to create organization
    const ownerResponse = await ownerClient.post('/api/organizations', orgData)
    expect(ownerResponse.status).toBe(201)
    
    // Member should not be able to create organization
    const memberResponse = await memberClient.post('/api/organizations', orgData)
    expect(memberResponse.status).toBe(403)
    
    // Viewer should not be able to create organization
    const viewerResponse = await viewerClient.post('/api/organizations', orgData)
    expect(viewerResponse.status).toBe(403)
  })
  
  it('should prevent privilege escalation', async () => {
    const member = await createTestUser({ role: 'MEMBER' })
    const memberClient = testClient.withAuth(member.token)
    
    // Try to update own role to OWNER
    const response = await memberClient.patch('/api/user/profile', {
      role: 'OWNER'
    })
    
    expect(response.status).toBe(403)
  })
})

describe('Input Validation Security', () => {
  it('should prevent XSS attacks', async () => {
    const user = await createTestUser()
    const client = testClient.withAuth(user.token)
    
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src="x" onerror="alert(1)">',
      '{{constructor.constructor("alert(1)")()}}',
      '<svg onload="alert(1)">',
    ]
    
    for (const payload of xssPayloads) {
      const response = await client.post('/api/ideas', {
        title: payload,
        description: 'Test description',
        impact: 5,
        effort: 5,
        confidence: 5,
        productId: 'test-product-id'
      })
      
      // Should either reject the input or sanitize it
      if (response.status === 201) {
        expect(response.data.idea.title).not.toContain('<script>')
        expect(response.data.idea.title).not.toContain('javascript:')
      } else {
        expect(response.status).toBe(400)
      }
    }
  })
  
  it('should prevent SQL injection', async () => {
    const user = await createTestUser()
    const client = testClient.withAuth(user.token)
    
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; UPDATE users SET role='OWNER' WHERE id='1'; --",
      "' UNION SELECT * FROM users --",
    ]
    
    for (const payload of sqlPayloads) {
      const response = await client.get(`/api/search?q=${encodeURIComponent(payload)}`)
      
      // Should not cause database errors or return unauthorized data
      expect(response.status).not.toBe(500)
      if (response.status === 200) {
        expect(response.data).not.toContain('users')
        expect(response.data).not.toContain('password')
      }
    }
  })
  
  it('should validate file uploads', async () => {
    const user = await createTestUser()
    const client = testClient.withAuth(user.token)
    
    // Test malicious file types
    const maliciousFiles = [
      { name: 'malware.exe', type: 'application/x-executable' },
      { name: 'script.php', type: 'application/x-php' },
      { name: 'shell.sh', type: 'application/x-sh' },
      { name: 'large-file.txt', size: 50 * 1024 * 1024 }, // 50MB
    ]
    
    for (const file of maliciousFiles) {
      const formData = new FormData()
      formData.append('file', new Blob(['test content']), file.name)
      
      const response = await client.post('/api/upload', formData)
      expect(response.status).toBe(400)
    }
  })
})
```

### Penetration Testing

```bash
#!/bin/bash
# scripts/security-scan.sh

echo "Running security scans for ProdMatic..."

# 1. Dependency vulnerability scan
echo "Checking for vulnerable dependencies..."
npm audit --audit-level=moderate

# 2. Static code analysis
echo "Running static security analysis..."
npx eslint . --ext .ts,.tsx --config .eslintrc.security.js

# 3. Secret detection
echo "Scanning for secrets in code..."
git secrets --scan

# 4. Docker security scan (if using Docker)
if [ -f "Dockerfile" ]; then
  echo "Scanning Docker image for vulnerabilities..."
  docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
    -v $(pwd):/src aquasec/trivy fs /src
fi

# 5. OWASP ZAP baseline scan
echo "Running OWASP ZAP baseline scan..."
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3000 -J zap-report.json

echo "Security scan completed. Check reports for issues."
```

### Security Checklist

#### Pre-deployment Security Checklist

- [ ] **Authentication & Authorization**
  - [ ] Strong password policy enforced
  - [ ] Multi-factor authentication available
  - [ ] Session management secure
  - [ ] Role-based access control implemented
  - [ ] API key management secure

- [ ] **Data Protection**
  - [ ] Sensitive data encrypted at rest
  - [ ] Data in transit encrypted (HTTPS/TLS)
  - [ ] Database connections encrypted
  - [ ] PII data properly handled
  - [ ] Data backup encrypted

- [ ] **Input Validation**
  - [ ] All user inputs validated
  - [ ] XSS prevention implemented
  - [ ] SQL injection prevention
  - [ ] File upload restrictions
  - [ ] Rate limiting configured

- [ ] **Infrastructure Security**
  - [ ] Security headers configured
  - [ ] CORS properly configured
  - [ ] Environment variables secured
  - [ ] Secrets management implemented
  - [ ] Network security configured

- [ ] **Monitoring & Logging**
  - [ ] Security event logging
  - [ ] Intrusion detection system
  - [ ] Error monitoring
  - [ ] Audit trail complete
  - [ ] Alerting configured

- [ ] **Compliance**
  - [ ] GDPR compliance implemented
  - [ ] Data retention policies
  - [ ] Privacy policy updated
  - [ ] Terms of service current
  - [ ] Cookie consent implemented

- [ ] **Testing**
  - [ ] Security tests passing
  - [ ] Penetration testing completed
  - [ ] Vulnerability scan clean
  - [ ] Code review completed
  - [ ] Third-party security audit

#### Ongoing Security Maintenance

- [ ] **Regular Updates**
  - [ ] Dependencies updated monthly
  - [ ] Security patches applied promptly
  - [ ] Operating system updates
  - [ ] Third-party service updates

- [ ] **Monitoring**
  - [ ] Security logs reviewed weekly
  - [ ] Incident response plan tested
  - [ ] Backup restoration tested
  - [ ] Access reviews quarterly

- [ ] **Training**
  - [ ] Security awareness training
  - [ ] Incident response training
  - [ ] Secure coding practices
  - [ ] Social engineering awareness

## Security Resources

### Documentation
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Next.js Security Guidelines](https://nextjs.org/docs/advanced-features/security-headers)
- [Prisma Security Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance)

### Tools
- **Static Analysis**: ESLint Security Plugin, SonarQube
- **Dependency Scanning**: npm audit, Snyk, WhiteSource
- **Secret Detection**: git-secrets, TruffleHog
- **Penetration Testing**: OWASP ZAP, Burp Suite
- **Monitoring**: Sentry, DataDog, New Relic

### Emergency Contacts
- **Security Team**: security@prodmatic.com
- **Incident Response**: incident@prodmatic.com
- **Legal/Compliance**: legal@prodmatic.com

---

This security guide should be reviewed and updated regularly as new threats emerge and the application evolves. Security is an ongoing process, not a one-time implementation.

**Remember**: Security is everyone's responsibility. All team members should be familiar with these guidelines and follow secure development practices.