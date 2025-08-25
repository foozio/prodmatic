import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar, 
  User, 
  BarChart3,
  Activity,
  Filter,
  MoreHorizontal
} from "lucide-react";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";

interface AnalyticsPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
  searchParams: {
    period?: string;
    status?: string;
  };
}

export default async function AnalyticsPage({
  params,
  searchParams,
}: AnalyticsPageProps) {
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
  const canManageKPIs = currentMembership?.role === "ADMIN" || 
                        currentMembership?.role === "PRODUCT_MANAGER";

  // Build filters for KPIs
  const whereConditions: any = {
    productId: product.id,
    deletedAt: null,
  };

  if (searchParams.status === "active") {
    whereConditions.isActive = true;
  } else if (searchParams.status === "inactive") {
    whereConditions.isActive = false;
  }

  const kpis = await db.kPI.findMany({
    where: whereConditions,
    include: {
      owner: true,
    },
    orderBy: [
      { isActive: "desc" },
      { createdAt: "desc" },
    ],
  });

  // Get experiments for the product
  const experiments = await db.experiment.findMany({
    where: {
      productId: product.id,
      deletedAt: null,
    },
    include: {
      owner: true,
    },
    orderBy: { createdAt: "desc" },
    take: 5, // Recent experiments
  });

  // Get feature flags for the product
  const featureFlags = await db.featureFlag.findMany({
    where: {
      productId: product.id,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 5, // Recent flags
  });

  // Calculate KPI statistics
  const kpiStats = {
    total: kpis.length,
    active: kpis.filter(kpi => kpi.isActive).length,
    onTarget: 0, // Would need actual values to calculate
    needsAttention: 0, // Would need actual values to calculate
  };

  const frequencyIcons = {
    DAILY: Calendar,
    WEEKLY: Calendar,
    MONTHLY: Calendar,
    QUARTERLY: Calendar,
    YEARLY: Calendar,
  };

  const frequencyColors = {
    DAILY: "bg-red-100 text-red-700",
    WEEKLY: "bg-orange-100 text-orange-700",
    MONTHLY: "bg-blue-100 text-blue-700",
    QUARTERLY: "bg-green-100 text-green-700",
    YEARLY: "bg-purple-100 text-purple-700",
  };

  const experimentStatusColors = {
    DRAFT: "bg-gray-100 text-gray-700",
    RUNNING: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    PAUSED: "bg-yellow-100 text-yellow-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Growth</h1>
          <p className="text-muted-foreground">
            KPIs, experiments, and growth tracking for {product.name}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {canManageKPIs && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/experiments/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Experiment
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/analytics/kpis/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  New KPI
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total KPIs</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {kpiStats.active} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running Experiments</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {experiments.filter(e => e.status === "RUNNING").length}
            </div>
            <p className="text-xs text-muted-foreground">
              {experiments.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feature Flags</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {featureFlags.filter(f => f.enabled).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {featureFlags.length} total flags
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Target</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kpiStats.onTarget}</div>
            <p className="text-xs text-muted-foreground">
              KPIs meeting target
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2" />
              KPI Dashboard
            </CardTitle>
            <CardDescription>
              Track key performance indicators and metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/analytics/kpis`}>
                View KPI Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Experiments
            </CardTitle>
            <CardDescription>
              A/B tests and feature experiments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/experiments`}>
                View Experiments
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Feature Flags
            </CardTitle>
            <CardDescription>
              Feature toggles and rollout control
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/flags`}>
                Manage Flags
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent KPIs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent KPIs</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/analytics/kpis`}>
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {kpis.length === 0 ? (
              <div className="text-center py-6">
                <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No KPIs yet</p>
                {canManageKPIs && (
                  <Button variant="outline" size="sm" className="mt-2" asChild>
                    <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/analytics/kpis/new`}>
                      Create First KPI
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {kpis.slice(0, 3).map((kpi) => {
                  const FrequencyIcon = frequencyIcons[kpi.frequency];
                  
                  return (
                    <div key={kpi.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{kpi.name}</h4>
                          <Badge 
                            variant={kpi.isActive ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {kpi.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>Target: {kpi.target.toLocaleString()}</span>
                          <div className="flex items-center space-x-1">
                            <FrequencyIcon className="h-3 w-3" />
                            <span>{kpi.frequency}</span>
                          </div>
                        </div>
                      </div>
                      {kpi.owner && (
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={kpi.owner.image || ""} />
                          <AvatarFallback className="text-xs">
                            {kpi.owner.name?.split(" ").map((n: string) => n[0]).join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Experiments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Experiments</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/experiments`}>
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {experiments.length === 0 ? (
              <div className="text-center py-6">
                <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No experiments yet</p>
                {canManageKPIs && (
                  <Button variant="outline" size="sm" className="mt-2" asChild>
                    <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/experiments/new`}>
                      Create First Experiment
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {experiments.slice(0, 3).map((experiment) => (
                  <div key={experiment.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{experiment.name}</h4>
                        <Badge 
                          variant="outline"
                          className={`text-xs ${experimentStatusColors[experiment.status]}`}
                        >
                          {experiment.status}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{experiment.type.replace("_", " ")}</span>
                        {experiment.startDate && (
                          <span>Started {format(new Date(experiment.startDate), "MMM d")}</span>
                        )}
                      </div>
                    </div>
                    {experiment.owner && (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={experiment.owner.image || ""} />
                        <AvatarFallback className="text-xs">
                          {experiment.owner.name?.split(" ").map((n: string) => n[0]).join("") || "U"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}