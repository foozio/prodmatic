import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createProduct } from "@/server/actions/products";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";

interface NewProductPageProps {
  params: {
    orgSlug: string;
  };
}

export default async function NewProductPage({
  params,
}: NewProductPageProps) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/auth/signin");
  }

  const organization = await db.organization.findUnique({
    where: { slug: params.orgSlug },
    include: {
      teams: {
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  // Check if user has permissions to create products
  await requireRole(user.id, organization.id, ["ADMIN", "PRODUCT_MANAGER"]);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/orgs/${params.orgSlug}/products`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Product</h1>
          <p className="text-muted-foreground">
            Add a new product to your portfolio and define its lifecycle stage
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <CardTitle>Product Details</CardTitle>
            </div>
            <CardDescription>
              Define the basic information for your new product
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createProduct} className="space-y-6">
              <input type="hidden" name="organizationId" value={organization.id} />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="My Awesome Product"
                    required
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    The display name for your product
                  </p>
                </div>
                <div>
                  <Label htmlFor="key">Product Key</Label>
                  <Input
                    id="key"
                    name="key"
                    placeholder="MAP"
                    required
                    pattern="^[A-Z0-9]+$"
                    title="Only uppercase letters and numbers allowed"
                    maxLength={10}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Unique identifier (e.g., MAP, PROD, APP)
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe what this product does and its purpose..."
                  className="min-h-[100px]"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Brief overview of the product and its main purpose
                </p>
              </div>

              <div>
                <Label htmlFor="vision">Product Vision</Label>
                <Textarea
                  id="vision"
                  name="vision"
                  placeholder="What is the long-term vision for this product?"
                  className="min-h-[80px]"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Long-term vision and strategic goals for the product
                </p>
              </div>

              <div>
                <Label htmlFor="lifecycle">Initial Lifecycle Stage</Label>
                <Select name="lifecycle" defaultValue="IDEATION">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDEATION">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                        <span>Ideation - Initial concept phase</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="DISCOVERY">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>Discovery - Research and validation</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="DEFINITION">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span>Definition - Planning and specification</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="DELIVERY">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span>Delivery - Active development</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose the current stage of your product development
                </p>
              </div>

              {organization.teams.length > 0 && (
                <div>
                  <Label htmlFor="teamId">Assign to Team (Optional)</Label>
                  <Select name="teamId">
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team..." />
                    </SelectTrigger>
                    <SelectContent>
                      {organization.teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Assign this product to a specific team for management
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-4 pt-4 border-t">
                <Button type="submit">
                  Create Product
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products`}>
                    Cancel
                  </Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Lifecycle Guide */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Product Lifecycle Stages</CardTitle>
            <CardDescription>
              Understanding the different stages of product development
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-4 h-4 bg-gray-500 rounded-full mt-0.5"></div>
                <div>
                  <div className="font-medium">Ideation</div>
                  <div className="text-sm text-muted-foreground">
                    Brainstorming, problem identification, and initial concept development
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-4 h-4 bg-blue-500 rounded-full mt-0.5"></div>
                <div>
                  <div className="font-medium">Discovery</div>
                  <div className="text-sm text-muted-foreground">
                    Market research, user interviews, competitive analysis, and validation
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-4 h-4 bg-yellow-500 rounded-full mt-0.5"></div>
                <div>
                  <div className="font-medium">Definition</div>
                  <div className="text-sm text-muted-foreground">
                    Requirements gathering, PRD creation, technical specification, and planning
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-4 h-4 bg-orange-500 rounded-full mt-0.5"></div>
                <div>
                  <div className="font-medium">Delivery</div>
                  <div className="text-sm text-muted-foreground">
                    Active development, testing, iteration, and preparation for launch
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-4 h-4 bg-green-500 rounded-full mt-0.5"></div>
                <div>
                  <div className="font-medium">Launch</div>
                  <div className="text-sm text-muted-foreground">
                    Product release, go-to-market execution, and initial user acquisition
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-4 h-4 bg-emerald-500 rounded-full mt-0.5"></div>
                <div>
                  <div className="font-medium">Growth</div>
                  <div className="text-sm text-muted-foreground">
                    Feature expansion, user base growth, and market penetration
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-4 h-4 bg-cyan-500 rounded-full mt-0.5"></div>
                <div>
                  <div className="font-medium">Maturity</div>
                  <div className="text-sm text-muted-foreground">
                    Stable feature set, optimization focus, and maintenance mode
                  </div>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-4 h-4 bg-red-500 rounded-full mt-0.5"></div>
                <div>
                  <div className="font-medium">Sunset</div>
                  <div className="text-sm text-muted-foreground">
                    End-of-life planning, migration strategies, and product retirement
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}