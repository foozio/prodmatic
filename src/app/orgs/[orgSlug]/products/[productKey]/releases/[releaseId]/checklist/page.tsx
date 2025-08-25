import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Settings, 
  Users, 
  Server, 
  BarChart3, 
  MessageSquare, 
  RotateCcw,
  Calendar,
  Filter,
  ChevronDown,
  ChevronRight,
  MoreHorizontal
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toggleChecklistItem, bulkCreateChecklistItems } from "@/server/actions/launch-checklist";

interface ChecklistPageProps {
  params: {
    orgSlug: string;
    productKey: string;
    releaseId: string;
  };
  searchParams: {
    category?: string;
    status?: string;
  };
}

export default async function ChecklistPage({
  params,
  searchParams,
}: ChecklistPageProps) {
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
  const canManageChecklist = currentMembership?.role === "ADMIN" || 
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

  // Build filters
  const whereConditions: any = {
    releaseId: params.releaseId,
    deletedAt: null,
  };

  if (searchParams.category) {
    whereConditions.category = searchParams.category;
  }

  if (searchParams.status === "completed") {
    whereConditions.isCompleted = true;
  } else if (searchParams.status === "pending") {
    whereConditions.isCompleted = false;
  }

  const checklistItems = await db.launchChecklistItem.findMany({
    where: whereConditions,
    include: {
      assignee: true,
    },
    orderBy: [
      { category: "asc" },
      { isRequired: "desc" },
      { createdAt: "asc" },
    ],
  });

  // Group items by category
  const categories = ["PREPARATION", "TESTING", "DEPLOYMENT", "MONITORING", "COMMUNICATION", "ROLLBACK"] as const;
  const itemsByCategory = categories.reduce((acc, category) => {
    acc[category] = checklistItems.filter((item: any) => item.category === category);
    return acc;
  }, {} as Record<string, any[]>);

  const categoryIcons = {
    PREPARATION: Settings,
    TESTING: CheckCircle2,
    DEPLOYMENT: Server,
    MONITORING: BarChart3,
    COMMUNICATION: MessageSquare,
    ROLLBACK: RotateCcw,
  };

  const categoryColors = {
    PREPARATION: "bg-blue-50 border-blue-200",
    TESTING: "bg-green-50 border-green-200",
    DEPLOYMENT: "bg-purple-50 border-purple-200",
    MONITORING: "bg-orange-50 border-orange-200",
    COMMUNICATION: "bg-pink-50 border-pink-200",
    ROLLBACK: "bg-red-50 border-red-200",
  };

  // Calculate progress
  const totalItems = checklistItems.length;
  const completedItems = checklistItems.filter((item: any) => item.isCompleted).length;
  const requiredItems = checklistItems.filter((item: any) => item.isRequired).length;
  const completedRequiredItems = checklistItems.filter((item: any) => item.isRequired && item.isCompleted).length;
  const overallProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
  const requiredProgress = requiredItems > 0 ? (completedRequiredItems / requiredItems) * 100 : 0;

  const overdueItems = checklistItems.filter((item: any) => 
    !item.isCompleted && 
    item.dueDate && 
    new Date(item.dueDate) < new Date()
  ).length;

  async function handleToggleItem(itemId: string, isCompleted: boolean) {
    "use server";
    if (!organization) {
      throw new Error("Organization not found");
    }
    await toggleChecklistItem(itemId, organization.id, isCompleted);
  }

  async function handleBulkCreate(templateType: "BASIC" | "COMPREHENSIVE" | "ENTERPRISE") {
    "use server";
    if (!organization) {
      throw new Error("Organization not found");
    }
    await bulkCreateChecklistItems(params.releaseId, organization.id, templateType);
  }

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
              Launch Checklist - {release.name}
            </h1>
            <p className="text-muted-foreground">
              Version {release.version} • {completedItems}/{totalItems} completed
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canManageChecklist && totalItems === 0 && (
            <div className="flex space-x-1">
              <form action={handleBulkCreate.bind(null, "BASIC")}>
                <Button variant="outline" size="sm" type="submit">
                  Basic Template
                </Button>
              </form>
              <form action={handleBulkCreate.bind(null, "COMPREHENSIVE")}>
                <Button variant="outline" size="sm" type="submit">
                  Comprehensive
                </Button>
              </form>
              <form action={handleBulkCreate.bind(null, "ENTERPRISE")}>
                <Button variant="outline" size="sm" type="submit">
                  Enterprise
                </Button>
              </form>
            </div>
          )}
          {canManageChecklist && (
            <Button asChild>
              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases/${params.releaseId}/checklist/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(overallProgress)}%</div>
            <p className="text-xs text-muted-foreground">
              {completedItems} of {totalItems} items
            </p>
            <Progress value={overallProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Required Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(requiredProgress)}%</div>
            <p className="text-xs text-muted-foreground">
              {completedRequiredItems} of {requiredItems} required
            </p>
            <Progress value={requiredProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueItems}</div>
            <p className="text-xs text-muted-foreground">
              Past due date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Release Readiness</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              requiredProgress === 100 ? "text-green-600" : 
              requiredProgress >= 80 ? "text-yellow-600" : "text-red-600"
            }`}>
              {requiredProgress === 100 ? "Ready" : 
               requiredProgress >= 80 ? "Almost" : "Not Ready"}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on required items
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
              defaultValue={searchParams.category || ""}
            >
              <option value="">All Categories</option>
              <option value="PREPARATION">Preparation</option>
              <option value="TESTING">Testing</option>
              <option value="DEPLOYMENT">Deployment</option>
              <option value="MONITORING">Monitoring</option>
              <option value="COMMUNICATION">Communication</option>
              <option value="ROLLBACK">Rollback</option>
            </select>

            <select 
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              defaultValue={searchParams.status || ""}
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items by Category */}
      <div className="space-y-6">
        {totalItems === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No checklist items yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start with a template or create custom checklist items for this release
                </p>
                {canManageChecklist && (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="flex space-x-2">
                      <form action={handleBulkCreate.bind(null, "BASIC")}>
                        <Button variant="outline" type="submit">
                          Use Basic Template
                        </Button>
                      </form>
                      <form action={handleBulkCreate.bind(null, "COMPREHENSIVE")}>
                        <Button variant="outline" type="submit">
                          Use Comprehensive Template
                        </Button>
                      </form>
                      <form action={handleBulkCreate.bind(null, "ENTERPRISE")}>
                        <Button variant="outline" type="submit">
                          Use Enterprise Template
                        </Button>
                      </form>
                    </div>
                    <p className="text-sm text-muted-foreground">or</p>
                    <Button asChild>
                      <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases/${params.releaseId}/checklist/new`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Custom Item
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          categories.map(category => {
            const items = itemsByCategory[category];
            if (items.length === 0) return null;

            const CategoryIcon = categoryIcons[category];
            const completedInCategory = items.filter(item => item.isCompleted).length;
            const progressInCategory = (completedInCategory / items.length) * 100;

            return (
              <Card key={category} className={categoryColors[category]}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CategoryIcon className="h-5 w-5" />
                      <div>
                        <CardTitle className="text-lg">
                          {category.replace("_", " ")}
                        </CardTitle>
                        <CardDescription>
                          {completedInCategory}/{items.length} completed
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Progress value={progressInCategory} className="w-24" />
                      <span className="text-sm font-medium">
                        {Math.round(progressInCategory)}%
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {items.map(item => (
                      <div 
                        key={item.id}
                        className={`flex items-start space-x-3 p-3 rounded-lg border ${
                          item.isCompleted ? "bg-white/50" : "bg-white"
                        }`}
                      >
                        <form action={handleToggleItem.bind(null, item.id, !item.isCompleted)}>
                          <button type="submit" className="mt-1">
                            <Checkbox 
                              checked={item.isCompleted}
                              className="h-4 w-4"
                            />
                          </button>
                        </form>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className={`font-medium ${
                              item.isCompleted ? "line-through text-muted-foreground" : ""
                            }`}>
                              {item.title}
                            </h4>
                            {item.isRequired && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                            {item.dueDate && new Date(item.dueDate) < new Date() && !item.isCompleted && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>
                          
                          {item.description && (
                            <p className={`text-sm mb-2 ${
                              item.isCompleted ? "text-muted-foreground" : "text-muted-foreground"
                            }`}>
                              {item.description}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            {item.assignee && (
                              <div className="flex items-center space-x-1">
                                <Users className="h-3 w-3" />
                                <Avatar className="h-4 w-4">
                                  <AvatarImage src={item.assignee.image || ""} />
                                  <AvatarFallback className="text-xs">
                                    {item.assignee.name?.split(" ").map((n: string) => n[0]).join("") || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{item.assignee.name}</span>
                              </div>
                            )}
                            
                            {item.dueDate && (
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-3 w-3" />
                                <span>Due {format(new Date(item.dueDate), "MMM d")}</span>
                              </div>
                            )}
                            
                            {item.completedAt && (
                              <div className="flex items-center space-x-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Completed {format(new Date(item.completedAt), "MMM d")}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {canManageChecklist && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
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