import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Plus, 
  Rocket, 
  Package, 
  Calendar, 
  GitBranch, 
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  MoreHorizontal,
  Filter,
  Download
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";

interface ReleasesPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
  searchParams: {
    status?: string;
    type?: string;
  };
}

export default async function ReleasesPage({
  params,
  searchParams,
}: ReleasesPageProps) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/auth/signin");
  }

  const organization = await db.organization.findUnique({
    where: { slug: params.orgSlug },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  const product = await db.product.findFirst({
    where: {
      key: params.productKey,
      organizationId: organization.id,
      deletedAt: null,
    },
  });

  if (!product) {
    redirect(`/orgs/${params.orgSlug}/products`);
  }

  // Check if user has access
  await requireRole(user.id, organization.id, ["ADMIN", "PRODUCT_MANAGER", "CONTRIBUTOR", "STAKEHOLDER"]);

  const currentMembership = user.memberships.find(m => m.organizationId === organization.id);
  const canManageReleases = currentMembership?.role === "ADMIN" || currentMembership?.role === "PRODUCT_MANAGER";

  // Build filters
  const whereConditions: any = {
    productId: product.id,
    deletedAt: null,
  };

  if (searchParams.status) {
    whereConditions.status = searchParams.status;
  }

  if (searchParams.type) {
    whereConditions.type = searchParams.type;
  }

  const releases = await db.release.findMany({
    where: whereConditions,
    include: {
      features: {
        where: { deletedAt: null },
        include: {
          tasks: {
            where: { deletedAt: null },
          },
        },
      },
      changelog: {
        where: { deletedAt: null },
      },
    },
    orderBy: [
      { releaseDate: "desc" },
      { createdAt: "desc" },
    ],
  });

  // Calculate release statistics
  const releaseStats = {
    total: releases.length,
    planned: releases.filter(r => r.status === "PLANNED").length,
    inProgress: releases.filter(r => r.status === "IN_PROGRESS").length,
    released: releases.filter(r => r.status === "RELEASED").length,
    upcoming: releases.filter(r => r.status === "PLANNED" && r.releaseDate && new Date(r.releaseDate) > new Date()).length,
  };

  const statusColors = {
    PLANNED: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    RELEASED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  const statusIcons = {
    PLANNED: Clock,
    IN_PROGRESS: Package,
    RELEASED: CheckCircle,
    CANCELLED: AlertTriangle,
  };

  const typeColors = {
    MAJOR: "bg-purple-100 text-purple-700 border-purple-200",
    MINOR: "bg-blue-100 text-blue-700 border-blue-200",
    PATCH: "bg-green-100 text-green-700 border-green-200",
    HOTFIX: "bg-red-100 text-red-700 border-red-200",
  };

  const typeIcons = {
    MAJOR: "🚀",
    MINOR: "⭐",
    PATCH: "🔧",
    HOTFIX: "🚨",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Releases</h1>
          <p className="text-muted-foreground">
            Manage product releases and deployment for {product.name}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {canManageReleases && (
            <Button asChild>
              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New Release
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Release Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Releases</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{releaseStats.total}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{releaseStats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              Currently building
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Released</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{releaseStats.released}</div>
            <p className="text-xs text-muted-foreground">
              Successfully deployed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{releaseStats.upcoming}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled releases
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            
            <select 
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={searchParams.status || ""}
            >
              <option value="">All Statuses</option>
              <option value="PLANNED">Planned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RELEASED">Released</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select 
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={searchParams.type || ""}
            >
              <option value="">All Types</option>
              <option value="MAJOR">Major</option>
              <option value="MINOR">Minor</option>
              <option value="PATCH">Patch</option>
              <option value="HOTFIX">Hotfix</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Releases List */}
      <div className="space-y-4">
        {releases.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Rocket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No releases yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start planning your first product release
                </p>
                {canManageReleases && (
                  <Button asChild>
                    <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases/new`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Release
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          releases.map((release) => {
            const StatusIcon = statusIcons[release.status];
            const completedFeatures = release.features.filter(f => f.status === "DONE").length;
            const totalFeatures = release.features.length;
            const progress = totalFeatures > 0 ? (completedFeatures / totalFeatures) * 100 : 0;
            
            return (
              <Card key={release.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <StatusIcon className="h-5 w-5" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold">
                              <Link
                                href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases/${release.id}`}
                                className="hover:underline"
                              >
                                {release.name}
                              </Link>
                            </h3>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${typeColors[release.type]}`}
                            >
                              {typeIcons[release.type]} {release.type}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Badge 
                              variant="outline" 
                              className={statusColors[release.status]}
                            >
                              {release.status}
                            </Badge>
                            <span>v{release.version}</span>
                            {release.releaseDate && (
                              <span>
                                <Calendar className="h-4 w-4 inline mr-1" />
                                {format(new Date(release.releaseDate), "MMM d, yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {release.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {release.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <GitBranch className="h-4 w-4" />
                          <span>{totalFeatures} features</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-4 w-4" />
                          <span>{completedFeatures} completed</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <FileText className="h-4 w-4" />
                          <span>{release.changelog.length} changelog entries</span>
                        </div>
                        {release.artifacts.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Download className="h-4 w-4" />
                            <span>{release.artifacts.length} artifacts</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {totalFeatures > 0 && (
                        <div className="text-right">
                          <div className="text-lg font-bold">{Math.round(progress)}%</div>
                          <div className="text-xs text-muted-foreground">Complete</div>
                          <Progress value={progress} className="w-20 mt-1" />
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases/${release.id}`}>
                            View
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases/${release.id}/changelog`}>
                            <FileText className="h-4 w-4 mr-1" />
                            Changelog
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases/${release.id}/checklist`}>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Checklist
                          </Link>
                        </Button>
                        {canManageReleases && (
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {release.releaseDate && (
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        {release.status === "RELEASED" ? (
                          <span className="text-green-600">
                            Released {formatDistanceToNow(new Date(release.releaseDate))} ago
                          </span>
                        ) : new Date(release.releaseDate) > new Date() ? (
                          <span className="text-blue-600">
                            Scheduled for {formatDistanceToNow(new Date(release.releaseDate))} from now
                          </span>
                        ) : (
                          <span className="text-orange-600">
                            Overdue by {formatDistanceToNow(new Date(release.releaseDate))}
                          </span>
                        )}
                      </div>

                      {release.status === "IN_PROGRESS" && (
                        <div className="flex items-center space-x-2">
                          <span className="text-muted-foreground">Ready to deploy?</span>
                          <Button size="sm" variant="outline">
                            <Rocket className="h-4 w-4 mr-2" />
                            Deploy
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}