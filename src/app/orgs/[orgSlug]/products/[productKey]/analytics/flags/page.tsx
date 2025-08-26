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
  Flag, 
  Toggle, 
  ToggleLeft, 
  ToggleRight,
  Users,
  Settings,
  Filter,
  MoreHorizontal,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface FeatureFlagsPageProps {
  params: Promise<{
    orgSlug: string;
    productKey: string;
  }>;
  searchParams: Promise<{
    status?: string;
    feature?: string;
  }>;
}

export default async function FeatureFlagsPage({
  params,
  searchParams,
}: FeatureFlagsPageProps) {
  const { orgSlug, productKey } = await params;
  const resolvedSearchParams = await searchParams;
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/auth/signin");
  }

  const organization = await db.organization.findUnique({
    where: { slug: orgSlug },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  const product = await db.product.findFirst({
    where: {
      key: productKey,
      organizationId: organization.id,
      deletedAt: null,
    },
  });

  if (!product) {
    redirect(`/orgs/${orgSlug}/products`);
  }

  // Check if user has access
  await requireRole(user.id, organization.id, ["ADMIN", "PRODUCT_MANAGER", "CONTRIBUTOR", "STAKEHOLDER"]);

  const currentMembership = user.memberships.find(m => m.organizationId === organization.id);
  const canManageFlags = currentMembership?.role === "ADMIN" || 
                        currentMembership?.role === "PRODUCT_MANAGER" ||
                        currentMembership?.role === "CONTRIBUTOR";

  // Build filters
  const whereConditions: any = {
    productId: product.id,
    deletedAt: null,
  };

  if (resolvedSearchParams.status === "enabled") {
    whereConditions.enabled = true;
  } else if (resolvedSearchParams.status === "disabled") {
    whereConditions.enabled = false;
  }

  if (resolvedSearchParams.feature) {
    whereConditions.featureId = resolvedSearchParams.feature;
  }

  const featureFlags = await db.featureFlag.findMany({
    where: whereConditions,
    include: {
      feature: true,
    },
    orderBy: [
      { enabled: "desc" }, // Enabled flags first
      { createdAt: "desc" },
    ],
  });

  // Get features for the feature filter
  const features = await db.feature.findMany({
    where: {
      productId: product.id,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
    },
  });

  // Calculate flag statistics
  const flagStats = {
    total: featureFlags.length,
    enabled: featureFlags.filter(flag => flag.enabled).length,
    disabled: featureFlags.filter(flag => !flag.enabled).length,
    partialRollout: featureFlags.filter(flag => flag.enabled && flag.rollout > 0 && flag.rollout < 1).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orgs/${orgSlug}/products/${productKey}/analytics`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Analytics
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
            <p className="text-muted-foreground">
              Control feature rollouts and experiments for {product.name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canManageFlags && (
            <Button asChild>
              <Link href={`/orgs/${orgSlug}/products/${productKey}/analytics/flags/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New Flag
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Flag Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flags</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flagStats.total}</div>
            <p className="text-xs text-muted-foreground">
              All feature flags
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enabled</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{flagStats.enabled}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disabled</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flagStats.disabled}</div>
            <p className="text-xs text-muted-foreground">
              Not active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partial Rollout</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{flagStats.partialRollout}</div>
            <p className="text-xs text-muted-foreground">
              Gradual release
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
              <option value="">All Status</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </select>

            <select 
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={searchParams.feature || ""}
            >
              <option value="">All Features</option>
              {features.map((feature) => (
                <option key={feature.id} value={feature.id}>
                  {feature.title}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags List */}
      <div className="space-y-4">
        {featureFlags.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Flag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No feature flags yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create feature flags to control feature rollouts and run experiments
                </p>
                {canManageFlags && (
                  <Button asChild>
                    <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/analytics/flags/new`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Flag
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          featureFlags.map((flag) => {
            const rolloutPercentage = Math.round(flag.rollout * 100);
            
            return (
              <Card key={flag.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Flag className="h-5 w-5" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold">
                              <Link
                                href={`/orgs/${params.orgSlug}/products/${params.productKey}/analytics/flags/${flag.id}`}
                                className="hover:underline"
                              >
                                {flag.name}
                              </Link>
                            </h3>
                            <Badge 
                              variant={flag.enabled ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {flag.enabled ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : (
                                <AlertCircle className="h-3 w-3 mr-1" />
                              )}
                              {flag.enabled ? "Enabled" : "Disabled"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {flag.key}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            {flag.feature && (
                              <span>Feature: {flag.feature.title}</span>
                            )}
                            <span>Created {format(new Date(flag.createdAt), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      </div>
                      
                      {flag.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {flag.description}
                        </p>
                      )}
                      
                      {flag.enabled && (
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">Rollout Progress</span>
                              <span className="text-sm text-muted-foreground">{rolloutPercentage}%</span>
                            </div>
                            <Progress value={rolloutPercentage} className="h-2" />
                          </div>
                          
                          {rolloutPercentage > 0 && rolloutPercentage < 100 && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <Settings className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">Partial Rollout</span>
                              </div>
                              <p className="text-xs text-blue-700 mt-1">
                                This feature is enabled for {rolloutPercentage}% of users
                              </p>
                            </div>
                          )}
                          
                          {rolloutPercentage === 100 && (
                            <div className="bg-green-50 p-3 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-800">Full Rollout</span>
                              </div>
                              <p className="text-xs text-green-700 mt-1">
                                This feature is enabled for all users
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/analytics/flags/${flag.id}`}>
                            View
                          </Link>
                        </Button>
                        {canManageFlags && (
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })
        )}
      </div>

      {/* Feature Flag Best Practices */}
      {featureFlags.length === 0 && canManageFlags && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Flag Best Practices</CardTitle>
            <CardDescription>
              Guidelines for effective feature flag management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: "Start Small",
                  description: "Begin with a small percentage of users before full rollout"
                },
                {
                  title: "Monitor Metrics",
                  description: "Track key metrics to understand the impact of your features"
                },
                {
                  title: "Use Clear Names",
                  description: "Choose descriptive names that explain what the flag controls"
                },
                {
                  title: "Clean Up Regularly",
                  description: "Remove flags that are no longer needed to reduce complexity"
                },
              ].map((practice, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-1">{practice.title}</h4>
                  <p className="text-sm text-muted-foreground">{practice.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}