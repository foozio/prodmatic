import { Suspense } from "react";
import Link from "next/link";
import {
  Kanban as KanbanIcon,
  Plus,
  Filter,
  Settings,
  Users,
  Calendar,
  Flag,
  Clock,
  User,
  MoreHorizontal,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface KanbanPageProps {
  params: Promise<{
    orgSlug: string;
  }>;
  searchParams: Promise<{
    sprint?: string;
    assignee?: string;
  }>;
}

async function KanbanContent({ orgSlug, searchParams }: {
  orgSlug: string;
  searchParams: { sprint?: string; assignee?: string; };
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("User not found");
  }

  // Get organization data with tasks and sprints
  const organization = await db.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      products: {
        include: {
          tasks: {
            where: {
              ...(searchParams.sprint && { sprintId: searchParams.sprint }),
              ...(searchParams.assignee && { assigneeId: searchParams.assignee }),
            },
            include: {
              assignee: {
                include: {
                  profile: true,
                },
              },
              feature: true,
              sprint: true,
            },
            orderBy: [
              { createdAt: 'desc' },
            ],
          },
          sprints: {
            where: {
              status: {
                in: ['PLANNED', 'ACTIVE'],
              },
            },
            orderBy: [
              { startDate: 'desc' },
            ],
          },
        },
      },
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  // Flatten tasks from all products and include product key
  const allTasks = organization.products.flatMap((product: any) => 
    product.tasks.map((task: any) => ({
      ...task,
      productKey: product.key
    }))
  );
  const allSprints = organization.products.flatMap((product: any) => product.sprints);

  // Group tasks by status
  const tasksByStatus = {
    'TODO': allTasks.filter((task: any) => task.status === 'TODO'),
    'IN_PROGRESS': allTasks.filter((task: any) => task.status === 'IN_PROGRESS'),
    'REVIEW': allTasks.filter((task: any) => task.status === 'REVIEW'),
    'DONE': allTasks.filter((task: any) => task.status === 'DONE'),
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500';
      case 'HIGH':
        return 'bg-orange-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      case 'LOW':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusTitle = (status: string) => {
    switch (status) {
      case 'TODO':
        return 'To Do';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'REVIEW':
        return 'Review';
      case 'DONE':
        return 'Done';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <KanbanIcon className="h-8 w-8 text-indigo-500" />
            Kanban Board
          </h1>
          <p className="text-gray-600 mt-1">
            Manage tasks and sprints across your product development
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Board Settings
          </Button>
          <Button asChild>
            <Link href={`/orgs/${orgSlug}/products/${organization.products[0]?.key || 'default'}/tasks/new`}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Link>
          </Button>
        </div>
      </div>

      {/* Active Sprint Info */}
      {allSprints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Active Sprint: {allSprints[0]?.name || 'Current Sprint'}
            </CardTitle>
            <CardDescription>
              {allSprints[0]?.description || 'Sprint in progress'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {allSprints[0]?.startDate && new Date(allSprints[0].startDate).toLocaleDateString()} - {allSprints[0]?.endDate && new Date(allSprints[0].endDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Flag className="h-4 w-4" />
                <span>{allTasks.length} tasks</span>
              </div>
              <Badge variant={allSprints[0]?.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {allSprints[0]?.status || 'ACTIVE'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[600px]">
        {Object.entries(tasksByStatus).map(([status, tasks]) => (
          <div key={status} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {getStatusTitle(status)}
                <Badge variant="secondary">{tasks.length}</Badge>
              </h3>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <Flag className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No tasks</p>
                </div>
              ) : (
                tasks.map((task: any) => (
                  <Card key={task.id} className="bg-white border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Priority indicator */}
                        <div className="flex items-start justify-between">
                          <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`} />
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Task title */}
                        <Link 
                          href={`/orgs/${orgSlug}/products/${task.productKey}/tasks/${task.id}`}
                          className="block"
                        >
                          <h4 className="font-medium text-sm text-gray-900 hover:text-blue-600 line-clamp-2">
                            {task.title}
                          </h4>
                        </Link>

                        {/* Task metadata */}
                        <div className="space-y-2">
                          {task.feature && (
                            <Badge variant="outline" className="text-xs">
                              {task.feature.title}
                            </Badge>
                          )}

                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{task.storyPoints || 0}sp</span>
                            </div>

                            {task.assignee && (
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={task.assignee.image || ""} />
                                <AvatarFallback className="text-xs">
                                  {task.assignee.name?.charAt(0) || task.assignee.email.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              {/* Add task button */}
              <Button 
                variant="ghost" 
                className="w-full border-2 border-dashed border-gray-300 hover:border-gray-400 h-16 text-gray-500 hover:text-gray-700"
                asChild
              >
                <Link href={`/orgs/${orgSlug}/products/${organization.products[0]?.key || 'default'}/tasks/new?status=${status}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add task
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Sprint Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allTasks.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{tasksByStatus.IN_PROGRESS.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{tasksByStatus.DONE.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Story Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {allTasks.reduce((sum: number, task: any) => sum + (task.storyPoints || 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function KanbanPage({ params, searchParams }: KanbanPageProps) {
  const { orgSlug } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <KanbanContent orgSlug={orgSlug} searchParams={resolvedSearchParams} />
    </Suspense>
  );
}