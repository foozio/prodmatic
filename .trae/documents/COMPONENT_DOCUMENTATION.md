# ProdMatic Component Documentation

This document provides comprehensive documentation for all React components in the ProdMatic application, including their props, usage examples, and best practices.

## Table of Contents

1. [Overview](#overview)
2. [UI Components](#ui-components)
3. [Application Components](#application-components)
4. [Layout Components](#layout-components)
5. [Form Components](#form-components)
6. [Data Display Components](#data-display-components)
7. [Component Patterns](#component-patterns)
8. [Testing Components](#testing-components)

## Overview

ProdMatic uses a component-based architecture built on:
- **shadcn/ui**: Base UI primitives
- **Radix UI**: Accessible component foundations
- **TailwindCSS**: Utility-first styling
- **TypeScript**: Type-safe component props

### Component Structure
```
src/components/
├── ui/                 # shadcn/ui base components
├── app-shell.tsx       # Main application layout
├── auth-provider.tsx   # Authentication context
└── [feature]/          # Feature-specific components
```

## UI Components

### Button

**Location:** `src/components/ui/button.tsx`

```typescript
interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
  children: React.ReactNode;
}
```

**Usage:**
```tsx
import { Button } from '@/components/ui/button';

// Basic usage
<Button>Click me</Button>

// With variants
<Button variant="destructive">Delete</Button>
<Button variant="outline" size="sm">Small Button</Button>

// As child component
<Button asChild>
  <Link href="/dashboard">Go to Dashboard</Link>
</Button>
```

**Variants:**
- `default`: Primary blue button
- `destructive`: Red button for dangerous actions
- `outline`: Bordered button with transparent background
- `secondary`: Gray button for secondary actions
- `ghost`: Transparent button with hover effects
- `link`: Text-only button styled as link

### Card

**Location:** `src/components/ui/card.tsx`

```typescript
interface CardProps {
  className?: string;
  children: React.ReactNode;
}

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

interface CardTitleProps {
  className?: string;
  children: React.ReactNode;
}

interface CardDescriptionProps {
  className?: string;
  children: React.ReactNode;
}

interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}
```

**Usage:**
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Product Analytics</CardTitle>
    <CardDescription>View your product performance metrics</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Content goes here...</p>
  </CardContent>
</Card>
```

### Input

**Location:** `src/components/ui/input.tsx`

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}
```

**Usage:**
```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="Enter your email"
    required
  />
</div>
```

### Badge

**Location:** `src/components/ui/badge.tsx`

```typescript
interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
  children: React.ReactNode;
}
```

**Usage:**
```tsx
import { Badge } from '@/components/ui/badge';

<Badge>New</Badge>
<Badge variant="destructive">Urgent</Badge>
<Badge variant="outline">Draft</Badge>
```

### Progress

**Location:** `src/components/ui/progress.tsx`

```typescript
interface ProgressProps {
  value?: number;
  max?: number;
  className?: string;
}
```

**Usage:**
```tsx
import { Progress } from '@/components/ui/progress';

<Progress value={75} max={100} className="w-full" />
```

### Avatar

**Location:** `src/components/ui/avatar.tsx`

```typescript
interface AvatarProps {
  className?: string;
  children: React.ReactNode;
}

interface AvatarImageProps {
  src?: string;
  alt?: string;
  className?: string;
}

interface AvatarFallbackProps {
  className?: string;
  children: React.ReactNode;
}
```

**Usage:**
```tsx
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

<Avatar>
  <AvatarImage src="/avatars/user.jpg" alt="User" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

### Dialog

**Location:** `src/components/ui/dialog.tsx`

```typescript
interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}
```

**Usage:**
```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create New Product</DialogTitle>
      <DialogDescription>
        Enter the details for your new product.
      </DialogDescription>
    </DialogHeader>
    {/* Form content */}
  </DialogContent>
</Dialog>
```

### DataTable

**Location:** `src/components/ui/data-table.tsx`

```typescript
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
}
```

**Usage:**
```tsx
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';

interface Product {
  id: string;
  name: string;
  status: string;
}

const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge>{row.getValue('status')}</Badge>
    ),
  },
];

<DataTable
  columns={columns}
  data={products}
  searchKey="name"
  searchPlaceholder="Search products..."
/>
```

## Application Components

### AppShell

**Location:** `src/components/app-shell.tsx`

```typescript
interface AppShellProps {
  children: React.ReactNode;
  user?: User;
  organization?: Organization;
}
```

**Usage:**
```tsx
import { AppShell } from '@/components/app-shell';

<AppShell user={user} organization={organization}>
  <main>{children}</main>
</AppShell>
```

**Features:**
- Navigation sidebar
- User menu
- Organization switcher
- Breadcrumb navigation
- Mobile responsive layout

### AuthProvider

**Location:** `src/components/auth-provider.tsx`

```typescript
interface AuthProviderProps {
  children: React.ReactNode;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

**Usage:**
```tsx
import { AuthProvider, useAuth } from '@/components/auth-provider';

// Wrap your app
<AuthProvider>
  <App />
</AuthProvider>

// Use in components
function MyComponent() {
  const { user, signOut } = useAuth();
  
  return (
    <div>
      <p>Welcome, {user?.name}</p>
      <Button onClick={signOut}>Sign Out</Button>
    </div>
  );
}
```

### OnboardingForm

**Location:** `src/components/onboarding-form.tsx`

```typescript
interface OnboardingFormProps {
  user: User;
  onComplete: (data: OnboardingData) => void;
}

interface OnboardingData {
  organizationName: string;
  organizationSlug: string;
  role: string;
  teamSize: string;
}
```

**Usage:**
```tsx
import { OnboardingForm } from '@/components/onboarding-form';

<OnboardingForm
  user={user}
  onComplete={(data) => {
    // Handle onboarding completion
    createOrganization(data);
  }}
/>
```

### TeamMemberAdder

**Location:** `src/components/team-member-adder.tsx`

```typescript
interface TeamMemberAdderProps {
  teamId: string;
  organizationId: string;
  onMemberAdded: (member: User) => void;
}
```

**Usage:**
```tsx
import { TeamMemberAdder } from '@/components/team-member-adder';

<TeamMemberAdder
  teamId={team.id}
  organizationId={organization.id}
  onMemberAdded={(member) => {
    // Refresh team members list
    refetchTeamMembers();
  }}
/>
```

### TeamMemberModal

**Location:** `src/components/team-member-modal.tsx`

```typescript
interface TeamMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  member?: TeamMember;
  mode: 'add' | 'edit';
}
```

**Usage:**
```tsx
import { TeamMemberModal } from '@/components/team-member-modal';

<TeamMemberModal
  open={isModalOpen}
  onOpenChange={setIsModalOpen}
  teamId={team.id}
  mode="add"
/>
```

## Layout Components

### Page Layout Pattern

```tsx
// Standard page layout
interface PageLayoutProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

function PageLayout({ title, description, actions, children }: PageLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
```

### Navigation Components

```tsx
// Breadcrumb navigation
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && <ChevronRight className="h-4 w-4 mx-2" />}
            {item.href ? (
              <Link href={item.href} className="hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="text-muted-foreground">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

## Form Components

### Form Field Pattern

```tsx
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  description?: string;
}

function FormField({
  name,
  label,
  placeholder,
  type = 'text',
  required,
  description
}: FormFieldProps) {
  const {
    register,
    formState: { errors }
  } = useFormContext();

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        {...register(name, { required })}
      />
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {errors[name] && (
        <p className="text-sm text-red-500">
          {errors[name]?.message as string}
        </p>
      )}
    </div>
  );
}
```

### Select Field Pattern

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SelectFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  options: { value: string; label: string }[];
  required?: boolean;
}

function SelectField({
  name,
  label,
  placeholder,
  options,
  required
}: SelectFieldProps) {
  const { setValue, watch } = useFormContext();
  const value = watch(name);

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Select value={value} onValueChange={(value) => setValue(name, value)}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

## Data Display Components

### Status Badge Component

```tsx
interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

const statusVariants = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  PENDING: 'warning',
  CANCELLED: 'error',
} as const;

function StatusBadge({ status, variant }: StatusBadgeProps) {
  const badgeVariant = variant || statusVariants[status as keyof typeof statusVariants] || 'default';
  
  return (
    <Badge variant={badgeVariant}>
      {status.replace('_', ' ').toLowerCase()}
    </Badge>
  );
}
```

### Metric Card Component

```tsx
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: React.ComponentType<{ className?: string }>;
}

