import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { updateProduct, deleteProduct } from "@/server/actions/products";
import { Settings, Package, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ProductSettingsPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
}

export default async function ProductSettingsPage({
  params,
}: ProductSettingsPageProps) {
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
        },
      },
    },
  });

  if (!product) {
    redirect(`/orgs/${params.orgSlug}/products`);
  }

  // Check if user has permissions to manage products
  await requireRole(user.id, organization.id, ["ADMIN", "PRODUCT_MANAGER"]);

  const availableTeams = await db.team.findMany({
    where: {
      organizationId: organization.id,
      deletedAt: null,
    },
    orderBy: {
      name: "asc",
    },
  });

  const totalItems = Object.values(product._count).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Settings</h1>
          <p className="text-muted-foreground">
            Manage settings and configuration for {product.name}
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <CardTitle>General Settings</CardTitle>
            </div>
            <CardDescription>
              Basic information about your product
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateProduct} className="space-y-4">
              <input type="hidden" name="productId" value={product.id} />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={product.name}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="key">Product Key</Label>
                  <Input
                    id="key"
                    name="key"
                    defaultValue={product.key}
                    required
                    pattern="^[A-Z0-9]+$"
                    title="Only uppercase letters and numbers allowed"
                    maxLength={10}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={product.description || ""}
                  placeholder="Describe what this product does and its purpose..."
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <Label htmlFor="vision">Product Vision</Label>
                <Textarea
                  id="vision"
                  name="vision"
                  defaultValue={product.vision || ""}
                  placeholder="What is the long-term vision for this product?"
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="lifecycle">Lifecycle Stage</Label>
                <Select name="lifecycle" defaultValue={product.lifecycle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDEATION">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                        <span>Ideation</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="DISCOVERY">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span>Discovery</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="DEFINITION">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span>Definition</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="DELIVERY">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span>Delivery</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="LAUNCH">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Launch</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="GROWTH">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <span>Growth</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="MATURITY">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                        <span>Maturity</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="SUNSET">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>Sunset</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit">Save Changes</Button>
            </form>
          </CardContent>
        </Card>

        {/* Team Assignment */}
        <Card>
          <CardHeader>
            <CardTitle>Team Assignment</CardTitle>
            <CardDescription>
              Manage which teams are working on this product
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Currently Assigned Teams</Label>
                {product.teams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No teams assigned</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {product.teams.map((team) => (
                      <Badge key={team.id} variant="secondary">
                        {team.name} ({team.members.length} members)
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {availableTeams.length > 0 && (
                <div>
                  <Label>Available Teams</Label>
                  <div className="grid gap-2 mt-2">
                    {availableTeams.map((team) => {
                      const isAssigned = product.teams.some(t => t.id === team.id);
                      return (
                        <div key={team.id} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{team.name}</span>
                          <Button 
                            size="sm" 
                            variant={isAssigned ? "destructive" : "outline"}
                            disabled
                          >
                            {isAssigned ? "Remove" : "Assign"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Product Statistics */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <CardTitle>Product Statistics</CardTitle>
            </div>
            <CardDescription>
              Current statistics and information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{product._count.ideas}</div>
                <div className="text-sm text-muted-foreground">Ideas</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{product._count.features}</div>
                <div className="text-sm text-muted-foreground">Features</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{product._count.experiments}</div>
                <div className="text-sm text-muted-foreground">Experiments</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{product._count.releases}</div>
                <div className="text-sm text-muted-foreground">Releases</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </div>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
                <div>
                  <div className="font-medium">Delete Product</div>
                  <div className="text-sm text-muted-foreground">
                    Permanently delete this product and all its data
                  </div>
                  {totalItems > 0 && (
                    <div className="text-sm text-orange-600 mt-1">
                      ⚠️ This product has {totalItems} associated items. Clean up all ideas, features, experiments, and releases before deletion.
                    </div>
                  )}
                </div>
                <form action={deleteProduct}>
                  <input type="hidden" name="productId" value={product.id} />
                  <Button 
                    type="submit" 
                    variant="destructive" 
                    size="sm"
                    disabled={totalItems > 0}
                  >
                    {totalItems > 0 ? "Cannot Delete" : "Delete"}
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}