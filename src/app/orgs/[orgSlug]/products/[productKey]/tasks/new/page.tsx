import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, User, Flag, Target } from "lucide-react";
import Link from "next/link";
import { createTask } from "@/server/actions/tasks";

interface NewTaskPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
  searchParams: {
    sprintId?: string;
    featureId?: string;
  };
}

export default async function NewTaskPage({
  params,
  searchParams,
}: NewTaskPageProps) {
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

  // Get available sprints
  const sprints = await db.sprint.findMany({
    where: {
      productId: product.id,
      deletedAt: null,
      status: { in: ["PLANNED", "ACTIVE"] },
    },
    orderBy: { startDate: "asc" },
  });

  // Get available features
  const features = await db.feature.findMany({
    where: {
      productId: product.id,
      deletedAt: null,
      status: { not: "DONE" },
    },
    include: {
      epic: true,
    },
    orderBy: { title: "asc" },
  });

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

  async function handleCreateTask(formData: FormData) {
    "use server";
    
    const result = await createTask(product!.id, organization!.id, formData);
    
    if (result.success) {
      if (searchParams.sprintId) {
        redirect(`/orgs/${params.orgSlug}/products/${params.productKey}/sprints/${searchParams.sprintId}/kanban`);
      } else {
        redirect(`/orgs/${params.orgSlug}/products/${params.productKey}/sprints`);
      }
    }
    
    // Handle errors gracefully - in a real app you'd want to show these to the user
    console.error("Failed to create task:", result.error);
  }

  const backUrl = searchParams.sprintId 
    ? `/orgs/${params.orgSlug}/products/${params.productKey}/sprints/${searchParams.sprintId}/kanban`
    : `/orgs/${params.orgSlug}/products/${params.productKey}/sprints`;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backUrl}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Task</h1>
          <p className="text-muted-foreground">
            Add a new task to {product.name}
          </p>
        </div>
      </div>

      <form action={handleCreateTask} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Task Details</CardTitle>
                <CardDescription>
                  Define the task requirements and specifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Task Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="e.g., Implement user authentication API"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Detailed description of what needs to be done..."
                    rows={4}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="type">
                      <Target className="h-4 w-4 inline mr-1" />
                      Type *
                    </Label>
                    <Select name="type" defaultValue="STORY">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STORY">📖 Story</SelectItem>
                        <SelectItem value="BUG">🐛 Bug</SelectItem>
                        <SelectItem value="TASK">✅ Task</SelectItem>
                        <SelectItem value="EPIC">🎯 Epic</SelectItem>
                        <SelectItem value="SPIKE">🔬 Spike</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">
                      <Flag className="h-4 w-4 inline mr-1" />
                      Priority *
                    </Label>
                    <Select name="priority" defaultValue="MEDIUM">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRITICAL">🔴 Critical</SelectItem>
                        <SelectItem value="HIGH">🟠 High</SelectItem>
                        <SelectItem value="MEDIUM">🟡 Medium</SelectItem>
                        <SelectItem value="LOW">🟢 Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="effort">Story Points</Label>
                    <Select name="effort">
                      <SelectTrigger>
                        <SelectValue placeholder="Select effort" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 point</SelectItem>
                        <SelectItem value="2">2 points</SelectItem>
                        <SelectItem value="3">3 points</SelectItem>
                        <SelectItem value="5">5 points</SelectItem>
                        <SelectItem value="8">8 points</SelectItem>
                        <SelectItem value="13">13 points</SelectItem>
                        <SelectItem value="21">21 points</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeEstimate">
                      <Clock className="h-4 w-4 inline mr-1" />
                      Time Estimate (hours)
                    </Label>
                    <Input
                      id="timeEstimate"
                      name="timeEstimate"
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="e.g., 8"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assigneeId">
                      <User className="h-4 w-4 inline mr-1" />
                      Assignee
                    </Label>
                    <Select name="assigneeId">
                      <SelectTrigger>
                        <SelectValue placeholder="Assign to..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name} ({member.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Acceptance Criteria */}
            <Card>
              <CardHeader>
                <CardTitle>Acceptance Criteria</CardTitle>
                <CardDescription>
                  Define what "done" looks like for this task
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Textarea
                    name="acceptanceCriteria"
                    placeholder="Given [context]&#10;When [action]&#10;Then [expected result]&#10;&#10;- [ ] Criterion 1&#10;- [ ] Criterion 2&#10;- [ ] Criterion 3"
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use Gherkin format (Given/When/Then) or checklist format
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Assignment */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment</CardTitle>
                <CardDescription>
                  Link this task to other work items
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sprintId">Sprint</Label>
                  <Select name="sprintId" defaultValue={searchParams.sprintId || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select sprint..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Backlog (No Sprint)</SelectItem>
                      {sprints.map((sprint) => (
                        <SelectItem key={sprint.id} value={sprint.id}>
                          <div className="flex items-center space-x-2">
                            <Badge variant={sprint.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                              {sprint.status}
                            </Badge>
                            <span>{sprint.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="featureId">Feature</Label>
                  <Select name="featureId" defaultValue={searchParams.featureId || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select feature..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Feature</SelectItem>
                      {features.map((feature) => (
                        <SelectItem key={feature.id} value={feature.id}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{feature.title}</span>
                            {feature.epic && (
                              <span className="text-xs text-muted-foreground">
                                Epic: {feature.epic.title}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Task Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle>Task Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium">Story Points</h4>
                  <p className="text-muted-foreground">
                    1-3: Small tasks, 5-8: Medium complexity, 13+: Large tasks that should be broken down
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Acceptance Criteria</h4>
                  <p className="text-muted-foreground">
                    Clear, testable conditions that must be met for the task to be considered complete
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Task Types</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>📖 Story: User-facing functionality</li>
                    <li>🐛 Bug: Fix existing issues</li>
                    <li>✅ Task: Non-user-facing work</li>
                    <li>🎯 Epic: Large initiatives</li>
                    <li>🔬 Spike: Research or investigation</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" asChild>
            <Link href={backUrl}>
              Cancel
            </Link>
          </Button>
          <Button type="submit">
            Create Task
          </Button>
        </div>
      </form>
    </div>
  );
}