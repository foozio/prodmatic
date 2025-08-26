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
  BarChart3, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  PlayCircle, 
  PauseCircle,
  Calendar,
  User,
  Filter,
  MoreHorizontal,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface ExperimentsPageProps {
  params: Promise<{
    orgSlug: string;
    productKey: string;
  }>;
  searchParams: Promise<{
    type?: string;
    status?: string;
    owner?: string;
  }>;
}

export default async function ExperimentsPage({
  params,
  searchParams,
}: ExperimentsPageProps) {
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
  const canManageExperiments = currentMembership?.role === "ADMIN" || 
                              currentMembership?.role === "PRODUCT_MANAGER" ||
                              currentMembership?.role === "CONTRIBUTOR";

  // Build filters
  const whereConditions: any = {
    productId: product.id,
    deletedAt: null,
  };

  if (resolvedSearchParams.type) {
    whereConditions.type = resolvedSearchParams.type;
  }

  if (resolvedSearchParams.status) {
    whereConditions.status = resolvedSearchParams.status;
  }

  if (resolvedSearchParams.owner) {
    whereConditions.ownerId = resolvedSearchParams.owner;
  }

  const experiments = await db.experiment.findMany({
    where: whereConditions,
    include: {
      owner: true,
    },
    orderBy: [
      { status: "asc" }, // Running experiments first
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

  // Calculate experiment statistics
  const experimentStats = {
    total: experiments.length,
    running: experiments.filter(exp => exp.status === "RUNNING").length,
    completed: experiments.filter(exp => exp.status === "COMPLETED").length,
    draft: experiments.filter(exp => exp.status === "DRAFT").length,
  };

  const statusColors = {
    DRAFT: "bg-gray-100 text-gray-700",
    RUNNING: "bg-green-100 text-green-700",
    COMPLETED: "bg-blue-100 text-blue-700",
    CANCELLED: "bg-red-100 text-red-700",
    PAUSED: "bg-yellow-100 text-yellow-700",
  };

  const statusIcons = {
    DRAFT: AlertCircle,
    RUNNING: PlayCircle,
    COMPLETED: CheckCircle,
    CANCELLED: AlertCircle,
    PAUSED: PauseCircle,
  };

  const typeColors = {
    AB_TEST: "bg-blue-50 border-blue-200",
    MULTIVARIATE: "bg-purple-50 border-purple-200",
    FEATURE_FLAG: "bg-green-50 border-green-200",
    QUALITATIVE: "bg-orange-50 border-orange-200",
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
            <h1 className="text-3xl font-bold tracking-tight">Experiments</h1>
            <p className="text-muted-foreground">
              A/B tests and experiments for {product.name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canManageExperiments && (
            <Button asChild>
              <Link href={`/orgs/${orgSlug}/products/${productKey}/analytics/experiments/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New Experiment
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Experiment Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Experiments</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{experimentStats.total}</div>
            <p className="text-xs text-muted-foreground">
              All experiments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{experimentStats.running}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{experimentStats.completed}</div>
            <p className="text-xs text-muted-foreground">
              Finished experiments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{experimentStats.draft}</div>
            <p className="text-xs text-muted-foreground">
              Not yet started
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
              <option value="DRAFT">Draft</option>
              <option value="RUNNING">Running</option>
              <option value="COMPLETED">Completed</option>
              <option value="PAUSED">Paused</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select 
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={searchParams.type || ""}
            >
              <option value="">All Types</option>
              <option value="AB_TEST">A/B Test</option>
              <option value="MULTIVARIATE">Multivariate</option>
              <option value="FEATURE_FLAG">Feature Flag</option>
              <option value="QUALITATIVE">Qualitative</option>
            </select>

            <select 
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={searchParams.owner || ""}
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

      {/* Experiments List */}
      <div className="space-y-4">
        {experiments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No experiments yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start running A/B tests and experiments to optimize your product
                </p>
                {canManageExperiments && (
                  <Button asChild>
                    <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/analytics/experiments/new`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Experiment
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          experiments.map((experiment) => {
            const StatusIcon = statusIcons[experiment.status];
            
            return (
              <Card key={experiment.id} className={`hover:shadow-md transition-shadow ${typeColors[experiment.type]}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <BarChart3 className="h-5 w-5" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold">
                              <Link
                                href={`/orgs/${params.orgSlug}/products/${params.productKey}/analytics/experiments/${experiment.id}`}
                                className="hover:underline"
                              >
                                {experiment.name}
                              </Link>
                            </h3>
                            <Badge 
                              className={`text-xs ${statusColors[experiment.status]}`}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {experiment.status}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {experiment.type.replace("_", " ")}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            {experiment.owner && (
                              <div className="flex items-center space-x-1">
                                <User className="h-3 w-3" />
                                <span>{experiment.owner.name}</span>
                              </div>
                            )}
                            {experiment.startDate && (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>Started {format(new Date(experiment.startDate), "MMM d, yyyy")}</span>
                              </div>
                            )}
                            <span>Created {format(new Date(experiment.createdAt), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      </div>
                      
                      {experiment.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {experiment.description}
                        </p>
                      )}
                      
                      <div className="mb-3">
                        <p className="text-sm font-medium mb-1">Hypothesis:</p>
                        <p className="text-sm text-muted-foreground">{experiment.hypothesis}</p>
                      </div>

                      {experiment.status === "RUNNING" && (
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-green-800">Experiment Running</span>
                            <Activity className="h-4 w-4 text-green-600" />
                          </div>
                          <p className="text-xs text-green-700">
                            {experiment.endDate 
                              ? `Ends ${format(new Date(experiment.endDate), "MMM d, yyyy")}`
                              : "No end date set"
                            }
                          </p>
                        </div>
                      )}

                      {experiment.status === "COMPLETED" && experiment.results && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-800">Results Available</span>
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                          </div>
                          <p className="text-xs text-blue-700 truncate">
                            {experiment.results}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {experiment.owner && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={experiment.owner.image || ""} />
                          <AvatarFallback className="text-xs">
                            {experiment.owner.name?.split(" ").map((n: string) => n[0]).join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/analytics/experiments/${experiment.id}`}>
                            View
                          </Link>
                        </Button>
                        {canManageExperiments && (
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

      {/* Experiment Templates */}
      {experiments.length === 0 && canManageExperiments && (
        <Card>
          <CardHeader>
            <CardTitle>Popular Experiment Types</CardTitle>
            <CardDescription>
              Get started with these common experiment patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  name: "Landing Page A/B Test",
                  type: "AB_TEST",
                  description: "Test different versions of your landing page to improve conversion rates"
                },
                {
                  name: "Feature Flag Rollout",
                  type: "FEATURE_FLAG",
                  description: "Gradually roll out new features to users and measure impact"
                },
                {
                  name: "Pricing Strategy Test",
                  type: "MULTIVARIATE",
                  description: "Test different pricing models and find the optimal price point"
                },
                {
                  name: "User Onboarding Flow",
                  type: "AB_TEST",
                  description: "Optimize your user onboarding process to improve activation rates"
                },
              ].map((template, index) => (
                <div key={index} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <h4 className="font-medium mb-1">{template.name}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {template.type.replace("_", " ")}
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