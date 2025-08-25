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
  Activity, 
  Play, 
  Pause, 
  Square, 
  Calendar, 
  Users, 
  BarChart3,
  Filter,
  MoreHorizontal,
  Clock,
  CheckCircle,
  AlertTriangle,
  Target
} from "lucide-react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";

interface ExperimentsPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
  searchParams: {
    status?: string;
    type?: string;
  };
}

export default async function ExperimentsPage({
  params,
  searchParams,
}: ExperimentsPageProps) {
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
  const canManageExperiments = currentMembership?.role === "ADMIN" || 
                               currentMembership?.role === "PRODUCT_MANAGER" ||
                               currentMembership?.role === "CONTRIBUTOR";

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

  const experiments = await db.experiment.findMany({
    where: whereConditions,
    include: {
      owner: true,
    },
    orderBy: [
      { status: "asc" }, // Running first
      { createdAt: "desc" },
    ],
  });

  // Calculate experiment statistics
  const experimentStats = {
    total: experiments.length,
    running: experiments.filter(e => e.status === "RUNNING").length,
    completed: experiments.filter(e => e.status === "COMPLETED").length,
    draft: experiments.filter(e => e.status === "DRAFT").length,
  };

  const statusColors = {
    DRAFT: "bg-gray-100 text-gray-700",
    RUNNING: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    PAUSED: "bg-yellow-100 text-yellow-700",
  };

  const statusIcons = {
    DRAFT: Clock,
    RUNNING: Play,
    COMPLETED: CheckCircle,
    CANCELLED: AlertTriangle,
    PAUSED: Pause,
  };

  const typeColors = {
    AB_TEST: "bg-blue-100 text-blue-700 border-blue-200",
    MULTIVARIATE: "bg-purple-100 text-purple-700 border-purple-200",
    FEATURE_FLAG: "bg-green-100 text-green-700 border-green-200",
    QUALITATIVE: "bg-orange-100 text-orange-700 border-orange-200",
  };

  const typeIcons = {
    AB_TEST: "🅰️",
    MULTIVARIATE: "🎯",
    FEATURE_FLAG: "🚩",
    QUALITATIVE: "📊",
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
            <h1 className="text-3xl font-bold tracking-tight">Experiments</h1>
            <p className="text-muted-foreground">
              A/B tests and feature experiments for {product.name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canManageExperiments && (
            <Button asChild>
              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/experiments/new`}>
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
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{experimentStats.total}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{experimentStats.running}</div>
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
            <div className="text-2xl font-bold text-green-600">{experimentStats.completed}</div>
            <p className="text-xs text-muted-foreground">
              Finished experiments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{experimentStats.draft}</div>
            <p className="text-xs text-muted-foreground">
              In preparation
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
          </div>
        </CardContent>
      </Card>

      {/* Experiments List */}
      <div className="space-y-4">
        {experiments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No experiments yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start experimenting to optimize your product
                </p>
                {canManageExperiments && (
                  <Button asChild>
                    <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/experiments/new`}>
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
            const variants = Array.isArray(experiment.variants) ? experiment.variants : [];
            const metrics = Array.isArray(experiment.metrics) ? experiment.metrics : [];
            
            return (
              <Card key={experiment.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <StatusIcon className="h-5 w-5" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold">
                              <Link
                                href={`/orgs/${params.orgSlug}/products/${params.productKey}/experiments/${experiment.id}`}
                                className="hover:underline"
                              >
                                {experiment.name}
                              </Link>
                            </h3>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${statusColors[experiment.status]}`}
                            >
                              {experiment.status}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${typeColors[experiment.type]}`}
                            >
                              {typeIcons[experiment.type]} {experiment.type.replace("_", " ")}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            {experiment.owner && (
                              <div className="flex items-center space-x-1">
                                <Users className="h-3 w-3" />
                                <span>{experiment.owner.name}</span>
                              </div>
                            )}
                            
                            {experiment.startDate && (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {experiment.status === "RUNNING" ? "Started" : "Starts"} {format(new Date(experiment.startDate), "MMM d")}
                                </span>
                              </div>
                            )}
                            
                            {variants.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <Target className="h-3 w-3" />
                                <span>{variants.length} variants</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {experiment.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {experiment.description}
                        </p>
                      )}
                      
                      {experiment.hypothesis && (
                        <div className="bg-blue-50 p-3 rounded-lg mb-3">
                          <h4 className="text-sm font-medium text-blue-900 mb-1">Hypothesis</h4>
                          <p className="text-sm text-blue-700">{experiment.hypothesis}</p>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                        {metrics.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <BarChart3 className="h-4 w-4" />
                            <span>{metrics.length} metrics tracked</span>
                          </div>
                        )}
                        
                        {experiment.audience && (
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>{experiment.audience}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {experiment.status === "RUNNING" && experiment.endDate && (
                        <div className="text-right text-sm">
                          <div className="text-muted-foreground">Ends in</div>
                          <div className="font-medium">
                            {formatDistanceToNow(new Date(experiment.endDate))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/experiments/${experiment.id}`}>
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

                {variants.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Variants</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {variants.map((variant: any, index: number) => (
                          <div key={index} className="border rounded p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{variant.name}</span>
                              <span className="text-xs text-muted-foreground">{variant.allocation}%</span>
                            </div>
                            {variant.description && (
                              <p className="text-xs text-muted-foreground mt-1">{variant.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
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