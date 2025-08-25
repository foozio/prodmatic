import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  Plus, 
  Target, 
  Heart,
  AlertTriangle,
  TrendingUp,
  User,
  Briefcase,
  MapPin,
  DollarSign
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface PersonasPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
}

export default async function PersonasPage({
  params,
}: PersonasPageProps) {
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

  const personas = await db.persona.findMany({
    where: {
      productId: product.id,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const currentMembership = user.memberships.find(m => m.organizationId === organization.id);
  const canManagePersonas = currentMembership?.role === "ADMIN" || currentMembership?.role === "PRODUCT_MANAGER";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Personas</h1>
          <p className="text-muted-foreground">
            Define and understand your target user segments for {product.name}
          </p>
        </div>
        {canManagePersonas && (
          <Button asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/personas/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Create Persona
            </Link>
          </Button>
        )}
      </div>

      {/* Personas Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Personas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{personas.length}</div>
            <p className="text-xs text-muted-foreground">
              Defined user types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Primary Users</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {personas.filter(p => p.demographics && (p.demographics as any).isPrimary).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Main target segments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Goals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {personas.length > 0 ? Math.round(personas.reduce((acc, p) => acc + p.goals.length, 0) / personas.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Goals per persona
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pain Points</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {personas.reduce((acc, p) => acc + p.pains.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total identified
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Personas Grid */}
      <div className="grid gap-6">
        {personas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No personas defined yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create user personas to better understand your target audience and their needs
              </p>
              {canManagePersonas && (
                <Button asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/personas/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Persona
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {personas.map((persona) => {
              const demographics = persona.demographics as any || {};
              return (
                <Card key={persona.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {persona.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">
                            <Link
                              href={`/orgs/${params.orgSlug}/products/${params.productKey}/personas/${persona.id}`}
                              className="hover:underline"
                            >
                              {persona.name}
                            </Link>
                          </CardTitle>
                          {demographics.isPrimary && (
                            <Badge variant="default" className="text-xs mt-1">
                              Primary
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {persona.description}
                      </p>

                      {/* Demographics */}
                      {(demographics.age || demographics.location || demographics.occupation) && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {demographics.age && (
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{demographics.age}</span>
                            </div>
                          )}
                          {demographics.occupation && (
                            <div className="flex items-center space-x-1">
                              <Briefcase className="h-3 w-3" />
                              <span>{demographics.occupation}</span>
                            </div>
                          )}
                          {demographics.location && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span>{demographics.location}</span>
                            </div>
                          )}
                          {demographics.income && (
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-3 w-3" />
                              <span>{demographics.income}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Goals */}
                      {persona.goals.length > 0 && (
                        <div>
                          <div className="flex items-center space-x-1 mb-2">
                            <Target className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Goals</span>
                          </div>
                          <div className="space-y-1">
                            {persona.goals.slice(0, 2).map((goal, index) => (
                              <div key={index} className="text-xs text-muted-foreground">
                                • {goal}
                              </div>
                            ))}
                            {persona.goals.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{persona.goals.length - 2} more goals
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Pain Points */}
                      {persona.pains.length > 0 && (
                        <div>
                          <div className="flex items-center space-x-1 mb-2">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium">Pain Points</span>
                          </div>
                          <div className="space-y-1">
                            {persona.pains.slice(0, 2).map((pain, index) => (
                              <div key={index} className="text-xs text-muted-foreground">
                                • {pain}
                              </div>
                            ))}
                            {persona.pains.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{persona.pains.length - 2} more pain points
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Gains */}
                      {persona.gains.length > 0 && (
                        <div>
                          <div className="flex items-center space-x-1 mb-2">
                            <Heart className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">Gains</span>
                          </div>
                          <div className="space-y-1">
                            {persona.gains.slice(0, 2).map((gain, index) => (
                              <div key={index} className="text-xs text-muted-foreground">
                                • {gain}
                              </div>
                            ))}
                            {persona.gains.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{persona.gains.length - 2} more gains
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            Created {formatDistanceToNow(persona.createdAt)} ago
                          </div>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/personas/${persona.id}`}>
                              View Details
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Persona Framework Guide */}
      <Card>
        <CardHeader>
          <CardTitle>User Persona Framework</CardTitle>
          <CardDescription>
            Understanding the key components of effective user personas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Target className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold">Goals</h4>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>• What they want to achieve</div>
                <div>• Primary motivations</div>
                <div>• Success metrics</div>
                <div>• Desired outcomes</div>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h4 className="font-semibold">Pain Points</h4>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>• Current frustrations</div>
                <div>• Obstacles they face</div>
                <div>• Time wasters</div>
                <div>• Process inefficiencies</div>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-3">
                <Heart className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold">Gains</h4>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>• Benefits they seek</div>
                <div>• Value propositions</div>
                <div>• Positive outcomes</div>
                <div>• Job-to-be-done</div>
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-3">
                <User className="h-5 w-5 text-purple-600" />
                <h4 className="font-semibold">Demographics</h4>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>• Age and background</div>
                <div>• Role and experience</div>
                <div>• Tech proficiency</div>
                <div>• Context of use</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Persona Usage Tips */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use Personas</CardTitle>
          <CardDescription>
            Best practices for leveraging personas in product development
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-3">During Design & Development</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Reference personas when making design decisions</li>
                <li>• Validate features against persona needs</li>
                <li>• Use personas to prioritize user stories</li>
                <li>• Guide UX research and testing</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">For Team Alignment</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Share personas across all teams</li>
                <li>• Reference in product requirements</li>
                <li>• Use in marketing messaging</li>
                <li>• Guide customer support strategies</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}