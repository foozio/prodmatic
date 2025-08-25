import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles, TrendingUp, Bug, AlertTriangle, Shield, Archive } from "lucide-react";
import Link from "next/link";
import { createChangelog } from "@/server/actions/releases";

interface NewChangelogPageProps {
  params: {
    orgSlug: string;
    productKey: string;
    releaseId: string;
  };
}

export default async function NewChangelogPage({
  params,
}: NewChangelogPageProps) {
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

  // Check if user has permission to create changelog entries
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

  const typeOptions = [
    { value: "FEATURE", label: "Feature", icon: Sparkles, description: "New functionality or capabilities" },
    { value: "IMPROVEMENT", label: "Improvement", icon: TrendingUp, description: "Enhanced existing features" },
    { value: "BUG_FIX", label: "Bug Fix", icon: Bug, description: "Fixed issues or bugs" },
    { value: "BREAKING_CHANGE", label: "Breaking Change", icon: AlertTriangle, description: "Changes that break existing functionality" },
    { value: "SECURITY", label: "Security", icon: Shield, description: "Security-related updates" },
    { value: "DEPRECATED", label: "Deprecated", icon: Archive, description: "Features marked for removal" },
  ];

  const visibilityOptions = [
    { value: "PUBLIC", label: "Public", description: "Visible to all users and customers" },
    { value: "INTERNAL", label: "Internal", description: "Visible to team members only" },
    { value: "PRIVATE", label: "Private", description: "Visible to admins and product managers" },
  ];

  async function handleSubmit(formData: FormData) {
    "use server";
    
    if (!product || !organization) {
      throw new Error("Product or organization not found");
    }
    
    const result = await createChangelog(product.id, organization.id, formData);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/products/${params.productKey}/releases/${params.releaseId}/changelog`);
    } else {
      // Handle error - in a real app you'd want to show this to the user
      console.error("Failed to create changelog:", result.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases/${params.releaseId}/changelog`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Changelog
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add Changelog Entry</h1>
            <p className="text-muted-foreground">
              Document changes for {release.name} v{release.version}
            </p>
          </div>
        </div>
      </div>

      <form action={handleSubmit} className="space-y-6">
        <input type="hidden" name="releaseId" value={release.id} />
        
        <Card>
          <CardHeader>
            <CardTitle>Entry Details</CardTitle>
            <CardDescription>
              Provide clear and concise information about the change
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Brief description of the change"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Detailed explanation of what changed and its impact"
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="type">Change Type *</Label>
                <Select name="type" defaultValue="FEATURE" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select change type" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center space-x-2">
                            <Icon className="h-4 w-4" />
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

              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility *</Label>
                <Select name="visibility" defaultValue="PUBLIC" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    {visibilityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Examples and Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Writing Guidelines</CardTitle>
            <CardDescription>
              Best practices for writing effective changelog entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Good Examples:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• "Added dark mode support for better accessibility"</li>
                  <li>• "Fixed issue where notifications weren't being delivered"</li>
                  <li>• "Improved page load times by 40% through optimization"</li>
                  <li>• "Deprecated legacy API endpoints (remove in v2.0)"</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Tips:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use action verbs (Added, Fixed, Improved, etc.)</li>
                  <li>• Focus on user impact rather than technical details</li>
                  <li>• Be specific about what changed</li>
                  <li>• Include migration steps for breaking changes</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end space-x-4">
          <Button variant="outline" asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases/${params.releaseId}/changelog`}>
              Cancel
            </Link>
          </Button>
          <Button type="submit">
            Add Changelog Entry
          </Button>
        </div>
      </form>
    </div>
  );
}