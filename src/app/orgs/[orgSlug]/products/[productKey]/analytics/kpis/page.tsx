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
  Target, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  User, 
  BarChart3,
  Activity,
  Filter,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface KPIDashboardPageProps {
  params: Promise<{
    orgSlug: string;
    productKey: string;
  }>;
  searchParams: Promise<{
    frequency?: string;
    status?: string;
    owner?: string;
  }>;
}

export default async function KPIDashboardPage({
  params,
  searchParams,
}: KPIDashboardPageProps) {
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
  const canManageKPIs = currentMembership?.role === "ADMIN" || 
                        currentMembership?.role === "PRODUCT_MANAGER";

  // Build filters
  const whereConditions: any = {
    productId: product.id,
    deletedAt: null,
  };

  if (resolvedSearchParams.frequency) {
    whereConditions.frequency = resolvedSearchParams.frequency;
  }

  if (resolvedSearchParams.status === "active") {
    whereConditions.isActive = true;
  } else if (resolvedSearchParams.status === "inactive") {
    whereConditions.isActive = false;
  }

  if (resolvedSearchParams.owner) {
    whereConditions.ownerId = resolvedSearchParams.owner;
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

  // Get team members for the owner filter
  const teamMembers = await db.user.findMany({
    where: {
      memberships: {
        some: {
          organizationId: organization.id,
        },
      },
    },
    include: {
      memberships: {
        where: { organizationId: organization.id },
      },
    },
  });

  // Calculate KPI statistics
  const kpiStats = {
    total: kpis.length,
    active: kpis.filter(kpi => kpi.isActive).length,
    inactive: kpis.filter(kpi => !kpi.isActive).length,
    needsUpdate: 0, // Would need actual data points to calculate
  };

  const frequencyColors = {
    DAILY: "bg-red-100 text-red-700",
    WEEKLY: "bg-orange-100 text-orange-700",
    MONTHLY: "bg-blue-100 text-blue-700",
    QUARTERLY: "bg-green-100 text-green-700",
    YEARLY: "bg-purple-100 text-purple-700",
  };

  const frequencyIcons = {
    DAILY: Calendar,
    WEEKLY: Calendar,
    MONTHLY: Calendar,
    QUARTERLY: Calendar,
    YEARLY: Calendar,
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
            <h1 className="text-3xl font-bold tracking-tight">KPI Dashboard</h1>
            <p className="text-muted-foreground">
              Key performance indicators for {product.name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canManageKPIs && (
            <Button asChild>
              <Link href={`/orgs/${orgSlug}/products/${productKey}/analytics/kpis/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New KPI
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total KPIs</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiStats.total}</div>
            <p className="text-xs text-muted-foreground">
              All KPIs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kpiStats.active}</div>
            <p className="text-xs text-muted-foreground">
              Currently tracking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiStats.inactive}</div>
            <p className="text-xs text-muted-foreground">
              Not currently tracking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Update</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{kpiStats.needsUpdate}</div>
            <p className="text-xs text-muted-foreground">
              Missing recent data
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
              defaultValue={resolvedSearchParams.status || ""}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select 
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={resolvedSearchParams.frequency || ""}
            >
              <option value="">All Frequencies</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Yearly</option>
            </select>

            <select 
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={resolvedSearchParams.owner || ""}
            >
              <option value="">All Owners</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* KPIs List */}
      <div className="space-y-4">
        {kpis.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No KPIs yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start tracking key performance indicators for your product
                </p>
                {canManageKPIs && (
                  <Button asChild>
                    <Link href={`/orgs/${orgSlug}/products/${productKey}/analytics/kpis/new`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First KPI
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          kpis.map((kpi) => {
            const FrequencyIcon = frequencyIcons[kpi.frequency];
            
            return (
              <Card key={kpi.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Target className="h-5 w-5" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold">
                              <Link
                                href={`/orgs/${orgSlug}/products/${productKey}/analytics/kpis/${kpi.id}`}
                                className="hover:underline"
                              >
                                {kpi.name}
                              </Link>
                            </h3>
                            <Badge 
                              variant={kpi.isActive ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {kpi.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${frequencyColors[kpi.frequency]}`}
                            >
                              <FrequencyIcon className="h-3 w-3 mr-1" />
                              {kpi.frequency}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>Metric: {kpi.metric}</span>
                            <span>Target: {kpi.target.toLocaleString()}</span>
                            {kpi.owner && (
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>{kpi.owner.name}</span>
                              </div>
                            )}
                            <span>Created {format(new Date(kpi.createdAt), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      </div>
                      
                      {kpi.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {kpi.description}
                        </p>
                      )}
                      
                      {/* Placeholder for actual KPI value */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Current Value</span>
                          <span className="text-xs text-muted-foreground">No data yet</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-2xl font-bold text-gray-400">--</div>
                          <div className="text-sm text-muted-foreground">/ {kpi.target.toLocaleString()}</div>
                        </div>
                        <Progress value={0} className="mt-2" />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {kpi.owner && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={kpi.owner.image || ""} />
                          <AvatarFallback className="text-xs">
                            {kpi.owner.name?.split(" ").map((n: string) => n[0]).join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/orgs/${orgSlug}/products/${productKey}/analytics/kpis/${kpi.id}`}>
                            View
                          </Link>
                        </Button>
                        {canManageKPIs && (
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

      {/* KPI Templates */}
      {kpis.length === 0 && canManageKPIs && (
        <Card>
          <CardHeader>
            <CardTitle>Popular KPI Templates</CardTitle>
            <CardDescription>
              Get started with these common product metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  name: "Monthly Active Users",
                  metric: "Active Users",
                  frequency: "MONTHLY",
                  description: "Track user engagement and product adoption"
                },
                {
                  name: "Customer Acquisition Cost",
                  metric: "Cost per Acquisition",
                  frequency: "MONTHLY",
                  description: "Monitor cost efficiency of user acquisition"
                },
                {
                  name: "Net Promoter Score",
                  metric: "NPS Score",
                  frequency: "QUARTERLY",
                  description: "Measure customer satisfaction and loyalty"
                },
                {
                  name: "Revenue Growth",
                  metric: "Monthly Recurring Revenue",
                  frequency: "MONTHLY",
                  description: "Track business growth and financial health"
                },
                {
                  name: "Churn Rate",
                  metric: "Customer Churn",
                  frequency: "MONTHLY",
                  description: "Monitor customer retention and satisfaction"
                },
                {
                  name: "Feature Adoption",
                  metric: "Feature Usage Rate",
                  frequency: "WEEKLY",
                  description: "Track adoption of new features and capabilities"
                },
              ].map((template, index) => (
                <div key={index} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <h4 className="font-medium mb-1">{template.name}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {template.frequency}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      Use Template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}