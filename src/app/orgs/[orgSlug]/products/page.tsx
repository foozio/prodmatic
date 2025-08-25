import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Plus, Package, TrendingUp, Users, Target, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface ProductsPageProps {
  params: {
    orgSlug: string;
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

export default async function ProductsPage({
  params,
}: ProductsPageProps) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/auth/signin");
  }

  const organization = await db.organization.findUnique({
    where: { slug: params.orgSlug },
    include: {
      products: {
        include: {
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
              features: true,
              experiments: true,
              ideas: true,
              releases: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  // Check if user has access
  await requireRole(user.id, organization.id, ["ADMIN", "PRODUCT_MANAGER", "CONTRIBUTOR"]);

  const currentMembership = user.memberships.find(m => m.organizationId === organization.id);
  const canCreateProducts = currentMembership?.role === "ADMIN" || currentMembership?.role === "PRODUCT_MANAGER";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage your product portfolio and lifecycle stages
          </p>
        </div>
        {canCreateProducts && (
          <Button asChild>
            <Link href={`/orgs/${params.orgSlug}/products/new`}>
              <Plus className="h-4 w-4 mr-2" />
              New Product
            </Link>
          </Button>
        )}
      </div>

      {/* Product Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organization.products.length}</div>
            <p className="text-xs text-muted-foreground">
              Across all lifecycle stages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {organization.products.filter(p => 
                !["SUNSET", "IDEATION"].includes(p.lifecycle)
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              In development or live
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ideas in Pipeline</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {organization.products.reduce((acc, p) => acc + p._count.ideas, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting prioritization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Features Shipped</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {organization.products.reduce((acc, p) => acc + p._count.features, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total features delivered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Products Grid */}
      <div className="grid gap-6">
        {organization.products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No products yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first product to start managing the product lifecycle
              </p>
              {canCreateProducts && (
                <Button asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Product
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {organization.products.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className={`${lifecycleColors[product.lifecycle]} text-white`}>
                          {product.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          <Link
                            href={`/orgs/${params.orgSlug}/products/${product.key}`}
                            className="hover:underline"
                          >
                            {product.name}
                          </Link>
                        </CardTitle>
                        <div className="text-sm text-muted-foreground">
                          {product.key}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {lifecycleLabels[product.lifecycle]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold">{product._count.features}</div>
                        <div className="text-xs text-muted-foreground">Features</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">{product._count.ideas}</div>
                        <div className="text-xs text-muted-foreground">Ideas</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">{product._count.experiments}</div>
                        <div className="text-xs text-muted-foreground">Experiments</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">{product._count.releases}</div>
                        <div className="text-xs text-muted-foreground">Releases</div>
                      </div>
                    </div>

                    {/* Team Members */}
                    {product.teams.length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">Teams</div>
                        <div className="flex flex-wrap gap-1">
                          {product.teams.slice(0, 3).map((team) => (
                            <Badge key={team.id} variant="secondary" className="text-xs">
                              {team.name}
                            </Badge>
                          ))}
                          {product.teams.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{product.teams.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      Updated {formatDistanceToNow(product.updatedAt)} ago
                    </div>

                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/orgs/${params.orgSlug}/products/${product.key}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Lifecycle Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Product Lifecycle Distribution</CardTitle>
          <CardDescription>
            Overview of products across different lifecycle stages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
            {Object.entries(lifecycleLabels).map(([stage, label]) => {
              const count = organization.products.filter(p => p.lifecycle === stage).length;
              const percentage = organization.products.length > 0 
                ? (count / organization.products.length) * 100 
                : 0;
              
              return (
                <div key={stage} className="text-center">
                  <div className={`w-8 h-8 ${lifecycleColors[stage as keyof typeof lifecycleColors]} rounded-full mx-auto mb-2 flex items-center justify-center text-white text-sm font-bold`}>
                    {count}
                  </div>
                  <div className="text-xs font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">
                    {percentage.toFixed(0)}%
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}