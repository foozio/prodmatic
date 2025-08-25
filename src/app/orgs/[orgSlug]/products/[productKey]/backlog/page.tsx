import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  Plus, 
  Filter, 
  Search, 
  MoreHorizontal, 
  Clock, 
  User, 
  Flag,
  Target,
  Move,
  Archive
} from "lucide-react";
import Link from "next/link";
import { moveTaskToSprint, bulkUpdateTasks } from "@/server/actions/tasks";

interface BacklogPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
  searchParams: {
    filter?: string;
    priority?: string;
    type?: string;
    assignee?: string;
  };
}

export default async function BacklogPage({
  params,
  searchParams,
}: BacklogPageProps) {
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

  // Build filters
  const whereConditions: any = {
    productId: product.id,
    deletedAt: null,
    sprintId: null, // Only backlog items (no sprint assigned)
  };

  if (searchParams.priority) {
    whereConditions.priority = searchParams.priority;
  }

  if (searchParams.type) {
    whereConditions.type = searchParams.type;
  }

  if (searchParams.assignee) {
    whereConditions.assigneeId = searchParams.assignee;
  }

  if (searchParams.filter) {
    whereConditions.OR = [
      { title: { contains: searchParams.filter, mode: "insensitive" } },
      { description: { contains: searchParams.filter, mode: "insensitive" } },
    ];
  }

  // Get backlog tasks
  const backlogTasks = await db.task.findMany({
    where: whereConditions,
    include: {
      assignee: true,
      feature: {
        include: {
          epic: true,
        },
      },
    },
    orderBy: [
      { priority: "desc" },
      { createdAt: "desc" },
    ],
  });

  // Get available sprints for moving tasks
  const activeSprints = await db.sprint.findMany({
    where: {
      productId: product.id,
      deletedAt: null,
      status: { in: ["PLANNED", "ACTIVE"] },
    },
    orderBy: { startDate: "asc" },
  });

  // Get team members for filtering
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

  const priorityColors = {
    CRITICAL: "border-l-red-500 bg-red-50",
    HIGH: "border-l-orange-500 bg-orange-50",
    MEDIUM: "border-l-yellow-500 bg-yellow-50",
    LOW: "border-l-green-500 bg-green-50",
  };

  const typeIcons = {
    STORY: "📖",
    BUG: "🐛",
    TASK: "✅",
    EPIC: "🎯",
    SPIKE: "🔬",
  };

  const priorityBadgeColors = {
    CRITICAL: "bg-red-100 text-red-700 border-red-200",
    HIGH: "bg-orange-100 text-orange-700 border-orange-200",
    MEDIUM: "bg-yellow-100 text-yellow-700 border-yellow-200",
    LOW: "bg-green-100 text-green-700 border-green-200",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/sprints`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sprints
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Product Backlog</h1>
            <p className="text-muted-foreground">
              {product.name} • {backlogTasks.length} items in backlog
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button size="sm" asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/tasks/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  className="pl-9"
                  defaultValue={searchParams.filter}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              
              <select 
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={searchParams.priority || ""}
              >
                <option value="">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select 
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={searchParams.type || ""}
              >
                <option value="">All Types</option>
                <option value="STORY">Stories</option>
                <option value="BUG">Bugs</option>
                <option value="TASK">Tasks</option>
                <option value="EPIC">Epics</option>
              </select>

              <select 
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={searchParams.assignee || ""}
              >
                <option value="">All Assignees</option>
                <option value="unassigned">Unassigned</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backlog Items */}
      <div className="space-y-3">
        {backlogTasks.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No backlog items</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first task or user story.
                </p>
                <Button asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/tasks/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Task
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          backlogTasks.map((task, index) => (
            <Card 
              key={task.id}
              className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${priorityColors[task.priority]}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Priority Indicator */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                      {index + 1}
                    </div>

                    {/* Task Details */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">
                          {typeIcons[task.type]}
                        </span>
                        <h3 className="text-sm font-medium">
                          {task.title}
                        </h3>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${priorityBadgeColors[task.priority]}`}
                        >
                          {task.priority}
                        </Badge>
                      </div>

                      {task.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-4">
                        {task.effort && (
                          <div className="flex items-center space-x-1">
                            <Target className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {task.effort} SP
                            </span>
                          </div>
                        )}

                        {task.timeEstimate && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {task.timeEstimate}h
                            </span>
                          </div>
                        )}

                        {task.feature && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-xs text-muted-foreground">
                              {task.feature.title}
                            </span>
                            {task.feature.epic && (
                              <span className="text-xs text-muted-foreground">
                                • {task.feature.epic.title}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {task.assignee ? (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={task.assignee.image || ""} />
                        <AvatarFallback className="text-xs">
                          {task.assignee.name?.split(" ").map(n => n[0]).join("") || "U"}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}

                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Move className="h-3 w-3" />
                    </Button>

                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Sprint Planning Section */}
      {activeSprints.length > 0 && backlogTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sprint Planning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeSprints.map((sprint) => (
                <div key={sprint.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{sprint.name}</h4>
                    <Badge variant={sprint.status === "ACTIVE" ? "default" : "secondary"}>
                      {sprint.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    asChild
                  >
                    <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/sprints/${sprint.id}/kanban`}>
                      <Move className="h-4 w-4 mr-2" />
                      Plan Sprint
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Actions */}
      {backlogTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Archive className="h-4 w-4 mr-2" />
                Archive Selected
              </Button>
              <Button variant="outline" size="sm">
                <Flag className="h-4 w-4 mr-2" />
                Change Priority
              </Button>
              <Button variant="outline" size="sm">
                <User className="h-4 w-4 mr-2" />
                Assign to Sprint
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}