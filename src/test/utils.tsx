import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { SessionProvider } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock session data for testing
export const mockSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    image: null,
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}

// Mock user data
export const mockUser = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  emailVerified: new Date(),
  profile: {
    firstName: 'Test',
    lastName: 'User',
    bio: 'Test user bio',
    location: 'Test City',
    timezone: 'UTC',
  },
  memberships: [
    {
      id: 'membership-1',
      role: 'ADMIN' as const,
      organizationId: 'org-1',
      organization: {
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-org',
        description: 'Test org description',
        domain: 'test.com',
      },
    },
  ],
}

// Mock organization data
export const mockOrganization = {
  id: 'org-1',
  name: 'Test Organization',
  slug: 'test-org',
  description: 'Test organization description',
  domain: 'test.com',
  settings: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
}

// Mock product data
export const mockProduct = {
  id: 'product-1',
  name: 'Test Product',
  key: 'test-product',
  description: 'Test product description',
  vision: 'Test product vision',
  lifecycle: 'DELIVERY' as const,
  organizationId: 'org-1',
  settings: {},
  metrics: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
}

// Mock idea data
export const mockIdea = {
  id: 'idea-1',
  title: 'Test Idea',
  description: 'Test idea description',
  problem: 'Test problem',
  hypothesis: 'Test hypothesis',
  source: 'User Feedback',
  tags: ['test', 'idea'],
  votes: 5,
  effortScore: 3,
  impactScore: 4,
  reachScore: 5,
  confidenceScore: 4,
  priority: 'MEDIUM' as const,
  status: 'SUBMITTED' as const,
  productId: 'product-1',
  creatorId: 'user-1',
  assigneeId: null,
  convertedToEpicId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
}

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: any
  queryClient?: QueryClient
}

export function renderWithProviders(
  ui: ReactElement,
  {
    session = mockSession,
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    }),
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SessionProvider session={session}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </SessionProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Helper to create mock form data
export function createMockFormData(data: Record<string, string | File>) {
  const formData = new FormData()
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value)
  })
  return formData
}

// Helper to wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Mock fetch for API tests
export function mockFetch(response: any, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
  })
}

// Helper to generate test IDs
export function generateTestId(component: string, element?: string) {
  return element ? `${component}-${element}` : component
}

// Mock Prisma client for server action tests
export function createMockPrismaClient() {
  return {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    product: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    idea: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    membership: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    // Add other models as needed
  }
}

// Helper for testing server actions
export function mockAuthHelpers(user = mockUser) {
  vi.doMock('@/lib/auth-helpers', () => ({
    getCurrentUser: vi.fn().mockResolvedValue(user),
    requireRole: vi.fn().mockResolvedValue({ user, membership: user.memberships[0] }),
    logActivity: vi.fn().mockResolvedValue(undefined),
  }))
}

// Helper for testing form submissions
export function createFormDataFromObject(obj: Record<string, string>) {
  const formData = new FormData()
  Object.entries(obj).forEach(([key, value]) => {
    formData.append(key, value)
  })
  return formData
}

// Custom matchers for testing
export const customMatchers = {
  toHaveFormData: (received: FormData, expected: Record<string, string>) => {
    const pass = Object.entries(expected).every(([key, value]) => {
      return received.get(key) === value
    })
    return {
      pass,
      message: () => 
        pass 
          ? `Expected FormData not to have ${JSON.stringify(expected)}`
          : `Expected FormData to have ${JSON.stringify(expected)}`
    }
  }
}

// Re-export testing library functions
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'