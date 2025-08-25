import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  Eye, 
  EyeOff, 
  FileText,
  Sparkles,
  Bug,
  Shield,
  TrendingUp,
  AlertTriangle,
  Archive,
  MoreHorizontal
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface ChangelogPageProps {
  params: {
    orgSlug: string;
    productKey: string;
    releaseId: string;
  };
  searchParams: {
    type?: string;
    visibility?: string;
  };
}

export default async function ChangelogPage({
  params,
  searchParams,
}: ChangelogPageProps) {
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
  const canManageChangelog = currentMembership?.role === "ADMIN" || 
                           currentMembership?.role === "PRODUCT_MANAGER" ||
                           currentMembership?.role === "CONTRIBUTOR";

  const release = await db.release.findFirst({
    where: {
      id: params.releaseId,
      productId: product.id,
      deletedAt: null,
    },
  });

  if (!release) {
    redirect(`/orgs/${params.orgSlug}/products/${params.productKey}/releases`);
  }

  // Build filters for changelog entries
  const whereConditions: any = {
    productId: product.id,
    deletedAt: null,
  };

  // Filter by release (can be null for general product changelog)
  if (params.releaseId !== "all") {
    whereConditions.releaseId = params.releaseId;
  }

  if (searchParams.type) {
    whereConditions.type = searchParams.type;
  }

  if (searchParams.visibility) {
    whereConditions.visibility = searchParams.visibility;
  }

  const changelogEntries = await db.changelog.findMany({
    where: whereConditions,
    include: {
      release: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const typeIcons = {
    FEATURE: Sparkles,
    IMPROVEMENT: TrendingUp,
    BUG_FIX: Bug,
    BREAKING_CHANGE: AlertTriangle,
    SECURITY: Shield,
    DEPRECATED: Archive,
  };

  const typeColors = {
    FEATURE: "bg-green-100 text-green-700 border-green-200",
    IMPROVEMENT: "bg-blue-100 text-blue-700 border-blue-200",
    BUG_FIX: "bg-red-100 text-red-700 border-red-200",
    BREAKING_CHANGE: "bg-orange-100 text-orange-700 border-orange-200",
    SECURITY: "bg-purple-100 text-purple-700 border-purple-200",
    DEPRECATED: "bg-gray-100 text-gray-700 border-gray-200",
  };

  const visibilityIcons = {
    PUBLIC: Eye,
    PRIVATE: EyeOff,
    INTERNAL: FileText,
  };

  const visibilityColors = {
    PUBLIC: "bg-green-100 text-green-700",
    PRIVATE: "bg-red-100 text-red-700",
    INTERNAL: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Releases
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Changelog - {release.name}
            </h1>
            <p className="text-muted-foreground">
              Version {release.version} • {changelogEntries.length} entries
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canManageChangelog && (
            <Button asChild>
              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases/${params.releaseId}/changelog/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Release Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>{release.name}</span>
                <Badge variant="outline">v{release.version}</Badge>
                <Badge variant={release.status === "RELEASED" ? "default" : "secondary"}>
                  {release.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                {release.description}
              </CardDescription>
            </div>
            {release.releaseDate && (
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Release Date</div>
                <div className="font-medium">
                  {format(new Date(release.releaseDate), "PPP")}
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        {release.notes && (
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground">{release.notes}</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="text-sm font-medium">Filter by:</div>
            
            <select 
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={searchParams.type || ""}
            >
              <option value="">All Types</option>
              <option value="FEATURE">Features</option>
              <option value="IMPROVEMENT">Improvements</option>
              <option value="BUG_FIX">Bug Fixes</option>
              <option value="BREAKING_CHANGE">Breaking Changes</option>
              <option value="SECURITY">Security</option>
              <option value="DEPRECATED">Deprecated</option>
            </select>

            <select 
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={searchParams.visibility || ""}
            >
              <option value="">All Visibility</option>
              <option value="PUBLIC">Public</option>
              <option value="INTERNAL">Internal</option>
              <option value="PRIVATE">Private</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Changelog Entries */}
      <div className="space-y-4">
        {changelogEntries.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No changelog entries yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start documenting changes for this release
                </p>
                {canManageChangelog && (
                  <Button asChild>
                    <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases/${params.releaseId}/changelog/new`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Entry
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          changelogEntries.map((entry) => {
            const TypeIcon = typeIcons[entry.type];
            const VisibilityIcon = visibilityIcons[entry.visibility];
            
            return (
              <Card key={entry.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`p-2 rounded-lg ${typeColors[entry.type]}`}>
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-medium">{entry.title}</h3>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Badge 
                              variant="outline" 
                              className={typeColors[entry.type]}
                            >
                              {entry.type.replace("_", " ")}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={visibilityColors[entry.visibility]}
                            >
                              <VisibilityIcon className="h-3 w-3 mr-1" />
                              {entry.visibility}
                            </Badge>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{format(new Date(entry.createdAt), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="prose prose-sm max-w-none text-muted-foreground">
                        <p>{entry.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {canManageChangelog && (
                        <>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases/${params.releaseId}/changelog/${entry.id}/edit`}>
                              Edit
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Changelog Summary by Type */}
      {changelogEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              Breakdown of changes in this release
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(typeIcons).map(([type, Icon]) => {
                const count = changelogEntries.filter(entry => entry.type === type).length;
                
                return (
                  <div key={type} className="text-center">
                    <div className={`inline-flex p-3 rounded-lg mb-2 ${typeColors[type as keyof typeof typeColors]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-muted-foreground">
                      {type.replace("_", " ")}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}