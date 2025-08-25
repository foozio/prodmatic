import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { updateProductLifecycle, updateProduct } from "@/server/actions/products";
import { 
  Package, 
  TrendingUp, 
  Users, 
  Target, 
  Calendar,
  Settings,
  BarChart3,
  Lightbulb,
  Rocket,
  Flag,
  Activity
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface ProductDetailPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
}

const lifecycleColors = {
  IDEATION: "bg-gray-500",
  DISCOVERY: "bg-blue-500", 
  DEFINITION: "bg-yellow-500",
  DELIVERY: "bg-orange-500",
  LAUNCH: "bg-green-500",
  GROWTH: "bg-emerald-500",
  MATURITY: "bg-cyan-500",
  SUNSET: "bg-red-500",
};

const lifecycleLabels = {
  IDEATION: "Ideation",
  DISCOVERY: "Discovery",
  DEFINITION: "Definition", 
  DELIVERY: "Delivery",
  LAUNCH: "Launch",
  GROWTH: "Growth",
  MATURITY: "Maturity",
  SUNSET: "Sunset",
};

const getLifecycleProgress = (stage: string): number => {
  const stages = ["IDEATION", "DISCOVERY", "DEFINITION", "DELIVERY", "LAUNCH", "GROWTH", "MATURITY", "SUNSET"];
  return ((stages.indexOf(stage) + 1) / stages.length) * 100;
};

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
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
    include: {
      organization: true,
      teams: {
        include: {
          members: {
            include: {
              user: true,
            },
          },
        },
      },
      _count: {
        select: {
          ideas: true,
          features: true,
          experiments: true,
          releases: true,
          kpis: true,
          okrs: true,
        },
      },
    },
  });

  if (!product) {
    redirect(`/orgs/${params.orgSlug}/products`);
  }

  // Check if user has access
  await requireRole(user.id, organization.id, ["ADMIN", "PRODUCT_MANAGER", "CONTRIBUTOR"]);

  const currentMembership = user.memberships.find(m => m.organizationId === organization.id);
  const canManageProduct = currentMembership?.role === "ADMIN" || currentMembership?.role === "PRODUCT_MANAGER";

  const lifecycleProgress = getLifecycleProgress(product.lifecycle);

  return (
    <div className="space-y-6">
      {/* Product Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className={`${lifecycleColors[product.lifecycle]} text-white text-xl`}>
              {product.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
              <Badge variant="outline" className="text-sm">
                {product.key}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {product.description || "No description provided"}
            </p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
              <span>Created {formatDistanceToNow(product.createdAt)} ago</span>
              <span>•</span>
              <span>Updated {formatDistanceToNow(product.updatedAt)} ago</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canManageProduct && (
            <Button variant="outline" asChild>
              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/settings`}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Lifecycle Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Product Lifecycle</span>
              </CardTitle>
              <CardDescription>
                Current stage: {lifecycleLabels[product.lifecycle]}
              </CardDescription>
            </div>
            {canManageProduct && (
              <div className="flex items-center space-x-2">
                <form action={updateProductLifecycle} className="flex items-center space-x-2">
                  <input type="hidden" name="productId" value={product.id} />
                  <select name="lifecycle" defaultValue={product.lifecycle} className="border rounded px-2 py-1 text-sm">
                    <option value="IDEATION">Ideation</option>
                    <option value="DISCOVERY">Discovery</option>
                    <option value="DEFINITION">Definition</option>
                    <option value="DELIVERY">Delivery</option>
                    <option value="LAUNCH">Launch</option>
                    <option value="GROWTH">Growth</option>
                    <option value="MATURITY">Maturity</option>
                    <option value="SUNSET">Sunset</option>
                  </select>
                  <Button type="submit" size="sm">Update Stage</Button>
                </form>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className={`w-4 h-4 ${lifecycleColors[product.lifecycle]} rounded-full`}></div>
              <div className="flex-1">
                <Progress value={lifecycleProgress} className="h-2" />
              </div>
              <div className="text-sm text-muted-foreground">
                {Math.round(lifecycleProgress)}% Complete
              </div>
            </div>
            
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2 text-xs">
              {Object.entries(lifecycleLabels).map(([stage, label]) => (
                <div
                  key={stage}
                  className={`text-center p-2 rounded ${
                    stage === product.lifecycle 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ideas</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{product._count.ideas}</div>
            <p className="text-xs text-muted-foreground">
              In the pipeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Features</CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{product._count.features}</div>
            <p className="text-xs text-muted-foreground">
              Delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Experiments</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{product._count.experiments}</div>
            <p className="text-xs text-muted-foreground">
              Running/Completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Releases</CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{product._count.releases}</div>
            <p className="text-xs text-muted-foreground">
              Shipped
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Product Vision */}
      {product.vision && (
        <Card>
          <CardHeader>
            <CardTitle>Product Vision</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{product.vision}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Teams */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <CardTitle>Assigned Teams</CardTitle>
            </div>
            <CardDescription>
              Teams working on this product
            </CardDescription>
          </CardHeader>
          <CardContent>
            {product.teams.length === 0 ? (
              <div className="text-center py-6">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No teams assigned</p>
                {canManageProduct && (
                  <Button size="sm" className="mt-2" variant="outline">
                    Assign Team
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {product.teams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {team.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{team.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {team.members.length} members
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/orgs/${params.orgSlug}/teams/${team.id}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common product management tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Button variant="outline" className="justify-start" asChild>
                <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/ideas`}>
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Manage Ideas
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/features`}>
                  <Flag className="h-4 w-4 mr-2" />
                  View Features
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/roadmap`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Product Roadmap
                </Link>
              </Button>
              <Button variant="outline" className="justify-start" asChild>
                <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/analytics`}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics & KPIs
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lifecycle Stage Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Stage-Specific Actions</CardTitle>
          <CardDescription>
            Actions relevant to the current lifecycle stage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {product.lifecycle === "IDEATION" && (
              <>
                <Button variant="outline" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/ideas/new`}>
                    Add New Idea
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/research`}>
                    Market Research
                  </Link>
                </Button>
              </>
            )}
            
            {product.lifecycle === "DISCOVERY" && (
              <>
                <Button variant="outline" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/interviews`}>
                    Customer Interviews
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/personas`}>
                    Define Personas
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/competitors`}>
                    Competitive Analysis
                  </Link>
                </Button>
              </>
            )}

            {product.lifecycle === "DEFINITION" && (
              <>
                <Button variant="outline" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/prd`}>
                    Create PRD
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/epics`}>
                    Define Epics
                  </Link>
                </Button>
              </>
            )}

            {product.lifecycle === "DELIVERY" && (
              <>
                <Button variant="outline" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/sprints`}>
                    Sprint Planning
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/backlog`}>
                    Manage Backlog
                  </Link>
                </Button>
              </>
            )}

            {product.lifecycle === "LAUNCH" && (
              <>
                <Button variant="outline" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/launch`}>
                    Launch Checklist
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/releases`}>
                    Create Release
                  </Link>
                </Button>
              </>
            )}

            {(product.lifecycle === "GROWTH" || product.lifecycle === "MATURITY") && (
              <>
                <Button variant="outline" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/experiments`}>
                    Run Experiments
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/analytics`}>
                    View Analytics
                  </Link>
                </Button>
              </>
            )}

            {product.lifecycle === "SUNSET" && (
              <>
                <Button variant="outline" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/sunset`}>
                    Sunset Planning
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/migration`}>
                    Migration Guide
                  </Link>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}