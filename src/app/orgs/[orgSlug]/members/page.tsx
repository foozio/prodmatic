import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DataTable } from "@/components/ui/data-table";
import { inviteUser, removeMember, updateMembershipRole } from "@/server/actions/organizations";
import { UserPlus, Users, Mail, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { revalidatePath } from "next/cache";

interface OrganizationMembersPageProps {
  params: Promise<{
    orgSlug: string;
  }>;
}

export default async function OrganizationMembersPage({
  params,
}: OrganizationMembersPageProps) {
  const { orgSlug } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/auth/signin");
  }

  const organization = await db.organization.findUnique({
    where: { slug: orgSlug },
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
          createdAt: "desc",
        },
      },
      invitations: {
        where: {
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  // Check if user has admin access
  await requireRole(user.id, organization.id, ["ADMIN", "PRODUCT_MANAGER"]);

  const currentMembership = organization.memberships.find(m => m.userId === user.id);
  const canManageMembers = currentMembership?.role === "ADMIN";

  // Wrapper functions for form actions
  async function handleInviteUser(formData: FormData) {
    "use server";
    try {
      const result = await inviteUser(formData);
      if ('success' in result && !result.success) {
        console.error("Failed to invite user:", 'error' in result ? result.error : "Unknown error");
      }
    } catch (error) {
      console.error("Error inviting user:", error);
    }
    revalidatePath(`/orgs/${orgSlug}/members`);
  }

  async function handleUpdateMembershipRole(formData: FormData) {
    "use server";
    try {
      const result = await updateMembershipRole(formData);
      if ('success' in result && !result.success) {
        console.error("Failed to update member role:", 'error' in result ? result.error : "Unknown error");
      }
    } catch (error) {
      console.error("Error updating member role:", error);
    }
    revalidatePath(`/orgs/${orgSlug}/members`);
  }

  async function handleRemoveMember(formData: FormData) {
    "use server";
    try {
      const result = await removeMember(formData);
      if ('success' in result && !result.success) {
        console.error("Failed to remove member:", 'error' in result ? result.error : "Unknown error");
      }
    } catch (error) {
      console.error("Error removing member:", error);
    }
    revalidatePath(`/orgs/${orgSlug}/members`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground">
            Manage organization members and their permissions
          </p>
        </div>
        {canManageMembers && (
          <Button className="flex items-center space-x-2">
            <UserPlus className="h-4 w-4" />
            <span>Invite Member</span>
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        {/* Invite New Member */}
        {canManageMembers && (
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <CardTitle>Invite New Member</CardTitle>
              </div>
              <CardDescription>
                Send an invitation to join your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={handleInviteUser} className="space-y-4">
                <input type="hidden" name="organizationId" value={organization.id} />
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="colleague@company.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Select name="role" defaultValue="CONTRIBUTOR">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                        <SelectItem value="PRODUCT_MANAGER">Product Manager</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="STAKEHOLDER">Stakeholder</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button type="submit">Send Invitation</Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Pending Invitations */}
        {organization.invitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Invitations that haven't been accepted yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {organization.invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {invitation.email.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{invitation.email}</div>
                        <div className="text-sm text-muted-foreground">
                          Invited {formatDistanceToNow(invitation.createdAt)} ago
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{invitation.role}</Badge>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <CardTitle>Organization Members</CardTitle>
            </div>
            <CardDescription>
              All current members of the organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {organization.memberships.map((membership) => (
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
                  <div className="flex items-center space-x-2">
                    {canManageMembers && membership.userId !== user.id ? (
                      <form action={handleUpdateMembershipRole} className="flex items-center space-x-2">
                        <input type="hidden" name="membershipId" value={membership.id} />
                        <Select name="role" defaultValue={membership.role}>
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CONTRIBUTOR">Contributor</SelectItem>
                            <SelectItem value="PRODUCT_MANAGER">Product Manager</SelectItem>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="STAKEHOLDER">Stakeholder</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="submit" size="sm" variant="outline">
                          Update
                        </Button>
                      </form>
                    ) : (
                      <Badge variant="secondary">{membership.role}</Badge>
                    )}
                    
                    {canManageMembers && membership.userId !== user.id && (
                      <form action={handleRemoveMember}>
                        <input type="hidden" name="membershipId" value={membership.id} />
                        <Button type="submit" size="sm" variant="destructive">
                          Remove
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Role Descriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Role Permissions</CardTitle>
            <CardDescription>
              Understanding what each role can do in your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="font-medium">Admin</div>
                <div className="text-sm text-muted-foreground">
                  Full access to all organization settings, members, and data. Can manage billing and delete the organization.
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-medium">Product Manager</div>
                <div className="text-sm text-muted-foreground">
                  Can manage products, roadmaps, and features. Can invite members and manage teams within their scope.
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-medium">Contributor</div>
                <div className="text-sm text-muted-foreground">
                  Can create and edit content, participate in discussions, and contribute to product development.
                </div>
              </div>
              <div className="space-y-2">
                <div className="font-medium">Stakeholder</div>
                <div className="text-sm text-muted-foreground">
                  Read-only access to view progress, reports, and participate in reviews and feedback sessions.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}