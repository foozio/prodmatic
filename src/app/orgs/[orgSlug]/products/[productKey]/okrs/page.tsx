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
  Minus, 
  Calendar, 
  Filter,
  MoreHorizontal,
  CheckCircle,
  AlertTriangle,
  Clock
} from "lucide-react";
import Link from "next/link";
import { format, startOfQuarter, endOfQuarter } from "date-fns";

interface OKRsPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
  searchParams: {
    quarter?: string;
    status?: string;
  };
}

export default async function OKRsPage({
  params,
  searchParams,
}: OKRsPageProps) {
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
  const canManageOKRs = currentMembership?.role === "ADMIN" || currentMembership?.role === "PRODUCT_MANAGER";

  // Build filters
  const whereConditions: any = {
    productId: product.id,
    deletedAt: null,
  };

  if (searchParams.quarter) {
    whereConditions.quarter = searchParams.quarter;
  }

  if (searchParams.status) {
    whereConditions.status = searchParams.status;
  }

  const okrs = await db.oKR.findMany({
    where: whereConditions,
    include: {
      owner: true,
      keyResults: {
        where: { deletedAt: null },
      },
    },
    orderBy: [
      { year: "desc" },
      { quarter: "desc" },
      { createdAt: "desc" },
    ],
  });

  // Generate current and upcoming quarters
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentQuarter = Math.ceil((currentDate.getMonth() + 1) / 3);
  const quarters = [
    `${currentYear}-Q${currentQuarter}`,
    `${currentYear}-Q${Math.min(currentQuarter + 1, 4)}`,
    currentQuarter === 4 ? `${currentYear + 1}-Q1` : `${currentYear}-Q${currentQuarter + 1}`,
  ];

  // Calculate OKR statistics
  const okrStats = {
    total: okrs.length,
    active: okrs.filter(okr => okr.status === "ACTIVE").length,
    completed: okrs.filter(okr => okr.status === "COMPLETED").length,
    atRisk: okrs.filter(okr => okr.progress < 0.3 && okr.status === "ACTIVE").length,
    avgProgress: okrs.length > 0 
      ? okrs.filter(okr => okr.status === "ACTIVE").reduce((acc, okr) => acc + okr.progress, 0) / Math.max(1, okrs.filter(okr => okr.status === "ACTIVE").length)
      : 0,
  };

  const statusColors = {
    ACTIVE: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    ARCHIVED: "bg-gray-100 text-gray-700",
  };

  const statusIcons = {
    ACTIVE: Target,
    COMPLETED: CheckCircle,
    CANCELLED: AlertTriangle,
    ARCHIVED: Clock,
  };

  const keyResultTypeIcons = {
    INCREASE: TrendingUp,
    DECREASE: TrendingDown,
    MAINTAIN: Minus,
    BINARY: CheckCircle,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">OKRs & Goals</h1>
          <p className="text-muted-foreground">
            Objectives and Key Results for {product.name}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {canManageOKRs && (
            <Button asChild>
              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/okrs/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New OKR
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* OKR Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total OKRs</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{okrStats.total}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{okrStats.active}</div>
            <p className="text-xs text-muted-foreground">
              Currently tracking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{okrStats.atRisk}</div>
            <p className="text-xs text-muted-foreground">
              Below 30% progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(okrStats.avgProgress * 100)}%</div>
            <p className="text-xs text-muted-foreground">
              Active OKRs
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
              defaultValue={searchParams.quarter || ""}
            >
              <option value="">All Quarters</option>
              {quarters.map(quarter => (
                <option key={quarter} value={quarter}>
                  {quarter}
                </option>
              ))}
            </select>

            <select 
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={searchParams.status || ""}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* OKRs List */}
      <div className="space-y-6">
        {okrs.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No OKRs yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start tracking objectives and key results for your product
                </p>
                {canManageOKRs && (
                  <Button asChild>
                    <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/okrs/new`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First OKR
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          okrs.map((okr) => {
            const StatusIcon = statusIcons[okr.status];
            const progressPercentage = Math.round(okr.progress * 100);
            
            return (
              <Card key={okr.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <StatusIcon className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">{okr.objective}</h3>
                        <Badge 
                          variant="outline" 
                          className={statusColors[okr.status]}
                        >
                          {okr.status}
                        </Badge>
                        <Badge variant="outline">
                          {okr.quarter} {okr.year}
                        </Badge>
                      </div>
                      
                      {okr.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {okr.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={okr.owner.image || ""} />
                            <AvatarFallback className="text-xs">
                              {okr.owner.name?.split(" ").map(n => n[0]).join("") || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span>Owner: {okr.owner.name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>{okr.keyResults.length} Key Results</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold">{progressPercentage}%</div>
                        <div className="text-xs text-muted-foreground">Progress</div>
                      </div>
                      <Progress value={progressPercentage} className="w-24" />
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Key Results
                    </div>
                    {okr.keyResults.map((kr) => {
                      const TypeIcon = keyResultTypeIcons[kr.type];
                      const krProgress = kr.target > 0 ? (kr.current / kr.target) * 100 : 0;
                      
                      return (
                        <div key={kr.id} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{kr.description}</span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    kr.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                                    kr.status === "AT_RISK" ? "bg-orange-100 text-orange-700" :
                                    "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {kr.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {kr.current.toLocaleString()} / {kr.target.toLocaleString()} {kr.unit}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <div className="text-right text-sm">
                                <div className="font-medium">{Math.round(krProgress)}%</div>
                              </div>
                              <Progress value={Math.min(krProgress, 100)} className="w-16" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}