function MetricCard({ title, value, change, icon: Icon }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change && (
              <p className={`text-sm ${
                change.type === 'increase' ? 'text-green-600' : 'text-red-600'
              }`}>
                {change.type === 'increase' ? '↗' : '↘'} {Math.abs(change.value)}%
              </p>
            )}
          </div>
          {Icon && <Icon className="h-8 w-8 text-muted-foreground" />}
        </div>
      </CardContent>
    </Card>
  );
}
```

### Empty State Component

```tsx
interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ComponentType<{ className?: string }>;
}

function EmptyState({ title, description, action, icon: Icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && <Icon className="h-12 w-12 text-muted-foreground mb-4" />}
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">{description}</p>
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}
```

## Component Patterns

### Loading States

```tsx
// Skeleton loading component
function ProductCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

// Usage with loading state
function ProductList() {
  const { data: products, isLoading } = useQuery(['products'], fetchProducts);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products?.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

### Error Boundaries

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <Card className="p-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-red-600 mb-2">
          Something went wrong
        </h2>
        <p className="text-muted-foreground mb-4">{error.message}</p>
        <Button onClick={resetErrorBoundary}>Try again</Button>
      </div>
    </Card>
  );
}

// Usage
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <ProductDashboard />
</ErrorBoundary>
```

### Responsive Design Patterns

```tsx
// Mobile-first responsive grid
function ResponsiveGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="
      grid 
      grid-cols-1 
      sm:grid-cols-2 
      lg:grid-cols-3 
      xl:grid-cols-4 
      gap-4 
      sm:gap-6
    ">
      {children}
    </div>
  );
}

