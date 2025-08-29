# ProdMatic Development Guide

This guide provides comprehensive instructions for setting up, developing, testing, and contributing to the ProdMatic codebase.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment](#development-environment)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Testing](#testing)
6. [Debugging](#debugging)
7. [Code Quality](#code-quality)
8. [Database Management](#database-management)
9. [API Development](#api-development)
10. [Frontend Development](#frontend-development)
11. [Deployment](#deployment)
12. [Contributing](#contributing)
13. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- **Node.js**: Version 24.6.0 or higher
- **npm**: Version 10.8.2 or higher
- **PostgreSQL**: Version 14 or higher
- **Git**: Latest version
- **Docker** (optional): For containerized development

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/your-org/prodmatic.git
cd prodmatic

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Set up the database
npm run db:setup

# Start development server
npm run dev
```

### Environment Configuration

Create `.env.local` with the following variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/prodmatic_dev"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Email (optional)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@prodmatic.com"

# External APIs (optional)
OPENAI_API_KEY="your-openai-key"
SLACK_CLIENT_ID="your-slack-client-id"
SLACK_CLIENT_SECRET="your-slack-client-secret"
```

## Development Environment

### IDE Setup

**Recommended: Visual Studio Code**

Install these extensions:
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "prisma.prisma",
    "ms-playwright.playwright",
    "vitest.explorer"
  ]
}
```

**VS Code Settings** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

### Development Scripts

```bash
# Development
npm run dev              # Start development server
npm run dev:debug        # Start with debugging enabled
npm run dev:turbo        # Start with Turbo mode

# Building
npm run build            # Build for production
npm run build:analyze    # Build with bundle analyzer
npm start               # Start production server

# Database
npm run db:setup         # Initialize database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed with sample data
npm run db:reset         # Reset database
npm run db:studio        # Open Prisma Studio

# Testing
npm run test             # Run unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run test:e2e         # Run end-to-end tests
npm run test:e2e:ui      # Run E2E tests with UI

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run type-check       # Run TypeScript checks
npm run format           # Format code with Prettier
```

## Project Structure

```
prodmatic/
├── .github/             # GitHub workflows and templates
├── .next/               # Next.js build output
├── .vscode/             # VS Code configuration
├── docs/                # Documentation
├── e2e/                 # End-to-end tests
├── prisma/              # Database schema and migrations
├── public/              # Static assets
├── scripts/             # Utility scripts
├── src/                 # Source code
│   ├── app/             # Next.js App Router
│   │   ├── (auth)/      # Authentication routes
│   │   ├── api/         # API routes
│   │   ├── orgs/        # Organization routes
│   │   └── globals.css  # Global styles
│   ├── components/      # React components
│   │   ├── ui/          # Base UI components
│   │   └── ...          # Feature components
│   ├── lib/             # Utility libraries
│   │   ├── auth.ts      # Authentication helpers
│   │   ├── db.ts        # Database client
│   │   ├── utils.ts     # General utilities
│   │   └── validations/ # Zod schemas
│   ├── server/          # Server-side code
│   │   └── actions/     # Server actions
│   └── types/           # TypeScript type definitions
├── .env.example         # Environment variables template
├── .eslintrc.json       # ESLint configuration
├── .gitignore           # Git ignore rules
├── .prettierrc          # Prettier configuration
├── next.config.js       # Next.js configuration
├── package.json         # Dependencies and scripts
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── vitest.config.ts     # Vitest configuration
```

### Key Directories

- **`src/app/`**: Next.js App Router with file-based routing
- **`src/components/`**: Reusable React components
- **`src/lib/`**: Utility functions and configurations
- **`src/server/actions/`**: Server-side business logic
- **`prisma/`**: Database schema and seed data
- **`e2e/`**: Playwright end-to-end tests

## Development Workflow

### Branch Strategy

```bash
# Main branches
main        # Production-ready code
develop     # Integration branch

# Feature branches
feature/user-authentication
feature/product-analytics
feature/okr-tracking

# Bug fix branches
bugfix/login-redirect
bugfix/data-export

# Release branches
release/v1.2.0
```

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format
<type>[optional scope]: <description>

# Examples
feat(auth): add Google OAuth integration
fix(db): resolve migration rollback issue
docs(api): update server actions documentation
refactor(ui): improve button component variants
test(e2e): add product creation flow tests
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code following our style guide
   - Add tests for new functionality
   - Update documentation if needed

3. **Run Quality Checks**
   ```bash
   npm run lint
   npm run type-check
   npm run test
   npm run test:e2e
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(products): add lifecycle tracking"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create PR through GitHub UI
   ```

6. **PR Requirements**
   - [ ] All tests pass
   - [ ] Code coverage maintained
   - [ ] Documentation updated
   - [ ] No TypeScript errors
   - [ ] Approved by code reviewer

## Testing

### Unit Testing with Vitest

**Configuration** (`vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**Test Setup** (`src/test/setup.ts`):
```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/test',
}))

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))
```

**Example Component Test**:
```typescript
// src/components/ui/button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './button'

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies variant styles correctly', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-destructive')
  })
})
```

**Server Action Testing**:
```typescript
// src/server/actions/products.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createProduct } from './products'
import { prisma } from '@/lib/db'

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    product: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

// Mock auth
vi.mock('@/lib/auth-helpers', () => ({
  getCurrentUser: vi.fn(() => Promise.resolve({ id: 'user-1' })),
  requireRole: vi.fn(() => Promise.resolve(true)),
}))

describe('createProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a product successfully', async () => {
    const mockProduct = {
      id: 'product-1',
      name: 'Test Product',
      key: 'test-product',
      organizationId: 'org-1',
    }

    vi.mocked(prisma.product.create).mockResolvedValue(mockProduct)

    const formData = new FormData()
    formData.append('name', 'Test Product')
    formData.append('description', 'A test product')
    formData.append('organizationId', 'org-1')

    const result = await createProduct(formData)

    expect(result.success).toBe(true)
    expect(result.data).toEqual(mockProduct)
    expect(prisma.product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Test Product',
        description: 'A test product',
        organizationId: 'org-1',
      }),
    })
  })
})
```

### End-to-End Testing with Playwright

**Configuration** (`playwright.config.ts`):
```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

**Example E2E Test**:
```typescript
// e2e/product-management.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Product Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/auth/signin')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should create a new product', async ({ page }) => {
    // Navigate to products
    await page.goto('/orgs/demo/products')
    
    // Click create product button
    await page.click('text=Create Product')
    
    // Fill product form
    await page.fill('[name="name"]', 'Test Product')
    await page.fill('[name="description"]', 'A product for testing')
    await page.selectOption('[name="lifecycle"]', 'IDEATION')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Verify product was created
    await expect(page).toHaveURL(/\/orgs\/demo\/products\/test-product/)
    await expect(page.locator('h1')).toContainText('Test Product')
  })

  test('should navigate product lifecycle', async ({ page }) => {
    await page.goto('/orgs/demo/products/test-product')
    
    // Move to next lifecycle stage
    await page.click('[data-testid="lifecycle-actions"]')
    await page.click('text=Move to Discovery')
    
    // Confirm lifecycle change
    await expect(page.locator('[data-testid="lifecycle-badge"]'))
      .toContainText('Discovery')
  })
})
```

### Test Data Management

**Database Setup for Tests**:
```typescript
// src/test/db-setup.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function setupTestDb() {
  // Clean database
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.product.deleteMany(),
    prisma.organization.deleteMany(),
    prisma.user.deleteMany(),
  ])

  // Create test data
  const testUser = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
    },
  })

  const testOrg = await prisma.organization.create({
    data: {
      name: 'Test Organization',
      slug: 'test-org',
    },
  })

  await prisma.membership.create({
    data: {
      userId: testUser.id,
      organizationId: testOrg.id,
      role: 'ADMIN',
    },
  })

  return { testUser, testOrg }
}

