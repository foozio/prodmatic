# ProdMatic API Documentation

This document provides comprehensive documentation for all API endpoints, server actions, and their usage in the ProdMatic application.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Routes](#api-routes)
4. [Server Actions](#server-actions)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Examples](#examples)

## Overview

ProdMatic uses a hybrid approach combining Next.js API routes and React Server Actions for backend functionality. Server Actions provide type-safe, CSRF-protected mutations, while API routes handle external integrations and webhooks.

### Base URL
```
Production: https://your-domain.com
Development: http://localhost:3000
```

### Content Types
- Server Actions: `multipart/form-data` (automatic)
- API Routes: `application/json`

## Authentication

### NextAuth.js Integration
Authentication is handled through NextAuth.js with multiple providers:

```typescript
// Supported providers
interface AuthProviders {
  credentials: EmailPasswordProvider;
  google: GoogleOAuthProvider;
  github: GitHubOAuthProvider;
}
```

### Session Management
```typescript
// Get current user session
import { getCurrentUser } from '@/lib/auth-helpers';

const user = await getCurrentUser();
if (!user) {
  redirect('/auth/signin');
}
```

### Role-Based Access Control
```typescript
// Require specific role
import { requireRole } from '@/lib/auth-helpers';

await requireRole(['ADMIN', 'PRODUCT_MANAGER']);
```

## API Routes

### Authentication Routes

#### `POST /api/auth/[...nextauth]`
Handles all NextAuth.js authentication flows.

**Endpoints:**
- `/api/auth/signin` - Sign in page
- `/api/auth/signout` - Sign out
- `/api/auth/callback/[provider]` - OAuth callbacks
- `/api/auth/session` - Get current session

### Health Check

#### `GET /api/health`
Returns application health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-25T10:00:00Z",
  "version": "1.0.0"
}
```

### Organizations

#### `GET /api/organizations`
Retrieve organizations for the current user.

**Response:**
```json
{
  "organizations": [
    {
      "id": "org_123",
      "name": "TechCorp Solutions",
      "slug": "techcorp",
      "role": "ADMIN"
    }
  ]
}
```

## Server Actions

Server Actions provide type-safe backend operations with automatic CSRF protection.

### Organizations Actions

#### `createOrganization`
```typescript
import { createOrganization } from '@/server/actions/organizations';

// Usage in component
const handleSubmit = async (formData: FormData) => {
  const result = await createOrganization(formData);
  if (result.success) {
    // Handle success
  }
};
```

**Parameters:**
- `name` (string): Organization name
- `slug` (string): URL-friendly identifier
- `description` (string, optional): Organization description

**Returns:**
```typescript
type ActionResult = {
  success: boolean;
  data?: Organization;
  error?: string;
}
```

#### `updateOrganization`
```typescript
import { updateOrganization } from '@/server/actions/organizations';

const result = await updateOrganization(formData);
```

**Parameters:**
- `id` (string): Organization ID
- `name` (string, optional): Updated name
- `description` (string, optional): Updated description
- `settings` (JSON, optional): Organization settings

### Products Actions

#### `createProduct`
```typescript
import { createProduct } from '@/server/actions/products';

const result = await createProduct(formData);
```

**Parameters:**
- `name` (string): Product name
- `key` (string): Unique product identifier
- `description` (string, optional): Product description
- `vision` (string, optional): Product vision statement
- `organizationId` (string): Parent organization ID

#### `updateProductLifecycle`
```typescript
import { updateProductLifecycle } from '@/server/actions/products';

const result = await updateProductLifecycle(formData);
```

**Parameters:**
- `productId` (string): Product ID
- `lifecycle` (Lifecycle): New lifecycle stage

**Lifecycle Stages:**
- `IDEATION`
- `DISCOVERY`
- `DEFINITION`
- `DELIVERY`
- `LAUNCH`
- `GROWTH`
- `MATURITY`
- `SUNSET`

### Ideas Actions

#### `createIdea`
```typescript
import { createIdea } from '@/server/actions/ideas';

const result = await createIdea(formData);
```

**Parameters:**
- `title` (string): Idea title
- `description` (string): Detailed description
- `productId` (string): Associated product ID
- `priority` (number): Priority score (1-100)
- `effort` (number): Effort estimate (1-10)
- `impact` (number): Impact score (1-10)
- `confidence` (number): Confidence level (1-10)

#### `scoreIdea`
```typescript
import { scoreIdea } from '@/server/actions/ideas';

const result = await scoreIdea(formData);
```

**Scoring Methods:**
- `RICE`: Reach × Impact × Confidence ÷ Effort
- `ICE`: Impact × Confidence × Ease
- `WSJF`: (Business Value + Time Criticality + Risk Reduction) ÷ Job Size

### Features Actions

#### `createFeature`
```typescript
import { createFeature } from '@/server/actions/features';

const result = await createFeature(formData);
```

**Parameters:**
- `title` (string): Feature title
- `description` (string): Feature description
- `productId` (string): Associated product ID
- `epicId` (string, optional): Parent epic ID
- `status` (FeatureStatus): Current status
- `priority` (Priority): Feature priority

**Feature Statuses:**
- `BACKLOG`
- `IN_PROGRESS`
- `IN_REVIEW`
- `DONE`
- `CANCELLED`

### Releases Actions

#### `createRelease`
```typescript
import { createRelease } from '@/server/actions/releases';

const result = await createRelease(formData);
```

**Parameters:**
- `name` (string): Release name
- `version` (string): Version number
- `productId` (string): Associated product ID
- `targetDate` (Date): Planned release date
- `type` (ReleaseType): Release type

**Release Types:**
- `MAJOR`
- `MINOR`
- `PATCH`
- `HOTFIX`

#### `publishRelease`
```typescript
import { publishRelease } from '@/server/actions/releases';

const result = await publishRelease(formData);
```

### OKRs Actions

#### `createOKR`
```typescript
import { createOKR } from '@/server/actions/okrs';

const result = await createOKR(formData);
```

**Parameters:**
- `title` (string): Objective title
- `description` (string): Objective description
- `productId` (string): Associated product ID
- `quarter` (string): Target quarter (e.g., "2024-Q1")
- `keyResults` (KeyResult[]): Array of key results

**Key Result Structure:**
```typescript
interface KeyResult {
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
}
```

### Documents Actions

#### `createDocument`
```typescript
import { createDocument } from '@/server/actions/documents';

const result = await createDocument(formData);
```

**Parameters:**
- `title` (string): Document title
- `content` (string): Document content (Markdown)
- `type` (DocumentType): Document type
- `productId` (string, optional): Associated product ID
- `organizationId` (string): Organization ID

**Document Types:**
- `PRD` (Product Requirements Document)
- `RFC` (Request for Comments)
- `SPEC` (Technical Specification)
- `GUIDE` (User Guide)
- `POLICY` (Policy Document)

### Teams Actions

#### `createTeam`
```typescript
import { createTeam } from '@/server/actions/teams';

const result = await createTeam(formData);
```

**Parameters:**
- `name` (string): Team name
- `slug` (string): URL-friendly identifier
- `description` (string, optional): Team description
- `organizationId` (string): Parent organization ID

#### `addTeamMember`
```typescript
import { addTeamMember } from '@/server/actions/teams';

const result = await addTeamMember(formData);
```

**Parameters:**
- `teamId` (string): Team ID
- `userId` (string): User ID to add
- `role` (Role): Member role

**Roles:**
- `ADMIN`
- `PRODUCT_MANAGER`
- `DEVELOPER`
- `DESIGNER`
- `STAKEHOLDER`

### Experiments Actions

#### `createExperiment`
```typescript
import { createExperiment } from '@/server/actions/experiments';

const result = await createExperiment(formData);
```

**Parameters:**
- `name` (string): Experiment name
- `hypothesis` (string): Experiment hypothesis
- `productId` (string): Associated product ID
- `startDate` (Date): Experiment start date
- `endDate` (Date): Experiment end date
- `metrics` (string[]): Success metrics

### KPIs Actions

#### `createKPI`
```typescript
import { createKPI } from '@/server/actions/kpis';

const result = await createKPI(formData);
```

**Parameters:**
- `name` (string): KPI name
- `description` (string): KPI description
- `productId` (string): Associated product ID
- `targetValue` (number): Target value
- `unit` (string): Measurement unit
- `frequency` (Frequency): Update frequency

**Frequencies:**
- `DAILY`
- `WEEKLY`
- `MONTHLY`
- `QUARTERLY`

## Error Handling

### Server Action Errors
All server actions return a consistent error format:

```typescript
type ActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}
```

### Common Error Codes
- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Input validation failed
- `CONFLICT`: Resource already exists
- `RATE_LIMITED`: Too many requests

### Error Handling Example
```typescript
const handleSubmit = async (formData: FormData) => {
  const result = await createProduct(formData);
  
  if (!result.success) {
    if (result.fieldErrors) {
      // Handle field-specific errors
      setFieldErrors(result.fieldErrors);
    } else {
      // Handle general error
      setError(result.error || 'An error occurred');
    }
    return;
  }
  
  // Handle success
  router.push(`/products/${result.data.key}`);
};
```

## Rate Limiting

### Default Limits
- API Routes: 100 requests per minute per IP
- Server Actions: 1000 requests per minute per user
- Authentication: 5 failed attempts per 15 minutes

### Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Examples

### Creating a Complete Product Workflow

```typescript
// 1. Create organization
const orgResult = await createOrganization(new FormData({
  name: 'My Company',
  slug: 'my-company'
}));

