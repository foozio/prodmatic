import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Calendar, 
  Plus, 
  Play, 
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  Target,
  Activity,
  Filter,
  MoreHorizontal,
  Archive
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow, format, differenceInDays } from "date-fns";

interface SprintsPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
}

const sprintStatusColors = {
  PLANNED: "bg-gray-500",
  ACTIVE: "bg-blue-500",
  COMPLETED: "bg-green-500",
  CANCELLED: "bg-red-500",
};

const sprintStatusIcons = {
  PLANNED: Clock,
  ACTIVE: Play,
  COMPLETED: CheckCircle,
  CANCELLED: XCircle,
};

export default async function SprintsPage({
  params,
}: SprintsPageProps) {
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
  await requireRole(user.id, organization.id, ["ADMIN", "PRODUCT_MANAGER", "CONTRIBUTOR"]);

  const sprints = await db.sprint.findMany({
    where: {
      productId: product.id,
      deletedAt: null,
    },
    include: {
      tasks: {
        where: {
          deletedAt: null,
        },
        include: {
          assignee: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });

  const currentMembership = user.memberships.find(m => m.organizationId === organization.id);
  const canManageSprints = currentMembership?.role === "ADMIN" || currentMembership?.role === "PRODUCT_MANAGER";

  const activeSprint = sprints.find(s => s.status === "ACTIVE");
  const upcomingSprints = sprints.filter(s => s.status === "PLANNED");
  const completedSprints = sprints.filter(s => s.status === "COMPLETED");

  const sprintStats = {
    total: sprints.length,
    active: sprints.filter(s => s.status === "ACTIVE").length,
    planned: sprints.filter(s => s.status === "PLANNED").length,
    completed: sprints.filter(s => s.status === "COMPLETED").length,
    avgVelocity: completedSprints.length > 0 
      ? Math.round(completedSprints.reduce((acc, s) => acc + (s.velocity || 0), 0) / completedSprints.length)
      : 0,
  };

  const backlogTasks = await db.task.findMany({
    where: {
      productId: product.id,
      sprintId: null,
      deletedAt: null,
      status: {
        not: "DONE",
      },
    },
    include: {
      assignee: {
        include: {
          profile: true,
        },
      },
      feature: true,
    },
    orderBy: {
      priority: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sprint Management</h1>
          <p className="text-muted-foreground">
            Plan and manage development sprints for {product.name}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/backlog`}>
              <Target className="h-4 w-4 mr-2" />
              Backlog
            </Link>
          </Button>
          {canManageSprints && (
            <Button asChild>
              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/sprints/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New Sprint
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Sprint Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sprints</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sprintStats.total}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sprint</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sprintStats.active}</div>
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planned</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sprintStats.planned}</div>
            <p className="text-xs text-muted-foreground">
              Upcoming sprints
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Velocity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sprintStats.avgVelocity}</div>
            <p className="text-xs text-muted-foreground">
              Story points per sprint
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Sprint */}
      {activeSprint && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Play className="h-5 w-5 mr-2 text-blue-600" />
                  {activeSprint.name}
                  <Badge variant="secondary" className="ml-2 text-white bg-blue-500">
                    Active
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {activeSprint.goal}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/sprints/${activeSprint.id}`}>
                    View Details
                  </Link>
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Duration</div>
                <div className="text-sm font-medium">
                  {format(new Date(activeSprint.startDate), "MMM d")} - {format(new Date(activeSprint.endDate), "MMM d, yyyy")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {differenceInDays(new Date(activeSprint.endDate), new Date())} days remaining
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground mb-2">Progress</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tasks Completed</span>
                    <span>
                      {activeSprint.tasks.filter(t => t.status === "DONE").length} / {activeSprint.tasks.length}
                    </span>
                  </div>
                  <Progress 
                    value={activeSprint.tasks.length > 0 
                      ? (activeSprint.tasks.filter(t => t.status === "DONE").length / activeSprint.tasks.length) * 100 
                      : 0
                    } 
                    className="h-2"
                  />
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-2">Team Capacity</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Story Points</span>
                    <span>
                      {activeSprint.tasks.reduce((acc, t) => acc + (t.effort || 0), 0)} / {activeSprint.capacity || 0}
                    </span>
                  </div>
                  <Progress 
                    value={activeSprint.capacity 
                      ? (activeSprint.tasks.reduce((acc, t) => acc + (t.effort || 0), 0) / activeSprint.capacity) * 100 
                      : 0
                    } 
                    className="h-2"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm text-muted-foreground mb-2">Sprint Tasks</div>
              <div className="flex flex-wrap gap-2">
                {activeSprint.tasks.slice(0, 8).map((task) => (
                  <div key={task.id} className="flex items-center space-x-2 text-xs bg-muted rounded px-2 py-1">
                    <div className={`w-2 h-2 rounded-full ${
                      task.status === "DONE" ? "bg-green-500" :
                      task.status === "IN_PROGRESS" ? "bg-blue-500" :
                      task.status === "IN_REVIEW" ? "bg-yellow-500" : "bg-gray-500"
                    }`} />
                    <span className="truncate max-w-24">{task.title}</span>
                    {task.assignee && (
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-xs">
                          {(task.assignee.name || task.assignee.email).charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {activeSprint.tasks.length > 8 && (
                  <div className="text-xs text-muted-foreground px-2 py-1">
                    +{activeSprint.tasks.length - 8} more
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sprint List */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Sprints</CardTitle>
                  <CardDescription>
                    Sprint planning and execution history
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sprints.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No sprints yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Create your first sprint to start organizing development work
                  </p>
                  {canManageSprints && (
                    <Button asChild>
                      <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/sprints/new`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Sprint
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {sprints.map((sprint) => {
                    const StatusIcon = sprintStatusIcons[sprint.status];
                    const completedTasks = sprint.tasks.filter(t => t.status === "DONE").length;
                    const totalTasks = sprint.tasks.length;
                    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                    
                    return (
                      <div key={sprint.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <StatusIcon className="h-4 w-4" />
                              <div>
                                <h3 className="font-medium">
                                  <Link
                                    href={`/orgs/${params.orgSlug}/products/${params.productKey}/sprints/${sprint.id}`}
                                    className="hover:underline"
                                  >
                                    {sprint.name}
                                  </Link>
                                </h3>
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                  <Badge 
                                    variant="secondary" 
                                    className={`text-white ${sprintStatusColors[sprint.status]}`}
                                  >
                                    {sprint.status}
                                  </Badge>
                                  <span>
                                    {format(new Date(sprint.startDate), "MMM d")} - {format(new Date(sprint.endDate), "MMM d, yyyy")}
                                  </span>
                                  {sprint.velocity && (
                                    <span>Velocity: {sprint.velocity} pts</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {sprint.goal && (
                              <p className="text-sm text-muted-foreground mb-2">{sprint.goal}</p>
                            )}
                            
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Activity className="h-4 w-4" />
                                <span>{totalTasks} tasks</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <CheckCircle className="h-4 w-4" />
                                <span>{completedTasks} completed</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Users className="h-4 w-4" />
                                <span>{new Set(sprint.tasks.map(t => t.assigneeId).filter(Boolean)).size} assignees</span>
                              </div>
                              {sprint.status === "ACTIVE" && (
                                <div className="flex items-center space-x-2">
                                  <Progress value={completionRate} className="w-16 h-2" />
                                  <span>{Math.round(completionRate)}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/sprints/${sprint.id}`}>
                                View
                              </Link>
                            </Button>
                            {canManageSprints && (
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Backlog Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Backlog Summary</CardTitle>
              <CardDescription>
                Unscheduled tasks ready for sprint planning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Tasks</span>
                  <Badge variant="outline">{backlogTasks.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Story Points</span>
                  <Badge variant="outline">
                    {backlogTasks.reduce((acc, t) => acc + (t.effort || 0), 0)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">By Priority</div>
                  <div className="space-y-1">
                    {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(priority => {
                      const count = backlogTasks.filter(t => t.priority === priority).length;
                      return (
                        <div key={priority} className="flex justify-between text-xs">
                          <span className="capitalize">{priority.toLowerCase()}</span>
                          <span>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/backlog`}>
                    View Full Backlog
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {canManageSprints && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/sprints/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Plan New Sprint
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/backlog`}>
                    <Target className="h-4 w-4 mr-2" />
                    Groom Backlog
                  </Link>
                </Button>
                {activeSprint && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/sprints/${activeSprint.id}/kanban`}>
                      <Activity className="h-4 w-4 mr-2" />
                      Active Sprint Board
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}