import { Suspense } from "react";
import Link from "next/link";
import {
  Rocket,
  Plus,
  Filter,
  Calendar,
  Package,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  Play,
  ChevronRight,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ReleasesPageProps {
  params: Promise<{
    orgSlug: string;
  }>;
  searchParams: Promise<{
    product?: string;
    status?: string;
  }>;
}

async function ReleasesContent({ orgSlug, searchParams }: {
  orgSlug: string;
  searchParams: { product?: string; status?: string; };
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("User not found");
  }

  // Get organization data with releases
  const organization = await db.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      products: {
        where: searchParams.product ? { id: searchParams.product } : {},
        include: {
          releases: {
            where: searchParams.status ? { status: searchParams.status as any } : {},
            include: {
              product: true,
              features: true,
            },
            orderBy: [
              { createdAt: 'desc' },
            ],
          },
        },
      },
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  // Flatten releases from all products
  const allReleases = organization?.products?.flatMap((product: any) => product.releases) || [];

  const stats = {
    total: allReleases.length,
    planned: allReleases.filter((release: any) => release.status === 'PLANNED').length,
    inProgress: allReleases.filter((release: any) => release.status === 'IN_PROGRESS').length,
    released: allReleases.filter((release: any) => release.status === 'RELEASED').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNED':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'RELEASED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PLANNED':
        return <Clock className="h-4 w-4" />;
      case 'IN_PROGRESS':
        return <Play className="h-4 w-4" />;
      case 'RELEASED':
        return <CheckCircle className="h-4 w-4" />;
      case 'CANCELLED':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Group releases by time period
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const nextQuarter = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const releaseGroups = {
    'This Month': allReleases.filter((release: any) => 
      release.targetDate && new Date(release.targetDate) <= nextMonth
    ),
    'Next Quarter': allReleases.filter((release: any) => 
      release.targetDate && new Date(release.targetDate) > nextMonth && 
      new Date(release.targetDate) <= nextQuarter
    ),
    'Future': allReleases.filter((release: any) => 
      release.targetDate && new Date(release.targetDate) > nextQuarter
    ),
    'No Date': allReleases.filter((release: any) => !release.targetDate),
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Rocket className="h-8 w-8 text-orange-500" />
            Releases
          </h1>
          <p className="text-gray-600 mt-1">
            Track and manage product releases across your organization
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button asChild>
            <Link href={`/orgs/${orgSlug}/releases/new`}>
              <Plus className="h-4 w-4 mr-2" />
              New Release
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Releases</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planned</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.planned}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Released</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.released}</div>
          </CardContent>
        </Card>
      </div>

      {/* Release Timeline */}
      <div className="space-y-8">
        {Object.entries(releaseGroups).map(([period, releases]) => (
          <div key={period} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-600" />
                {period}
                <Badge variant="secondary">{releases.length}</Badge>
              </h2>
            </div>

            {releases.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Rocket className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm">No releases planned for {period.toLowerCase()}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {releases.map((release: any) => (
                  <Card key={release.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <Link 
                            href={`/orgs/${orgSlug}/releases/${release.id}`}
                            className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1"
                          >
                            {release.name}
                          </Link>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(release.status)}>
                              {getStatusIcon(release.status)}
                              <span className="ml-1">{release.status.replace('_', ' ')}</span>
                            </Badge>
                            <Badge variant="outline">
                              v{release.version}
                            </Badge>
                          </div>
                        </div>
                        <Link href={`/orgs/${orgSlug}/releases/${release.id}`}>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </Link>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {release.description || "No description provided"}
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span>Product</span>
                          <Badge variant="outline" className="text-xs">
                            {release.product.name}
                          </Badge>
                        </div>
                        
                        {release.targetDate && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(release.targetDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}

                        {release.features && release.features.length > 0 && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Package className="h-3 w-3" />
                            <span>{release.features.length} features</span>
                          </div>
                        )}
                      </div>

                      {/* Release progress */}
                      {release.status === 'IN_PROGRESS' && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>Progress</span>
                            <span>75%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: '75%' }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      {allReleases.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Rocket className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No releases yet</h3>
            <p className="text-gray-600 text-center mb-6">
              Start planning your product releases to track features and ship dates.
            </p>
            <Button asChild>
              <Link href={`/orgs/${orgSlug}/releases/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Release
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default async function ReleasesPage({ params, searchParams }: ReleasesPageProps) {
  const { orgSlug } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ReleasesContent orgSlug={orgSlug} searchParams={resolvedSearchParams} />
    </Suspense>
  );
}