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
  ToggleLeft, 
  ToggleRight, 
  Users, 
  BarChart3,
  Filter,
  MoreHorizontal,
  Copy,
  Eye,
  EyeOff,
  Gauge,
  Code
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface FeatureFlagsPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
  searchParams: {
    status?: string;
    feature?: string;
  };
}

export default async function FeatureFlagsPage({
  params,
  searchParams,
}: FeatureFlagsPageProps) {
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
  const canManageFlags = currentMembership?.role === "ADMIN" || 
                         currentMembership?.role === "PRODUCT_MANAGER";

  // Build filters
  const whereConditions: any = {
    productId: product.id,
    deletedAt: null,
  };

  if (searchParams.status === "enabled") {
    whereConditions.enabled = true;
  } else if (searchParams.status === "disabled") {
    whereConditions.enabled = false;
  }

  if (searchParams.feature) {
    whereConditions.featureId = searchParams.feature;
  }

  const featureFlags = await db.featureFlag.findMany({
    where: whereConditions,
    include: {
      feature: true,
    },
    orderBy: [
      { enabled: "desc" },
      { createdAt: "desc" },
    ],
  });

  // Get features for the filter
  const features = await db.feature.findMany({
    where: {
      productId: product.id,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
    },
    orderBy: { title: "asc" },
  });

  // Calculate flag statistics
  const flagStats = {
    total: featureFlags.length,
    enabled: featureFlags.filter(f => f.enabled).length,
    disabled: featureFlags.filter(f => !f.enabled).length,
    rollout: featureFlags.filter(f => f.enabled && f.rollout > 0 && f.rollout < 1).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/analytics`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Analytics
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
            <p className="text-muted-foreground">
              Feature toggles and rollout control for {product.name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canManageFlags && (
            <Button asChild>
              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/flags/new`}>
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
            <ToggleRight className="h-4 w-4 text-muted-foreground" />
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
            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{flagStats.disabled}</div>
            <p className="text-xs text-muted-foreground">
              Currently inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gradual Rollout</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{flagStats.rollout}</div>
            <p className="text-xs text-muted-foreground">
              Partial rollout
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
                  Create feature flags to control feature rollouts
                </p>
                {canManageFlags && (
                  <Button asChild>
                    <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/flags/new`}>
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
                        {flag.enabled ? (
                          <ToggleRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold">
                              <Link
                                href={`/orgs/${params.orgSlug}/products/${params.productKey}/flags/${flag.id}`}
                                className="hover:underline"
                              >
                                {flag.name}
                              </Link>
                            </h3>
                            <Badge 
                              variant={flag.enabled ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {flag.enabled ? "Enabled" : "Disabled"}
                            </Badge>
                            {flag.rollout > 0 && flag.rollout < 1 && (
                              <Badge variant="outline" className="text-xs">
                                {rolloutPercentage}% rollout
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Code className="h-3 w-3" />
                              <code className="px-1 py-0.5 rounded bg-gray-100 text-xs">
                                {flag.key}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0"
                                onClick={() => navigator.clipboard.writeText(flag.key)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            {flag.feature && (
                              <div className="flex items-center space-x-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span>{flag.feature.title}</span>
                              </div>
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
                      
                      {flag.enabled && flag.rollout > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Rollout Progress</span>
                            <span className="font-medium">{rolloutPercentage}% of users</span>
                          </div>
                          <Progress value={rolloutPercentage} className="h-2" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {flag.enabled ? (
                        <Badge variant="default" className="text-xs">
                          <Eye className="h-3 w-3 mr-1" />
                          Live
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Hidden
                        </Badge>
                      )}
                      
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/flags/${flag.id}`}>
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

                {(flag.targeting && Object.keys(flag.targeting as any).length > 0) && (
                  <CardContent className="pt-0">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-900 mb-1">Targeting Rules</h4>
                      <p className="text-sm text-blue-700">
                        Custom targeting rules are configured for this flag
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Integration Guide */}
      {featureFlags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Integration Guide</CardTitle>
            <CardDescription>
              How to use feature flags in your application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">JavaScript SDK</h4>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <code className="text-sm">
{`import { FeatureFlags } from '@prodmatic/sdk';

const flags = new FeatureFlags('${product.key}');
const isEnabled = await flags.isEnabled('${featureFlags[0]?.key || 'feature_key'}');

if (isEnabled) {
  // Show new feature
}`}
                  </code>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">REST API</h4>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <code className="text-sm">
{`GET /api/v1/flags/${product.key}/${featureFlags[0]?.key || 'feature_key'}
Authorization: Bearer YOUR_API_KEY`}
                  </code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}