export async function cleanupTestDb() {
  await prisma.$disconnect()
}
```

## Debugging

### Development Debugging

**VS Code Debug Configuration** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    }
  ]
}
```

**Server-Side Debugging**:
```bash
# Start with debugging enabled
NODE_OPTIONS='--inspect' npm run dev

# Or use the debug script
npm run dev:debug
```

**Client-Side Debugging**:
```typescript
// Use React Developer Tools
// Add debugging statements
console.log('Debug info:', { user, products })

// Use debugger statement
if (process.env.NODE_ENV === 'development') {
  debugger
}
```

### Database Debugging

**Prisma Studio**:
```bash
npm run db:studio
# Opens at http://localhost:5555
```

**Query Logging**:
```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
```

**SQL Query Analysis**:
```typescript
// Enable query logging in development
const result = await prisma.product.findMany({
  where: { organizationId },
  include: { _count: { select: { ideas: true } } },
})

// Check generated SQL
console.log('Generated SQL:', prisma.$queryRaw`
  SELECT * FROM "Product" WHERE "organizationId" = ${organizationId}
`)
```

### Performance Debugging

**Next.js Bundle Analyzer**:
```bash
npm run build:analyze
```

**React Profiler**:
```typescript
import { Profiler } from 'react'

function onRenderCallback(id, phase, actualDuration) {
  console.log('Profiler:', { id, phase, actualDuration })
}

export function ProfiledComponent({ children }) {
  return (
    <Profiler id="ProductList" onRender={onRenderCallback}>
      {children}
    </Profiler>
  )
}
```

