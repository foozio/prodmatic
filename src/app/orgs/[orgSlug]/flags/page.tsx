import { Suspense } from "react";
import Link from "next/link";
import {
  Flag,
  Plus,
  Filter,
  Settings,
  Users,
  Code,
  Target,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  ChevronRight,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface FlagsPageProps {
  params: Promise<{
    orgSlug: string;
  }>;
  searchParams: Promise<{
    product?: string;
    status?: string;
    environment?: string;
  }>;
}

async function FlagsContent({ orgSlug, searchParams }: {
  orgSlug: string;
  searchParams: { product?: string; status?: string; environment?: string; };
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("User not found");
  }

  // Get organization data with feature flags
  const organization = await db.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      products: {
        where: searchParams.product ? { id: searchParams.product } : {},
        include: {
          // Note: featureFlags table may not exist yet, using mock data
        },
      },
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  // Since featureFlags table might not exist yet, use mock data
  const allFlags: any[] = [];

  // Mock some feature flags data since the schema might not have this table yet
  const mockFlags = [
    {
      id: '1',
      name: 'new-dashboard-ui',
      key: 'NEW_DASHBOARD_UI',
      description: 'Enable the new dashboard user interface design',
      status: 'ACTIVE',
      enabled: true,
      rolloutPercentage: 100,
      environment: 'production',
      product: { name: 'Core Platform', id: 'core' },
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20'),
    },
    {
      id: '2',
      name: 'advanced-analytics',
      key: 'ADVANCED_ANALYTICS',
      description: 'Advanced analytics features for premium users',
      status: 'TESTING',
      enabled: true,
      rolloutPercentage: 25,
      environment: 'staging',
      product: { name: 'Analytics Suite', id: 'analytics' },
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-18'),
    },
    {
      id: '3',
      name: 'mobile-app-redesign',
      key: 'MOBILE_APP_REDESIGN',
      description: 'Complete mobile application redesign',
      status: 'INACTIVE',
      enabled: false,
      rolloutPercentage: 0,
      environment: 'development',
      product: { name: 'Mobile App', id: 'mobile' },
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-12'),
    },
    {
      id: '4',
      name: 'ai-powered-insights',
      key: 'AI_POWERED_INSIGHTS',
      description: 'AI-powered insights and recommendations',
      status: 'ACTIVE',
      enabled: true,
      rolloutPercentage: 75,
      environment: 'production',
      product: { name: 'AI Assistant', id: 'ai' },
      createdAt: new Date('2024-01-08'),
      updatedAt: new Date('2024-01-22'),
    },
  ];

  // Use mock data if no real flags exist
  const flags = allFlags.length > 0 ? allFlags : mockFlags;

  const stats = {
    total: flags.length,
    active: flags.filter((flag: any) => flag.status === 'ACTIVE').length,
    testing: flags.filter((flag: any) => flag.status === 'TESTING').length,
    inactive: flags.filter((flag: any) => flag.status === 'INACTIVE').length,
    production: flags.filter((flag: any) => flag.environment === 'production').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'TESTING':
        return 'bg-yellow-100 text-yellow-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'ARCHIVED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4" />;
      case 'TESTING':
        return <AlertTriangle className="h-4 w-4" />;
      case 'INACTIVE':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Flag className="h-4 w-4" />;
    }
  };

  const getEnvironmentColor = (environment: string) => {
    switch (environment) {
      case 'production':
        return 'bg-red-100 text-red-800';
      case 'staging':
        return 'bg-yellow-100 text-yellow-800';
      case 'development':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Flag className="h-8 w-8 text-green-500" />
            Feature Flags
          </h1>
          <p className="text-gray-600 mt-1">
            Manage feature toggles and rollouts across your products
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button asChild>
            <Link href={`/orgs/${orgSlug}/flags/new`}>
              <Plus className="h-4 w-4 mr-2" />
              New Flag
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flags</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Testing</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.testing}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Production</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.production}</div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Flags List */}
      <div className="space-y-4">
        {flags.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Flag className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No feature flags yet</h3>
              <p className="text-gray-600 text-center mb-6">
                Start managing feature rollouts by creating your first feature flag.
              </p>
              <Button asChild>
                <Link href={`/orgs/${orgSlug}/flags/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Flag
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          flags.map((flag: any) => (
            <Card key={flag.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          flag.enabled ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <Link 
                          href={`/orgs/${orgSlug}/flags/${flag.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {flag.name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(flag.status)}>
                          {getStatusIcon(flag.status)}
                          <span className="ml-1">{flag.status}</span>
                        </Badge>
                        <Badge className={getEnvironmentColor(flag.environment)}>
                          {flag.environment}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-3">
                      {flag.description || "No description provided"}
                    </p>

                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Code className="h-4 w-4" />
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                          {flag.key}
                        </code>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        <span>{flag.rolloutPercentage}% rollout</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Updated {new Date(flag.updatedAt).toLocaleDateString()}</span>
                      </div>

                      <Badge variant="outline">
                        {flag.product.name}
                      </Badge>
                    </div>

                    {/* Rollout Progress Bar */}
                    {flag.rolloutPercentage > 0 && (
                      <div className="mt-4">
                        <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                          <span>Rollout Progress</span>
                          <span>{flag.rolloutPercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              flag.status === 'ACTIVE' 
                                ? 'bg-green-600' 
                                : flag.status === 'TESTING' 
                                ? 'bg-yellow-600' 
                                : 'bg-gray-400'
                            }`}
                            style={{ width: `${flag.rolloutPercentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 ml-4">
                    <Link href={`/orgs/${orgSlug}/flags/${flag.id}`}>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Environment Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              Production
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flags.filter((f: any) => f.environment === 'production').length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {flags.filter((f: any) => f.environment === 'production' && f.enabled).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              Staging
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flags.filter((f: any) => f.environment === 'staging').length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {flags.filter((f: any) => f.environment === 'staging' && f.enabled).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              Development
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flags.filter((f: any) => f.environment === 'development').length}</div>
            <p className="text-xs text-gray-500 mt-1">
              {flags.filter((f: any) => f.environment === 'development' && f.enabled).length} active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Flag Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-600 mb-3">
              Monitor flag usage and performance metrics
            </p>
            <Button size="sm" className="w-full" variant="outline" asChild>
              <Link href={`/orgs/${orgSlug}/flags/analytics`}>
                View Analytics
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Targeting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-600 mb-3">
              Configure user segments and targeting rules
            </p>
            <Button size="sm" className="w-full" variant="outline" asChild>
              <Link href={`/orgs/${orgSlug}/flags/targeting`}>
                Manage Targeting
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Code className="h-4 w-4" />
              SDK Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-600 mb-3">
              Set up feature flag SDKs in your applications
            </p>
            <Button size="sm" className="w-full" variant="outline" asChild>
              <Link href={`/orgs/${orgSlug}/flags/integration`}>
                Integration Guide
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function FlagsPage({ params, searchParams }: FlagsPageProps) {
  const { orgSlug } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <FlagsContent orgSlug={orgSlug} searchParams={resolvedSearchParams} />
    </Suspense>
  );
}