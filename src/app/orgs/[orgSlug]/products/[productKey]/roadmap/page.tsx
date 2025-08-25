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
  Calendar, 
  Target, 
  Filter, 
  Grid3X3,
  List,
  MoreHorizontal,
  MapPin,
  Clock,
  Users
} from "lucide-react";
import Link from "next/link";
import { format, startOfQuarter, endOfQuarter, addMonths } from "date-fns";

interface RoadmapPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
  searchParams: {
    view?: string;
    quarter?: string;
  };
}

export default async function RoadmapPage({
  params,
  searchParams,
}: RoadmapPageProps) {
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
  const canEditRoadmap = currentMembership?.role === "ADMIN" || currentMembership?.role === "PRODUCT_MANAGER";

  // Get roadmap items
  const roadmapItems = await db.roadmapItem.findMany({
    where: {
      productId: product.id,
      deletedAt: null,
    },
    include: {
      epic: {
        include: {
          features: {
            where: { deletedAt: null },
            include: {
              tasks: {
                where: { deletedAt: null },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { quarter: "asc" },
      { lane: "asc" },
      { createdAt: "asc" },
    ],
  });

  // Generate quarters for the next 12 months
  const currentDate = new Date();
  const quarters = Array.from({ length: 4 }, (_, i) => {
    const quarterStart = startOfQuarter(addMonths(currentDate, i * 3));
    const quarterEnd = endOfQuarter(quarterStart);
    const year = quarterStart.getFullYear();
    const quarter = Math.ceil((quarterStart.getMonth() + 1) / 3);
    return {
      key: `${year}-Q${quarter}`,
      label: `Q${quarter} ${year}`,
      start: quarterStart,
      end: quarterEnd,
    };
  });

  // Group roadmap items by lane and quarter
  const lanes = ["NOW", "NEXT", "LATER", "PARKED"] as const;
  const itemsByLaneAndQuarter = lanes.reduce((acc, lane) => {
    acc[lane] = {};
    quarters.forEach(quarter => {
      acc[lane][quarter.key] = roadmapItems.filter(
        item => item.lane === lane && item.quarter === quarter.key
      );
    });
    // Add items without specific quarters
    acc[lane]["unscheduled"] = roadmapItems.filter(
      item => item.lane === lane && !item.quarter
    );
    return acc;
  }, {} as Record<string, Record<string, any[]>>);

  const statusColors = {
    PLANNED: "bg-gray-100 text-gray-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    ON_HOLD: "bg-yellow-100 text-yellow-700",
  };

  const typeIcons = {
    EPIC: "🎯",
    FEATURE: "⭐",
    INITIATIVE: "🚀",
    MILESTONE: "🏁",
  };

  const laneColors = {
    NOW: "border-l-green-500 bg-green-50",
    NEXT: "border-l-blue-500 bg-blue-50",
    LATER: "border-l-yellow-500 bg-yellow-50",
    PARKED: "border-l-gray-500 bg-gray-50",
  };

  const isTimelineView = searchParams.view !== "list";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Roadmap</h1>
          <p className="text-muted-foreground">
            Strategic planning and timeline for {product.name}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex border rounded-lg">
            <Button
              variant={isTimelineView ? "default" : "ghost"}
              size="sm"
              asChild
            >
              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/roadmap?view=timeline`}>
                <Grid3X3 className="h-4 w-4 mr-2" />
                Timeline
              </Link>
            </Button>
            <Button
              variant={!isTimelineView ? "default" : "ghost"}
              size="sm"
              asChild
            >
              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/roadmap?view=list`}>
                <List className="h-4 w-4 mr-2" />
                List
              </Link>
            </Button>
          </div>
          {canEditRoadmap && (
            <Button asChild>
              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/roadmap/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Roadmap Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roadmapItems.length}</div>
            <p className="text-xs text-muted-foreground">
              Across all lanes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roadmapItems.filter(item => item.status === "IN_PROGRESS").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently being worked on
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Quarter</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roadmapItems.filter(item => item.quarter === quarters[0].key).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {quarters[0].label}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roadmapItems.filter(item => item.status === "COMPLETED").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Delivered items
            </p>
          </CardContent>
        </Card>
      </div>

      {isTimelineView ? (
        /* Timeline View */
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">Filter by quarter:</span>
            <div className="flex space-x-1">
              {quarters.map(quarter => (
                <Button
                  key={quarter.key}
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/roadmap?quarter=${quarter.key}`}>
                    {quarter.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            {lanes.map(lane => (
              <Card key={lane}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <div className={`w-4 h-4 rounded mr-3 ${
                      lane === "NOW" ? "bg-green-500" :
                      lane === "NEXT" ? "bg-blue-500" :
                      lane === "LATER" ? "bg-yellow-500" : "bg-gray-500"
                    }`} />
                    {lane}
                    <Badge variant="outline" className="ml-2">
                      {Object.values(itemsByLaneAndQuarter[lane]).flat().length} items
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {lane === "NOW" && "Currently being worked on"}
                    {lane === "NEXT" && "Up next in the pipeline"}
                    {lane === "LATER" && "Future considerations"}
                    {lane === "PARKED" && "On hold or deprioritized"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    {quarters.map(quarter => (
                      <div key={quarter.key} className="space-y-3">
                        <div className="text-sm font-medium text-muted-foreground">
                          {quarter.label}
                        </div>
                        {itemsByLaneAndQuarter[lane][quarter.key]?.map(item => (
                          <Card 
                            key={item.id}
                            className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${laneColors[lane]}`}
                          >
                            <CardContent className="p-3">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm">
                                      {typeIcons[item.type as keyof typeof typeIcons] || "📝"}
                                    </span>
                                    <h4 className="text-sm font-medium line-clamp-1">
                                      {item.title}
                                    </h4>
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </div>

                                {item.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {item.description}
                                  </p>
                                )}

                                <div className="flex items-center justify-between">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${statusColors[item.status as keyof typeof statusColors] || "bg-gray-100 text-gray-700"}`}
                                  >
                                    {item.status}
                                  </Badge>
                                  
                                  {item.effort && (
                                    <span className="text-xs text-muted-foreground">
                                      {item.effort} pts
                                    </span>
                                  )}
                                </div>

                                {item.epic && (
                                  <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <span className="text-xs text-muted-foreground truncate">
                                      {item.epic.title}
                                    </span>
                                  </div>
                                )}

                                {item.epic?.features && item.epic.features.length > 0 && (
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">Progress</div>
                                    <Progress 
                                      value={
                                        item.epic.features.reduce((acc: number, f: any) => 
                                          acc + f.tasks.filter((t: any) => t.status === "DONE").length, 0
                                        ) / Math.max(1, item.epic.features.reduce((acc: number, f: any) => acc + f.tasks.length, 0)) * 100
                                      } 
                                      className="h-1"
                                    />
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        
                        {itemsByLaneAndQuarter[lane][quarter.key]?.length === 0 && (
                          <div className="text-center py-4 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                            No items planned
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* List View */
        <Card>
          <CardHeader>
            <CardTitle>All Roadmap Items</CardTitle>
            <CardDescription>
              Complete list of roadmap items across all quarters
            </CardDescription>
          </CardHeader>
          <CardContent>
            {roadmapItems.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No roadmap items yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start planning your product roadmap by adding the first item
                </p>
                {canEditRoadmap && (
                  <Button asChild>
                    <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/roadmap/new`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Item
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {roadmapItems.map(item => (
                  <div key={item.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-lg">{typeIcons[item.type]}</span>
                          <div>
                            <h3 className="font-medium">{item.title}</h3>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Badge 
                                variant="outline" 
                                className={statusColors[item.status]}
                              >
                                {item.status}
                              </Badge>
                              <Badge variant="outline">
                                {item.lane}
                              </Badge>
                              {item.quarter && (
                                <Badge variant="outline">
                                  {item.quarter}
                                </Badge>
                              )}
                              {item.effort && (
                                <span>{item.effort} story points</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {item.description && (
                          <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/roadmap/${item.id}`}>
                            View
                          </Link>
                        </Button>
                        {canEditRoadmap && (
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}