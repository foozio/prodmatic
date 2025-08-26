import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TeamMemberAdder } from "@/components/team-member-adder";
import { createTeam, deleteTeam, updateTeamMemberRoleForm, removeTeamMember } from "@/server/actions/teams";
import { 
  Users, 
  Package, 
  Settings, 
  UserPlus, 
  UserMinus,
  ArrowLeft
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { revalidatePath } from "next/cache";
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

  const organization = await db.organization.findFirst({
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
      members: {
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
  const isTeamMember = team.members.some(m => m.userId === user.id);

  // Get organization members who are not in this team
  const availableMembers = await db.membership.findMany({
    where: {
      organizationId: organization.id,
      userId: {
        notIn: team.members.map(m => m.userId),
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

  // Wrapper functions for form actions
  async function handleUpdateTeamMemberRole(formData: FormData) {
    "use server";
    try {
      const result = await updateTeamMemberRoleForm(formData);
      if ('success' in result && !result.success) {
        console.error("Failed to update team member role:", 'error' in result ? result.error : "Unknown error");
      }
    } catch (error) {
      console.error("Error updating team member role:", error);
    }
    revalidatePath(`/orgs/${params.orgSlug}/teams/${params.teamSlug}`);
  }

  async function handleRemoveTeamMember(formData: FormData) {
    "use server";
    try {
      const result = await removeTeamMember(formData);
      if ('success' in result && !result.success) {
        console.error("Failed to remove team member:", 'error' in result ? result.error : "Unknown error");
      }
    } catch (error) {
      console.error("Error removing team member:", error);
    }
    revalidatePath(`/orgs/${params.orgSlug}/teams/${params.teamSlug}`);
  }

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/orgs/${params.orgSlug}/teams`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
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
              <span>{team.members.length} members</span>
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
            {team.members.length === 0 ? (
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
                {team.members.map((membership) => (
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
                        <div className="flex items-center space-x-2">
                          <div className="text-xs text-muted-foreground">
                            Joined {formatDistanceToNow(membership.createdAt)} ago
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {canManageTeam && membership.userId !== user.id ? (
                        <form action={handleUpdateTeamMemberRole} className="flex items-center space-x-2">
                          <input type="hidden" name="membershipId" value={membership.id} />
                          <Select name="role" defaultValue={membership.role}>
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                              <SelectItem value="PRODUCT_MANAGER">Product Manager</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button type="submit" size="sm" variant="outline">
                            Update
                          </Button>
                        </form>
                      ) : (
                        <Badge variant="secondary">{membership.role}</Badge>
                      )}
                      
                      {canManageTeam && membership.userId !== user.id && (
                        <form action={handleRemoveTeamMember}>
                          <input type="hidden" name="membershipId" value={membership.id} />
                          <Button type="submit" size="sm" variant="destructive">
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </form>
                      )}
                    </div>
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
                        product.lifecycle === "LAUNCH" ? "default" :
                        product.lifecycle === "GROWTH" ? "secondary" :
                        product.lifecycle === "MATURITY" ? "outline" :
                        "destructive"
                      }>
                        {product.lifecycle}
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
        <TeamMemberAdder 
          teamId={team.id} 
          organizationId={organization.id} 
          availableMembers={availableMembers} 
        />
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
              <div className="text-2xl font-bold">{team.members.length}</div>
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