// 2. Create product
const productResult = await createProduct(new FormData({
  name: 'My Product',
  key: 'my-product',
  organizationId: orgResult.data.id
}));

// 3. Create ideas
const ideaResult = await createIdea(new FormData({
  title: 'New Feature Idea',
  description: 'Detailed description',
  productId: productResult.data.id,
  priority: 80
}));

// 4. Convert idea to feature
const featureResult = await createFeature(new FormData({
  title: ideaResult.data.title,
  description: ideaResult.data.description,
  productId: productResult.data.id,
  status: 'BACKLOG'
}));
```

### Handling Form Submissions

```typescript
'use client';

import { useFormState } from 'react-dom';
import { createProduct } from '@/server/actions/products';

export function ProductForm() {
  const [state, formAction] = useFormState(createProduct, {
    success: false
  });

  return (
    <form action={formAction}>
      <input name="name" placeholder="Product name" required />
      <input name="key" placeholder="Product key" required />
      <textarea name="description" placeholder="Description" />
      
      {state.error && (
        <div className="error">{state.error}</div>
      )}
      
      <button type="submit">Create Product</button>
    </form>
  );
}
```

### Using with React Query

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createIdea } from '@/server/actions/ideas';

export function useCreateIdea() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createIdea,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    },
    onError: (error) => {
      console.error('Failed to create idea:', error);
    }
  });
}
```

## Integration with External APIs

### Webhook Endpoints

#### GitHub Integration
```
POST /api/webhooks/github
```

#### Jira Integration
```
POST /api/webhooks/jira
```

#### Slack Integration
```
POST /api/webhooks/slack
```

### Authentication for Webhooks
Webhooks use signature verification:

```typescript
// Verify webhook signature
const signature = request.headers.get('x-hub-signature-256');
const isValid = verifyWebhookSignature(body, signature, secret);
```

---

## Support

For API support and questions:
- Documentation: [docs.prodmatic.com](https://docs.prodmatic.com)
- GitHub Issues: [github.com/prodmatic/prodmatic/issues](https://github.com/prodmatic/prodmatic/issues)
- Email: support@prodmatic.com
