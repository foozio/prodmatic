import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { updateOrganization, deleteOrganization } from "@/server/actions/organizations";
import { Settings, Users, Shield, Trash2 } from "lucide-react";

interface OrganizationSettingsPageProps {
  params: Promise<{
    orgSlug: string;
  }>;
}

export default async function OrganizationSettingsPage({
  params,
}: OrganizationSettingsPageProps) {
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
      },
      teams: true,
    },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  // Check if user has admin access
  await requireRole(user.id, organization.id, ["ADMIN"]);

  const memberCount = organization.memberships.length;
  const teamCount = organization.teams.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization&apos;s settings and configuration
        </p>
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
              Basic information about your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateOrganization} className="space-y-4">
              <input type="hidden" name="organizationId" value={organization.id} />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={organization.name}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    name="slug"
                    defaultValue={organization.slug}
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
                  defaultValue={organization.description || ""}
                  placeholder="Describe your organization..."
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  name="website"
                  type="url"
                  defaultValue={organization.website || ""}
                  placeholder="https://yourcompany.com"
                />
              </div>

              <Button type="submit">Save Changes</Button>
            </form>
          </CardContent>
        </Card>

        {/* Organization Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <CardTitle>Organization Overview</CardTitle>
            </div>
            <CardDescription>
              Current statistics and information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{memberCount}</div>
                <div className="text-sm text-muted-foreground">Members</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{teamCount}</div>
                <div className="text-sm text-muted-foreground">Teams</div>
              </div>
              <div className="text-center">
                <Badge variant="secondary" className="text-sm">
                  {organization.plan || "Free"}
                </Badge>
                <div className="text-sm text-muted-foreground">Plan</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Security & Access</CardTitle>
            </div>
            <CardDescription>
              Manage security settings and access controls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Two-Factor Authentication</div>
                <div className="text-sm text-muted-foreground">
                  Require 2FA for all organization members
                </div>
              </div>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">SSO Integration</div>
                <div className="text-sm text-muted-foreground">
                  Single Sign-On with your identity provider
                </div>
              </div>
              <Badge variant="outline">Coming Soon</Badge>
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
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Delete Organization</div>
                <div className="text-sm text-muted-foreground">
                  Permanently delete this organization and all its data
                </div>
              </div>
              <form action={deleteOrganization}>
                <input type="hidden" name="organizationId" value={organization.id} />
                <Button type="submit" variant="destructive" size="sm">
                  Delete
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}