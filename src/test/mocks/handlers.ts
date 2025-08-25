import { http, HttpResponse } from 'msw'

// Mock data
const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  emailVerified: new Date(),
  profile: {
    firstName: 'Test',
    lastName: 'User',
    bio: 'Test user bio',
  },
  memberships: [
    {
      id: 'membership-1',
      role: 'ADMIN',
      organizationId: 'org-1',
      organization: {
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-org',
      },
    },
  ],
}

const mockOrganization = {
  id: 'org-1',
  name: 'Test Organization',
  slug: 'test-org',
  description: 'Test organization description',
  domain: 'test.com',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockProduct = {
  id: 'product-1',
  name: 'Test Product',
  key: 'test-product',
  description: 'Test product description',
  lifecycle: 'DELIVERY',
  organizationId: 'org-1',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockIdea = {
  id: 'idea-1',
  title: 'Test Idea',
  description: 'Test idea description',
  status: 'SUBMITTED',
  priority: 'MEDIUM',
  votes: 5,
  productId: 'product-1',
  creatorId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const handlers = [
  // Auth endpoints
  http.get('/api/auth/session', () => {
    return HttpResponse.json({
      user: mockUser,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  }),

  // User endpoints
  http.get('/api/users/me', () => {
    return HttpResponse.json(mockUser)
  }),

  // Organization endpoints
  http.get('/api/organizations', () => {
    return HttpResponse.json([mockOrganization])
  }),

  http.get('/api/organizations/:orgId', ({ params }) => {
    return HttpResponse.json(mockOrganization)
  }),

  http.post('/api/organizations', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      ...mockOrganization,
      ...body,
      id: 'new-org-id',
    }, { status: 201 })
  }),

  // Product endpoints
  http.get('/api/organizations/:orgId/products', () => {
    return HttpResponse.json([mockProduct])
  }),

  http.get('/api/organizations/:orgId/products/:productKey', () => {
    return HttpResponse.json(mockProduct)
  }),

  http.post('/api/organizations/:orgId/products', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      ...mockProduct,
      ...body,
      id: 'new-product-id',
    }, { status: 201 })
  }),

  // Ideas endpoints
  http.get('/api/organizations/:orgId/products/:productKey/ideas', () => {
    return HttpResponse.json([mockIdea])
  }),

  http.get('/api/organizations/:orgId/products/:productKey/ideas/:ideaId', () => {
    return HttpResponse.json(mockIdea)
  }),

  http.post('/api/organizations/:orgId/products/:productKey/ideas', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      ...mockIdea,
      ...body,
      id: 'new-idea-id',
    }, { status: 201 })
  }),

  http.put('/api/organizations/:orgId/products/:productKey/ideas/:ideaId', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      ...mockIdea,
      ...body,
    })
  }),

  http.delete('/api/organizations/:orgId/products/:productKey/ideas/:ideaId', () => {
    return HttpResponse.json({ success: true })
  }),

  // Features endpoints
  http.get('/api/organizations/:orgId/products/:productKey/features', () => {
    return HttpResponse.json([])
  }),

  // Releases endpoints
  http.get('/api/organizations/:orgId/products/:productKey/releases', () => {
    return HttpResponse.json([])
  }),

  // Analytics endpoints
  http.get('/api/organizations/:orgId/products/:productKey/analytics/kpis', () => {
    return HttpResponse.json([])
  }),

  // Generic error handler
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`)
    return HttpResponse.json(
      { error: `Unhandled ${request.method} request to ${request.url}` },
      { status: 404 }
    )
  }),
]