// Mobile navigation
function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Menu className="h-6 w-6" />
      </Button>
      
      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white border-b shadow-lg">
          <nav className="p-4 space-y-2">
            <Link href="/dashboard" className="block py-2">
              Dashboard
            </Link>
            <Link href="/products" className="block py-2">
              Products
            </Link>
          </nav>
        </div>
      )}
    </div>
  );
}
```

## Testing Components

### Component Testing Setup

```typescript
// test-utils.tsx
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/components/auth-provider';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: User;
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function AllTheProviders({ children, user }: {
  children: React.ReactNode;
  user?: User;
}) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialUser={user}>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}

function customRender(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const { user, ...renderOptions } = options;
  
  return render(ui, {
    wrapper: (props) => <AllTheProviders {...props} user={user} />,
    ...renderOptions,
  });
}

export * from '@testing-library/react';
export { customRender as render };
```

### Component Test Examples

```typescript
// Button.test.tsx
import { render, screen, fireEvent } from '@/test/test-utils';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-destructive');
  });
});
```

### Integration Test Example

```typescript
// ProductForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import { ProductForm } from '@/components/product-form';
import { createProduct } from '@/server/actions/products';

jest.mock('@/server/actions/products');
const mockCreateProduct = createProduct as jest.MockedFunction<typeof createProduct>;

describe('ProductForm', () => {
  it('submits form with correct data', async () => {
    mockCreateProduct.mockResolvedValue({ success: true, data: mockProduct });
    
    render(<ProductForm organizationId="org-1" />);
    
    fireEvent.change(screen.getByLabelText('Product Name'), {
      target: { value: 'Test Product' }
    });
    fireEvent.change(screen.getByLabelText('Product Key'), {
      target: { value: 'test-product' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: 'Create Product' }));
    
    await waitFor(() => {
      expect(mockCreateProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Product',
          key: 'test-product',
          organizationId: 'org-1'
        })
      );
    });
  });
});
```

## Best Practices

### Component Design Principles

1. **Single Responsibility**: Each component should have one clear purpose
2. **Composition over Inheritance**: Use composition patterns for flexibility
3. **Props Interface**: Always define TypeScript interfaces for props
4. **Default Props**: Provide sensible defaults where appropriate
5. **Accessibility**: Include proper ARIA labels and keyboard navigation

### Performance Optimization

```tsx
// Use React.memo for expensive components
const ExpensiveComponent = React.memo(function ExpensiveComponent({
  data
}: {
  data: ComplexData;
}) {
  const processedData = useMemo(() => {
    return expensiveCalculation(data);
  }, [data]);

  return <div>{/* Render processed data */}</div>;
});

// Use useCallback for event handlers
function ParentComponent() {
  const [items, setItems] = useState([]);
  
  const handleItemClick = useCallback((id: string) => {
    setItems(items => items.filter(item => item.id !== id));
  }, []);

  return (
    <div>
      {items.map(item => (
        <ItemComponent
          key={item.id}
          item={item}
          onClick={handleItemClick}
        />
      ))}
    </div>
  );
}
```

### Styling Guidelines

```tsx
// Use consistent spacing scale
const spacingClasses = {
  xs: 'space-y-1',
  sm: 'space-y-2',
  md: 'space-y-4',
  lg: 'space-y-6',
  xl: 'space-y-8',
};

// Use semantic color classes
const colorClasses = {
  primary: 'text-primary',
  secondary: 'text-muted-foreground',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  error: 'text-red-600',
};

// Responsive design patterns
const responsiveClasses = {
  container: 'container mx-auto px-4 sm:px-6 lg:px-8',
  grid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6',
  text: 'text-sm sm:text-base lg:text-lg',
};
```

---

## Support

For component-related questions:
- Storybook: [storybook.prodmatic.com](https://storybook.prodmatic.com)
- Design System: [design.prodmatic.com](https://design.prodmatic.com)
- GitHub Issues: [github.com/prodmatic/prodmatic/issues](https://github.com/prodmatic/prodmatic/issues)
