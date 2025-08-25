import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Settings, CheckCircle2, Server, BarChart3, MessageSquare, RotateCcw } from "lucide-react";
import Link from "next/link";
import { createChecklistItem } from "@/server/actions/launch-checklist";

interface NewChecklistItemPageProps {
  params: {
    orgSlug: string;
    productKey: string;
    releaseId: string;
  };
}

export default async function NewChecklistItemPage({
  params,
}: NewChecklistItemPageProps) {
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

  // Check if user has permission to create checklist items
  await requireRole(user.id, organization.id, ["ADMIN", "PRODUCT_MANAGER", "CONTRIBUTOR"]);

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

  const categoryOptions = [
    { 
      value: "PREPARATION", 
      label: "Preparation", 
      icon: Settings, 
      description: "Pre-launch setup and readiness tasks",
      examples: ["Code review", "Security review", "Feature flags setup"]
    },
    { 
      value: "TESTING", 
      label: "Testing", 
      icon: CheckCircle2, 
      description: "Quality assurance and validation",
      examples: ["Unit tests", "Integration tests", "Performance testing"]
    },
    { 
      value: "DEPLOYMENT", 
      label: "Deployment", 
      icon: Server, 
      description: "Release deployment and infrastructure",
      examples: ["Staging deployment", "Production deployment", "Load balancer config"]
    },
    { 
      value: "MONITORING", 
      label: "Monitoring", 
      icon: BarChart3, 
      description: "Health checks and observability",
      examples: ["Health checks", "Error monitoring", "Performance dashboards"]
    },
    { 
      value: "COMMUNICATION", 
      label: "Communication", 
      icon: MessageSquare, 
      description: "Team and stakeholder communication",
      examples: ["Release notes", "Team notifications", "Customer communication"]
    },
    { 
      value: "ROLLBACK", 
      label: "Rollback", 
      icon: RotateCcw, 
      description: "Contingency and rollback planning",
      examples: ["Rollback procedure", "Database rollback", "Emergency contacts"]
    },
  ];

  async function handleSubmit(formData: FormData) {
    "use server";
    
    if (!organization) {
      throw new Error("Organization not found");
    }
    
    const result = await createChecklistItem(params.releaseId, organization.id, formData);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/products/${params.productKey}/releases/${params.releaseId}/checklist`);
    } else {
      // Handle error - in a real app you'd want to show this to the user
      console.error("Failed to create checklist item:", result.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases/${params.releaseId}/checklist`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Checklist
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add Checklist Item</h1>
            <p className="text-muted-foreground">
              Create a new task for {release.name} v{release.version}
            </p>
          </div>
        </div>
      </div>

      <form action={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
            <CardDescription>
              Define the checklist item and its requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Unit tests passing with 95%+ coverage"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Detailed explanation of what needs to be completed"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select name="category" defaultValue="PREPARATION" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-start space-x-3 py-2">
                          <Icon className="h-4 w-4 mt-0.5" />
                          <div>
                            <div className="font-medium">{option.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {option.description}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="assigneeId">Assignee</Label>
                <Select name="assigneeId">
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No assignee</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center space-x-2">
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {member.memberships[0]?.role}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="isRequired" name="isRequired" value="true" />
              <Label htmlFor="isRequired" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Required for release
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Category Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Category Examples</CardTitle>
            <CardDescription>
              Common checklist items for each category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryOptions.map((category) => {
                const Icon = category.icon;
                return (
                  <div key={category.value} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-4 w-4" />
                      <h4 className="font-medium">{category.label}</h4>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {category.examples.map((example, index) => (
                        <li key={index}>• {example}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end space-x-4">
          <Button variant="outline" asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases/${params.releaseId}/checklist`}>
              Cancel
            </Link>
          </Button>
          <Button type="submit">
            Add Checklist Item
          </Button>
        </div>
      </form>
    </div>
  );
}