**Database Performance**:
```typescript
// Monitor slow queries
const startTime = Date.now()
const result = await prisma.product.findMany(/* ... */)
const duration = Date.now() - startTime

if (duration > 1000) {
  console.warn(`Slow query detected: ${duration}ms`)
}
```

## Code Quality

### ESLint Configuration

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### Prettier Configuration

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### TypeScript Best Practices

```typescript
// Use strict types
interface ProductFormData {
  name: string
  description?: string
  lifecycle: Lifecycle
  organizationId: string
}

// Avoid any, use unknown instead
function processApiResponse(data: unknown) {
  if (typeof data === 'object' && data !== null) {
    // Type narrowing
  }
}

// Use branded types for IDs
type ProductId = string & { __brand: 'ProductId' }
type OrganizationId = string & { __brand: 'OrganizationId' }

// Use const assertions
const LIFECYCLE_STAGES = [
  'IDEATION',
  'DISCOVERY',
  'DEFINITION',
] as const

type LifecycleStage = typeof LIFECYCLE_STAGES[number]
```

### Code Review Checklist

- [ ] **Functionality**: Code works as expected
- [ ] **Tests**: Adequate test coverage
- [ ] **Performance**: No obvious performance issues
- [ ] **Security**: No security vulnerabilities
- [ ] **Accessibility**: UI components are accessible
- [ ] **Types**: Proper TypeScript usage
- [ ] **Documentation**: Code is well-documented
- [ ] **Consistency**: Follows project conventions

## Database Management

### Migrations

```bash
# Create migration
npx prisma migrate dev --name add_lifecycle_tracking

# Apply migrations
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Generate Prisma client
npx prisma generate
```

### Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create organizations
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo',
      description: 'Demo organization for testing',
    },
  })

  // Create products
  await prisma.product.upsert({
    where: { key: 'demo-product' },
    update: {},
    create: {
      name: 'Demo Product',
      key: 'demo-product',
      description: 'A sample product',
      organizationId: demoOrg.id,
      lifecycle: 'IDEATION',
    },
  })

  console.log('Database seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

### Backup and Restore

```bash
# Backup database
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql

# Export data as JSON
npx prisma db seed --preview-feature
```

## API Development

### Server Actions

```typescript
// src/server/actions/products.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getCurrentUser, requireRole } from '@/lib/auth-helpers'
import { createAuditLog } from '@/lib/audit'

const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  lifecycle: z.enum(['IDEATION', 'DISCOVERY', 'DEFINITION']),
  organizationId: z.string(),
})

export async function createProduct(formData: FormData) {
  try {
    // Authentication
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    // Validation
    const data = createProductSchema.parse({
      name: formData.get('name'),
      description: formData.get('description'),
      lifecycle: formData.get('lifecycle'),
      organizationId: formData.get('organizationId'),
    })

    // Authorization
    await requireRole(data.organizationId, ['ADMIN', 'PRODUCT_MANAGER'])

    // Business logic
    const product = await prisma.product.create({
      data: {
        ...data,
        key: generateProductKey(data.name),
      },
    })

    // Audit logging
    await createAuditLog({
      action: 'product.created',
      entityType: 'Product',
      entityId: product.id,
      userId: user.id,
      organizationId: data.organizationId,
      metadata: { productName: product.name },
    })

    // Revalidate cache
    revalidatePath(`/orgs/${data.organizationId}/products`)

    return { success: true, data: product }
  } catch (error) {
    console.error('Error creating product:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

function generateProductKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
```

### API Routes

```typescript
// src/app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const querySchema = z.object({
  organizationId: z.string(),
  lifecycle: z.enum(['IDEATION', 'DISCOVERY', 'DEFINITION']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = querySchema.parse({
      organizationId: searchParams.get('organizationId'),
      lifecycle: searchParams.get('lifecycle'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    })

    const products = await prisma.product.findMany({
      where: {
        organizationId: query.organizationId,
        lifecycle: query.lifecycle,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            ideas: true,
            features: true,
            releases: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    })

    const total = await prisma.product.count({
      where: {
        organizationId: query.organizationId,
        lifecycle: query.lifecycle,
        deletedAt: null,
      },
    })

    return NextResponse.json({
      products,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## Frontend Development

### Component Development

```typescript
// src/components/product-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Product, Lifecycle } from '@prisma/client'
import Link from 'next/link'

interface ProductCardProps {
  product: Product & {
    _count: {
      ideas: number
      features: number
      releases: number
    }
  }
  organizationSlug: string
}

const lifecycleColors: Record<Lifecycle, string> = {
  IDEATION: 'bg-blue-100 text-blue-800',
  DISCOVERY: 'bg-yellow-100 text-yellow-800',
  DEFINITION: 'bg-purple-100 text-purple-800',
  DELIVERY: 'bg-orange-100 text-orange-800',
  LAUNCH: 'bg-green-100 text-green-800',
  GROWTH: 'bg-emerald-100 text-emerald-800',
  MATURITY: 'bg-gray-100 text-gray-800',
  SUNSET: 'bg-red-100 text-red-800',
}

export function ProductCard({ product, organizationSlug }: ProductCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold">
            <Link 
              href={`/orgs/${organizationSlug}/products/${product.key}`}
              className="hover:text-blue-600 transition-colors"
            >
              {product.name}
            </Link>
          </CardTitle>
          <Badge 
            variant="secondary" 
            className={lifecycleColors[product.lifecycle]}
          >
            {product.lifecycle}
          </Badge>
        </div>
        {product.description && (
          <p className="text-sm text-muted-foreground mt-2">
            {product.description}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex space-x-4 text-sm text-muted-foreground">
            <span>{product._count.ideas} ideas</span>
            <span>{product._count.features} features</span>
            <span>{product._count.releases} releases</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/orgs/${organizationSlug}/products/${product.key}`}>
              View Details
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

### Form Handling

```typescript
// src/components/product-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { createProduct } from '@/server/actions/products'
import { toast } from 'sonner'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  lifecycle: z.enum(['IDEATION', 'DISCOVERY', 'DEFINITION']),
})

type FormData = z.infer<typeof formSchema>

interface ProductFormProps {
  organizationId: string
  organizationSlug: string
}

export function ProductForm({ organizationId, organizationSlug }: ProductFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      lifecycle: 'IDEATION',
    },
  })

  async function onSubmit(data: FormData) {
    setIsLoading(true)
    
    const formData = new FormData()
    formData.append('name', data.name)
    formData.append('description', data.description || '')
    formData.append('lifecycle', data.lifecycle)
    formData.append('organizationId', organizationId)

    try {
      const result = await createProduct(formData)
      
      if (result.success) {
        toast.success('Product created successfully')
        router.push(`/orgs/${organizationSlug}/products/${result.data.key}`)
      } else {
        toast.error(result.error || 'Failed to create product')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter product name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your product" 
                  rows={3}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lifecycle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lifecycle Stage</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lifecycle stage" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="IDEATION">Ideation</SelectItem>
                  <SelectItem value="DISCOVERY">Discovery</SelectItem>
                  <SelectItem value="DEFINITION">Definition</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
```

## Deployment

### Environment Setup

```bash
# Production environment variables
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@host:5432/prodmatic_prod"
NEXTAUTH_URL="https://prodmatic.com"
NEXTAUTH_SECRET="your-production-secret"

# Build and start
npm run build
npm start
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run linting
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
      
      - name: Build application
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to production
        run: |
          # Add your deployment commands here
          echo "Deploying to production..."
```

## Contributing

### Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/prodmatic.git
   ```
3. **Set up development environment** (see [Getting Started](#getting-started))
4. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Contribution Guidelines

- **Code Style**: Follow existing patterns and use provided linting rules
- **Testing**: Add tests for new features and bug fixes
- **Documentation**: Update documentation for API changes
- **Commit Messages**: Use conventional commit format
- **Pull Requests**: Provide clear description and link related issues

### Issue Reporting

When reporting issues, please include:
- **Environment**: OS, Node.js version, browser
- **Steps to reproduce**: Clear reproduction steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Screenshots**: If applicable

## Troubleshooting

### Common Issues

**Database Connection Issues**:
```bash
# Check database connection
npx prisma db pull

# Reset database if corrupted
npm run db:reset
```

**Build Errors**:
```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules package-lock.json
npm install
```

**TypeScript Errors**:
```bash
# Regenerate Prisma client
npx prisma generate

# Check TypeScript configuration
npx tsc --noEmit
```

**Authentication Issues**:
```bash
# Verify environment variables
echo $NEXTAUTH_SECRET
echo $NEXTAUTH_URL

# Clear browser cookies and localStorage
```

### Performance Issues

**Slow Database Queries**:
```typescript
// Add database query logging
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

// Use database indexes
// Check EXPLAIN ANALYZE for slow queries
```

**Large Bundle Size**:
```bash
# Analyze bundle
npm run build:analyze

# Use dynamic imports for large components
const HeavyComponent = dynamic(() => import('./HeavyComponent'))
```

### Getting Help

- **Documentation**: Check existing docs first
- **GitHub Issues**: Search existing issues
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our development Discord server

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Playwright Documentation](https://playwright.dev)
- [Vitest Documentation](https://vitest.dev)

For additional help, please refer to our [GitHub repository](https://github.com/your-org/prodmatic) or contact the development team.
