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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  Rocket, 
  Package, 
  Calendar, 
  GitBranch, 
  FileText,
  CheckCircle,
  Tag,
  Target
} from "lucide-react";
import Link from "next/link";
import { createRelease } from "@/server/actions/releases";

interface NewReleasePageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
}

export default async function NewReleasePage({
  params,
}: NewReleasePageProps) {
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
  await requireRole(user.id, organization.id, ["ADMIN", "PRODUCT_MANAGER"]);

  // Get available features for the release
  const availableFeatures = await db.feature.findMany({
    where: {
      productId: product.id,
      deletedAt: null,
      releaseId: null, // Only features not already in a release
      status: { in: ["IN_PROGRESS", "IN_REVIEW", "DONE"] }, // Only features that are being worked on or completed
    },
    include: {
      epic: true,
      tasks: {
        where: { deletedAt: null },
      },
    },
    orderBy: { title: "asc" },
  });

  // Get the latest release to suggest next version
  const latestRelease = await db.release.findFirst({
    where: {
      productId: product.id,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  const suggestNextVersion = (currentVersion: string, type: string) => {
    const [major, minor, patch] = currentVersion.split('.').map(n => parseInt(n) || 0);
    switch (type) {
      case 'MAJOR':
        return `${major + 1}.0.0`;
      case 'MINOR':
        return `${major}.${minor + 1}.0`;
      case 'PATCH':
        return `${major}.${minor}.${patch + 1}`;
      case 'HOTFIX':
        return `${major}.${minor}.${patch + 1}`;
      default:
        return `${major}.${minor + 1}.0`;
    }
  };

  async function handleCreateRelease(formData: FormData) {
    "use server";
    
    const result = await createRelease(product!.id, organization!.id, formData);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/products/${params.productKey}/releases`);
    }
    
    // Handle errors gracefully - in a real app you'd want to show these to the user
    console.error("Failed to create release:", result.error);
  }

  const releaseTypes = [
    { 
      value: "MAJOR", 
      label: "Major", 
      icon: "🚀", 
      description: "Breaking changes, new major functionality",
      example: "1.0.0 → 2.0.0" 
    },
    { 
      value: "MINOR", 
      label: "Minor", 
      icon: "⭐", 
      description: "New features, backward compatible",
      example: "1.0.0 → 1.1.0" 
    },
    { 
      value: "PATCH", 
      label: "Patch", 
      icon: "🔧", 
      description: "Bug fixes, small improvements",
      example: "1.0.0 → 1.0.1" 
    },
    { 
      value: "HOTFIX", 
      label: "Hotfix", 
      icon: "🚨", 
      description: "Critical bug fixes, security patches",
      example: "1.0.0 → 1.0.1" 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Releases
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Release</h1>
          <p className="text-muted-foreground">
            Plan a new release for {product.name}
          </p>
        </div>
      </div>

      <form action={handleCreateRelease} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Release Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Rocket className="h-5 w-5 mr-2" />
                  Release Details
                </CardTitle>
                <CardDescription>
                  Define the release information and metadata
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Release Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., Spring 2024 Release, Mobile Auth Update"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="version">
                      <Tag className="h-4 w-4 inline mr-1" />
                      Version *
                    </Label>
                    <Input
                      id="version"
                      name="version"
                      placeholder="e.g., 1.2.0"
                      defaultValue={latestRelease ? suggestNextVersion(latestRelease.version, "MINOR") : "1.0.0"}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">
                      <Package className="h-4 w-4 inline mr-1" />
                      Release Type *
                    </Label>
                    <Select name="type" defaultValue="MINOR">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {releaseTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center">
                              <span className="mr-2">{type.icon}</span>
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-xs text-muted-foreground">{type.example}</div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Brief description of what's included in this release..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="releaseDate">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Target Release Date
                  </Label>
                  <Input
                    id="releaseDate"
                    name="releaseDate"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Feature Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <GitBranch className="h-5 w-5 mr-2" />
                  Features & Content
                </CardTitle>
                <CardDescription>
                  Select features to include in this release
                </CardDescription>
              </CardHeader>
              <CardContent>
                {availableFeatures.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No features available</h3>
                    <p className="text-muted-foreground mb-4">
                      There are no completed or in-progress features available for release.
                    </p>
                    <Button variant="outline" asChild>
                      <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/features`}>
                        Manage Features
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground mb-4">
                      Select features that are ready to be included in this release
                    </div>
                    {availableFeatures.map((feature) => {
                      const completedTasks = feature.tasks.filter(t => t.status === "DONE").length;
                      const totalTasks = feature.tasks.length;
                      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
                      
                      return (
                        <div key={feature.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                          <Checkbox 
                            name="featureIds" 
                            value={feature.id}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium">{feature.title}</h4>
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      feature.status === "DONE" ? "bg-green-100 text-green-700" :
                                      feature.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                                      "bg-yellow-100 text-yellow-700"
                                    }`}
                                  >
                                    {feature.status}
                                  </Badge>
                                  {feature.epic && (
                                    <span>Epic: {feature.epic.title}</span>
                                  )}
                                  {totalTasks > 0 && (
                                    <span>{completedTasks}/{totalTasks} tasks completed</span>
                                  )}
                                </div>
                              </div>
                              
                              {totalTasks > 0 && (
                                <div className="text-right">
                                  <div className="text-sm font-medium">{Math.round(progress)}%</div>
                                  <div className="w-16 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-500 h-2 rounded-full"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {feature.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {feature.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    <input type="hidden" name="featureIds" value="[]" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Release Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Release Notes
                </CardTitle>
                <CardDescription>
                  Detailed notes for this release (optional)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Textarea
                    name="notes"
                    placeholder="Detailed release notes including breaking changes, migration notes, known issues, etc."
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    These notes will be used for internal tracking and can be published later
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Release Type Guide */}
            <Card>
              <CardHeader>
                <CardTitle>Release Types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {releaseTypes.map((type) => (
                  <div key={type.value} className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span>{type.icon}</span>
                      <h4 className="font-medium">{type.label}</h4>
                      <Badge variant="outline" className="text-xs">
                        {type.example}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Release Checklist */}
            <Card>
              <CardHeader>
                <CardTitle>Release Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium">Before Release</h4>
                  <ul className="text-muted-foreground space-y-1 mt-1">
                    <li>• All features tested and approved</li>
                    <li>• Release notes documented</li>
                    <li>• Breaking changes identified</li>
                    <li>• Stakeholders notified</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium">During Release</h4>
                  <ul className="text-muted-foreground space-y-1 mt-1">
                    <li>• Deploy to staging first</li>
                    <li>• Run smoke tests</li>
                    <li>• Monitor key metrics</li>
                    <li>• Have rollback plan ready</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium">After Release</h4>
                  <ul className="text-muted-foreground space-y-1 mt-1">
                    <li>• Update changelog</li>
                    <li>• Notify users of changes</li>
                    <li>• Monitor for issues</li>
                    <li>• Gather feedback</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Version History */}
            {latestRelease && (
              <Card>
                <CardHeader>
                  <CardTitle>Latest Release</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{latestRelease.name}</span>
                      <Badge variant="outline">v{latestRelease.version}</Badge>
                    </div>
                    <div className="text-muted-foreground">
                      {latestRelease.releaseDate 
                        ? new Date(latestRelease.releaseDate).toLocaleDateString()
                        : "Not yet released"
                      }
                    </div>
                    {latestRelease.description && (
                      <p className="text-muted-foreground">
                        {latestRelease.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases`}>
              Cancel
            </Link>
          </Button>
          <Button type="submit">
            Create Release
          </Button>
        </div>
      </form>

      {/* JavaScript for feature selection */}
      <script dangerouslySetInnerHTML={{
        __html: `
          document.addEventListener('DOMContentLoaded', function() {
            const checkboxes = document.querySelectorAll('input[name="featureIds"][type="checkbox"]');
            const hiddenInput = document.querySelector('input[name="featureIds"][type="hidden"]');
            
            function updateFeatureIds() {
              const selectedIds = Array.from(checkboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);
              hiddenInput.value = JSON.stringify(selectedIds);
            }
            
            checkboxes.forEach(checkbox => {
              checkbox.addEventListener('change', updateFeatureIds);
            });
            
            // Also update version when type changes
            const typeSelect = document.querySelector('select[name="type"]');
            const versionInput = document.querySelector('input[name="version"]');
            
            if (typeSelect && versionInput) {
              typeSelect.addEventListener('change', function() {
                const currentVersion = versionInput.value || '${latestRelease?.version || "0.0.0"}';
                const type = this.value;
                
                const [major, minor, patch] = currentVersion.split('.').map(n => parseInt(n) || 0);
                let newVersion;
                
                switch (type) {
                  case 'MAJOR':
                    newVersion = \`\${major + 1}.0.0\`;
                    break;
                  case 'MINOR':
                    newVersion = \`\${major}.\${minor + 1}.0\`;
                    break;
                  case 'PATCH':
                  case 'HOTFIX':
                    newVersion = \`\${major}.\${minor}.\${patch + 1}\`;
                    break;
                  default:
                    newVersion = \`\${major}.\${minor + 1}.0\`;
                }
                
                versionInput.value = newVersion;
              });
            }
          });
        `
      }} />
    </div>
  );
}