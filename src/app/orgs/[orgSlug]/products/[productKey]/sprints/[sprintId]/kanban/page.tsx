import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Plus, 
  MoreHorizontal, 
  Clock, 
  User, 
  Flag,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import Link from "next/link";

interface KanbanPageProps {
  params: {
    orgSlug: string;
    productKey: string;
    sprintId: string;
  };
}

export default async function KanbanPage({
  params,
}: KanbanPageProps) {
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

  const sprint = await db.sprint.findFirst({
    where: {
      id: params.sprintId,
      productId: product.id,
      deletedAt: null,
    },
    include: {
      tasks: {
        where: { deletedAt: null },
        include: {
          assignee: true,
          feature: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!sprint) {
    redirect(`/orgs/${params.orgSlug}/products/${params.productKey}/sprints`);
  }

  // Get team members for assignment
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

  // Group tasks by status
  const tasksByStatus = {
    NEW: sprint.tasks.filter(task => task.status === "NEW"),
    IN_PROGRESS: sprint.tasks.filter(task => task.status === "IN_PROGRESS"),
    IN_REVIEW: sprint.tasks.filter(task => task.status === "IN_REVIEW"),
    DONE: sprint.tasks.filter(task => task.status === "DONE"),
    CANCELLED: sprint.tasks.filter(task => task.status === "CANCELLED"),
  };

  const statusColors = {
    NEW: "bg-gray-100 text-gray-700",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    IN_REVIEW: "bg-yellow-100 text-yellow-700",
    DONE: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
  };

  const statusIcons = {
    NEW: Clock,
    IN_PROGRESS: User,
    IN_REVIEW: AlertTriangle,
    DONE: CheckCircle,
    CANCELLED: Flag,
  };

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
            <h1 className="text-3xl font-bold tracking-tight">{sprint.name}</h1>
            <p className="text-muted-foreground">
              Sprint Board • {sprint.tasks.length} tasks
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={sprint.status === "ACTIVE" ? "default" : "secondary"}>
            {sprint.status}
          </Badge>
          <Button size="sm" asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/tasks/new?sprintId=${sprint.id}`}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 h-[calc(100vh-200px)]">
        {Object.entries(tasksByStatus).map(([status, tasks]) => {
          const StatusIcon = statusIcons[status as keyof typeof statusIcons];
          
          return (
            <div key={status} className="flex flex-col">
              <div className={`flex items-center justify-between p-3 rounded-t-lg ${statusColors[status as keyof typeof statusColors]}`}>
                <div className="flex items-center space-x-2">
                  <StatusIcon className="h-4 w-4" />
                  <span className="font-medium text-sm">
                    {status.replace("_", " ")}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {tasks.length}
                </Badge>
              </div>
              
              <div className="flex-1 bg-gray-50 p-2 space-y-2 overflow-y-auto rounded-b-lg">
                {tasks.map((task) => (
                  <Card 
                    key={task.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${priorityColors[task.priority]}`}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">
                              {typeIcons[task.type]}
                            </span>
                            <h4 className="text-sm font-medium line-clamp-2">
                              {task.title}
                            </h4>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </div>

                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {task.effort && (
                              <Badge variant="outline" className="text-xs">
                                {task.effort}sp
                              </Badge>
                            )}
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                task.priority === "CRITICAL" ? "text-red-600 border-red-200" :
                                task.priority === "HIGH" ? "text-orange-600 border-orange-200" :
                                task.priority === "MEDIUM" ? "text-yellow-600 border-yellow-200" :
                                "text-green-600 border-green-200"
                              }`}
                            >
                              {task.priority}
                            </Badge>
                          </div>

                          {task.assignee && (
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={task.assignee.image || ""} />
                              <AvatarFallback className="text-xs">
                                {task.assignee.name?.split(" ").map(n => n[0]).join("") || "U"}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>

                        {task.feature && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-xs text-muted-foreground truncate">
                              {task.feature.title}
                            </span>
                          </div>
                        )}

                        {task.timeEstimate && task.timeSpent && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Progress</span>
                              <span>{task.timeSpent}h / {task.timeEstimate}h</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1">
                              <div 
                                className="bg-blue-500 h-1 rounded-full"
                                style={{ width: `${Math.min((task.timeSpent / task.timeEstimate) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {tasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No tasks in {status.replace("_", " ").toLowerCase()}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sprint Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Sprint Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(tasksByStatus).map(([status, tasks]) => {
              const totalEffort = tasks.reduce((sum, task) => sum + (task.effort || 0), 0);
              
              return (
                <div key={status} className="text-center">
                  <div className="text-2xl font-bold">{tasks.length}</div>
                  <div className="text-sm text-muted-foreground">
                    {status.replace("_", " ")}
                  </div>
                  {totalEffort > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {totalEffort} story points
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}