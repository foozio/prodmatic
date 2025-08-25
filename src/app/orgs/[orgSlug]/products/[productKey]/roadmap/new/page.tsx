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
import { ArrowLeft, MapPin, Calendar, Target, TrendingUp, Flag } from "lucide-react";
import Link from "next/link";
import { createRoadmapItem } from "@/server/actions/roadmap";
import { startOfQuarter, endOfQuarter, addMonths, format } from "date-fns";

interface NewRoadmapItemPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
}

export default async function NewRoadmapItemPage({
  params,
}: NewRoadmapItemPageProps) {
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

  // Get available epics
  const epics = await db.epic.findMany({
    where: {
      productId: product.id,
      deletedAt: null,
      status: { not: "CANCELLED" },
    },
    orderBy: { title: "asc" },
  });

  // Generate quarters for the next 12 months
  const currentDate = new Date();
  const quarters = Array.from({ length: 6 }, (_, i) => {
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

  async function handleCreateRoadmapItem(formData: FormData) {
    "use server";
    
    const result = await createRoadmapItem(product!.id, organization!.id, formData);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/products/${params.productKey}/roadmap`);
    }
    
    // Handle errors gracefully - in a real app you'd want to show these to the user
    console.error("Failed to create roadmap item:", result.error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/roadmap`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Roadmap
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Roadmap Item</h1>
          <p className="text-muted-foreground">
            Add a new item to the {product.name} roadmap
          </p>
        </div>
      </div>

      <form action={handleCreateRoadmapItem} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Define the roadmap item details and specifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="e.g., User Authentication System"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Detailed description of what this roadmap item encompasses..."
                    rows={4}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="type">
                      <Target className="h-4 w-4 inline mr-1" />
                      Type *
                    </Label>
                    <Select name="type" defaultValue="FEATURE">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EPIC">🎯 Epic</SelectItem>
                        <SelectItem value="FEATURE">⭐ Feature</SelectItem>
                        <SelectItem value="INITIATIVE">🚀 Initiative</SelectItem>
                        <SelectItem value="MILESTONE">🏁 Milestone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="epicId">
                      <Target className="h-4 w-4 inline mr-1" />
                      Related Epic
                    </Label>
                    <Select name="epicId">
                      <SelectTrigger>
                        <SelectValue placeholder="Select epic..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No Epic</SelectItem>
                        {epics.map((epic) => (
                          <SelectItem key={epic.id} value={epic.id}>
                            {epic.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="effort">
                      <TrendingUp className="h-4 w-4 inline mr-1" />
                      Effort (Story Points)
                    </Label>
                    <Input
                      id="effort"
                      name="effort"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="e.g., 21"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confidence">
                      <Flag className="h-4 w-4 inline mr-1" />
                      Confidence Level
                    </Label>
                    <Select name="confidence">
                      <SelectTrigger>
                        <SelectValue placeholder="Select confidence..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Very Low</SelectItem>
                        <SelectItem value="2">2 - Low</SelectItem>
                        <SelectItem value="3">3 - Medium</SelectItem>
                        <SelectItem value="4">4 - High</SelectItem>
                        <SelectItem value="5">5 - Very High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lane">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      Lane *
                    </Label>
                    <Select name="lane" defaultValue="LATER">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NOW">🟢 Now (Current)</SelectItem>
                        <SelectItem value="NEXT">🔵 Next (Soon)</SelectItem>
                        <SelectItem value="LATER">🟡 Later (Future)</SelectItem>
                        <SelectItem value="PARKED">⚫ Parked (On Hold)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline & Scheduling</CardTitle>
                <CardDescription>
                  Set target dates and quarter assignment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quarter">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Target Quarter
                  </Label>
                  <Select name="quarter">
                    <SelectTrigger>
                      <SelectValue placeholder="Select quarter..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Specific Quarter</SelectItem>
                      {quarters.map((quarter) => (
                        <SelectItem key={quarter.key} value={quarter.key}>
                          {quarter.label} ({format(quarter.start, "MMM")} - {format(quarter.end, "MMM yyyy")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      name="startDate"
                      type="date"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      name="endDate"
                      type="date"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Roadmap Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle>Roadmap Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium">Item Types</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>🎯 Epic: Large initiatives spanning multiple quarters</li>
                    <li>⭐ Feature: Specific functionality or capabilities</li>
                    <li>🚀 Initiative: Strategic themes or business objectives</li>
                    <li>🏁 Milestone: Key delivery points or achievements</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium">Roadmap Lanes</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>🟢 Now: Currently being worked on</li>
                    <li>🔵 Next: Up next in the pipeline</li>
                    <li>🟡 Later: Future considerations</li>
                    <li>⚫ Parked: On hold or deprioritized</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium">Story Points</h4>
                  <p className="text-muted-foreground">
                    Rough estimate of complexity and effort required. Use Fibonacci numbers (1, 2, 3, 5, 8, 13, 21, etc.)
                  </p>
                </div>

                <div>
                  <h4 className="font-medium">Confidence Level</h4>
                  <p className="text-muted-foreground">
                    How confident you are about the scope, timeline, and feasibility of this item
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Planning Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium">Start with Epics</h4>
                  <p className="text-muted-foreground">
                    Begin by defining major initiatives, then break them down into smaller features
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Be Realistic</h4>
                  <p className="text-muted-foreground">
                    Account for dependencies, team capacity, and unexpected challenges
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">Review Regularly</h4>
                  <p className="text-muted-foreground">
                    Roadmaps should be living documents that evolve with new insights
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/roadmap`}>
              Cancel
            </Link>
          </Button>
          <Button type="submit">
            Add to Roadmap
          </Button>
        </div>
      </form>
    </div>
  );
}