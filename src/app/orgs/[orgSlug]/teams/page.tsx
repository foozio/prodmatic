import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TeamMemberModal } from "@/components/team-member-modal";
import { createTeam, deleteTeam } from "@/server/actions/teams";
import { Users, Plus, Settings, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface OrganizationTeamsPageProps {
  params: {
    orgSlug: string;
  };
}

export default async function OrganizationTeamsPage({
  params,
}: OrganizationTeamsPageProps) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/auth/signin");
  }

  const organization = await db.organization.findUnique({
    where: { slug: params.orgSlug },
    include: {
      teams: {
        include: {
          memberships: {
            include: {
              user: {
                include: {
                  profile: true,
                },
              },
            },
          },
          products: true,
        },
        orderBy: {
          name: "asc",
        },
      },
      memberships: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  // Check if user has access
  await requireRole(user.id, organization.id, ["ADMIN", "PRODUCT_MANAGER"]);

  const currentMembership = organization.memberships.find(m => m.userId === user.id);
  const canManageTeams = currentMembership?.role === "ADMIN" || currentMembership?.role === "PRODUCT_MANAGER";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-muted-foreground">
            Organize your members into teams for better collaboration
          </p>
        </div>
        {canManageTeams && (
          <Button className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create Team</span>
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        {/* Create New Team */}
        {canManageTeams && (
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Plus className="h-5 w-5" />
                <CardTitle>Create New Team</CardTitle>
              </div>
              <CardDescription>
                Create a new team to organize members around specific products or initiatives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createTeam} className="space-y-4">
                <input type="hidden" name="organizationId" value={organization.id} />
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Team Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Engineering Team"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="slug">Team Slug</Label>
                    <Input
                      id="slug"
                      name="slug"
                      placeholder="engineering"
                      required
                      pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                      title="Only lowercase letters, numbers, and hyphens allowed"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe the team's purpose and responsibilities..."
                    className="min-h-[80px]"
                  />
                </div>

                <Button type="submit">Create Team</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Teams List */}
        <div className="grid gap-4">
          {organization.teams.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No teams yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first team to start organizing your members
                </p>
                {canManageTeams && (
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Team
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            organization.teams.map((team) => (
              <Card key={team.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {team.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <Link
                            href={`/orgs/${params.orgSlug}/teams/${team.slug}`}
                            className="hover:underline"
                          >
                            {team.name}
                          </Link>
                        </CardTitle>
                        <CardDescription>
                          {team.description || "No description provided"}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {canManageTeams && (
                        <>
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/orgs/${params.orgSlug}/teams/${team.slug}/settings`}>
                              <Settings className="h-4 w-4" />
                            </Link>
                          </Button>
                          <form action={deleteTeam}>
                            <input type="hidden" name="teamId" value={team.id} />
                            <Button type="submit" variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </form>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{team.memberships.length}</div>
                      <div className="text-sm text-muted-foreground">Members</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{team.products.length}</div>
                      <div className="text-sm text-muted-foreground">Products</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">
                        Created {formatDistanceToNow(team.createdAt)} ago
                      </div>
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Team Members</h4>
                      {canManageTeams && (
                        <TeamMemberModal 
                          teamId={team.id}
                          teamName={team.name}
                          organizationId={organization.id}
                          availableMembers={organization.memberships.filter(m => 
                            !team.memberships.some(tm => tm.userId === m.userId)
                          )}
                        />
                      )}
                    </div>
                    
                    {team.memberships.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No members yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {team.memberships.slice(0, 6).map((membership) => (
                          <div
                            key={membership.id}
                            className="flex items-center space-x-2 bg-muted rounded-full px-3 py-1"
                          >
                            <Avatar className="h-6 w-6">
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
                            <span className="text-sm font-medium">
                              {membership.user.name || membership.user.email.split('@')[0]}
                            </span>
                          </div>
                        ))}
                        {team.memberships.length > 6 && (
                          <div className="flex items-center space-x-2 bg-muted rounded-full px-3 py-1">
                            <span className="text-sm text-muted-foreground">
                              +{team.memberships.length - 6} more
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <Button variant="outline" asChild className="w-full">
                      <Link href={`/orgs/${params.orgSlug}/teams/${team.slug}`}>
                        View Team Details
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Team Management Guide */}
        <Card>
          <CardHeader>
            <CardTitle>About Teams</CardTitle>
            <CardDescription>
              How teams work in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div>
                  <strong>Organization:</strong> Teams help you organize members around specific products, features, or initiatives.
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div>
                  <strong>Collaboration:</strong> Team members can collaborate on shared products and have visibility into team-specific work.
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div>
                  <strong>Permissions:</strong> Team membership can be used to control access to specific products and features.
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                <div>
                  <strong>Flexibility:</strong> Members can belong to multiple teams within the same organization.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}