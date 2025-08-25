import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { addTeamMember, removeTeamMember } from "@/server/actions/teams";
import { Users, Settings, UserPlus, UserMinus, Package, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface TeamDetailPageProps {
  params: {
    orgSlug: string;
    teamSlug: string;
  };
}

export default async function TeamDetailPage({
  params,
}: TeamDetailPageProps) {
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

  const team = await db.team.findFirst({
    where: {
      slug: params.teamSlug,
      organizationId: organization.id,
    },
    include: {
      memberships: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      products: {
        include: {
          _count: {
            select: {
              features: true,
              experiments: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      },
      organization: true,
    },
  });

  if (!team) {
    redirect(`/orgs/${params.orgSlug}/teams`);
  }

  // Check if user has access
  await requireRole(user.id, organization.id, ["ADMIN", "PRODUCT_MANAGER", "CONTRIBUTOR"]);

  const currentMembership = user.memberships.find(m => m.organizationId === organization.id);
  const canManageTeam = currentMembership?.role === "ADMIN" || currentMembership?.role === "PRODUCT_MANAGER";
  const isTeamMember = team.memberships.some(m => m.userId === user.id);

  // Get organization members who are not in this team
  const availableMembers = await db.membership.findMany({
    where: {
      organizationId: organization.id,
      userId: {
        notIn: team.memberships.map(m => m.userId),
      },
    },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
    orderBy: {
      user: {
        name: "asc",
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">
              {team.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
            <p className="text-muted-foreground">
              {team.description || "No description provided"}
            </p>
            <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
              <span>{team.memberships.length} members</span>
              <span>•</span>
              <span>{team.products.length} products</span>
              <span>•</span>
              <span>Created {formatDistanceToNow(team.createdAt)} ago</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canManageTeam && (
            <Button variant="outline" asChild>
              <Link href={`/orgs/${params.orgSlug}/teams/${params.teamSlug}/settings`}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Team Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <CardTitle>Team Members</CardTitle>
              </div>
              {canManageTeam && (
                <Button size="sm" variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              )}
            </div>
            <CardDescription>
              Current team members and their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {team.memberships.length === 0 ? (
              <div className="text-center py-6">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No team members yet</p>
                {canManageTeam && (
                  <Button size="sm" className="mt-2">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add First Member
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {team.memberships.map((membership) => (
                  <div
                    key={membership.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={membership.user.image || undefined}
                          alt={membership.user.name || membership.user.email}
                        />
                        <AvatarFallback>
                          {(membership.user.name || membership.user.email)
                            .charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {membership.user.name || membership.user.email}
                          {membership.userId === user.id && (
                            <span className="text-sm text-muted-foreground ml-2">
                              (You)
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {membership.user.email}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Joined {formatDistanceToNow(membership.createdAt)} ago
                        </div>
                      </div>
                    </div>
                    {canManageTeam && membership.userId !== user.id && (
                      <form action={removeTeamMember}>
                        <input type="hidden" name="membershipId" value={membership.id} />
                        <Button type="submit" size="sm" variant="destructive">
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <CardTitle>Team Products</CardTitle>
            </div>
            <CardDescription>
              Products managed by this team
            </CardDescription>
          </CardHeader>
          <CardContent>
            {team.products.length === 0 ? (
              <div className="text-center py-6">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No products assigned yet</p>
                <Button size="sm" className="mt-2" variant="outline">
                  <Package className="h-4 w-4 mr-2" />
                  Create Product
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {team.products.map((product) => (
                  <div
                    key={product.id}
                    className="p-3 border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{product.name}</div>
                      <Badge variant={
                        product.stage === "LAUNCH" ? "default" :
                        product.stage === "GROWTH" ? "secondary" :
                        product.stage === "MATURITY" ? "outline" :
                        "destructive"
                      }>
                        {product.stage}
                      </Badge>
                    </div>
                    {product.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>{product._count.features} features</span>
                      <span>{product._count.experiments} experiments</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Available Members to Add */}
      {canManageTeam && availableMembers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Add Team Members</CardTitle>
            <CardDescription>
              Organization members who can be added to this team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {availableMembers.slice(0, 6).map((membership) => (
                <div
                  key={membership.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={membership.user.image || undefined}
                        alt={membership.user.name || membership.user.email}
                      />
                      <AvatarFallback>
                        {(membership.user.name || membership.user.email)
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">
                        {membership.user.name || membership.user.email}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {membership.role}
                      </div>
                    </div>
                  </div>
                  <form action={addTeamMember}>
                    <input type="hidden" name="teamId" value={team.id} />
                    <input type="hidden" name="userId" value={membership.userId} />
                    <Button type="submit" size="sm" variant="outline">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              ))}
            </div>
            {availableMembers.length > 6 && (
              <div className="mt-3 text-center">
                <Button variant="outline" size="sm">
                  View All Available Members ({availableMembers.length})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Team Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Team Activity</CardTitle>
          <CardDescription>
            Recent activity and statistics for this team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{team.memberships.length}</div>
              <div className="text-sm text-muted-foreground">Active Members</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{team.products.length}</div>
              <div className="text-sm text-muted-foreground">Products</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {team.products.reduce((acc, p) => acc + p._count.features, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Features</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {team.products.reduce((acc, p) => acc + p._count.experiments, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Experiments</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}