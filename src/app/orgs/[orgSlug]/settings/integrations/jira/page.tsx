import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Settings,
  Shield,
  Webhook,
  GitBranch,
  Users,
  Clock,
  Target,
  Zap
} from "lucide-react";
import Link from "next/link";
import { setupJiraIntegration, testJiraConnection, disconnectJiraIntegration } from "@/server/actions/integrations";

// Jira icon component
const JiraIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.53 2c0 2.4-1.97 4.35-4.35 4.35H2.81L11.53 2zM21.44 11.76c2.4 0 4.35-1.97 4.35-4.35V2.81L21.44 11.76zM11.53 22c0-2.4 1.97-4.35 4.35-4.35h4.37L11.53 22zM2.56 12.24c-2.4 0-4.35 1.97-4.35 4.35v4.6l8.72-8.95z"/>
  </svg>
);

interface JiraIntegrationPageProps {
  params: {
    orgSlug: string;
  };
  searchParams: {
    code?: string;
    state?: string;
    error?: string;
    connected?: string;
    disconnected?: string;
    test?: string;
  };
}

export default async function JiraIntegrationPage({
  params,
  searchParams,
}: JiraIntegrationPageProps) {
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

  // Check if user has access
  await requireRole(user.id, organization.id, ["ADMIN", "PRODUCT_MANAGER"]);

  // Mock Jira integration status (would come from database in real implementation)
  const jiraIntegration = {
    id: "jira-" + organization.id,
    isConnected: false,
    instance: null,
    projects: [],
    fieldMappings: {},
    lastSync: null,
    settings: {
      syncEpics: true,
      syncStories: true,
      syncSprints: true,
      autoTransitions: false,
      timeTracking: true,
    }
  };

  // Handle OAuth callback
  if (searchParams.code && searchParams.state) {
    // In real implementation, this would exchange the code for an access token
    // and store the integration details in the database
  }

  async function handleConnect(formData: FormData) {
    "use server";
    if (!organization) {
      throw new Error("Organization not found");
    }
    
    const result = await setupJiraIntegration(organization.id, formData);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/settings/integrations/jira?connected=true`);
    } else {
      throw new Error(result.error);
    }
  }

  async function handleDisconnect() {
    "use server";
    if (!organization) {
      throw new Error("Organization not found");
    }
    
    const result = await disconnectJiraIntegration(organization.id);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/settings/integrations/jira?disconnected=true`);
    } else {
      throw new Error(result.error);
    }
  }

  async function handleTest() {
    "use server";
    if (!organization) {
      throw new Error("Organization not found");
    }
    
    const result = await testJiraConnection(organization.id);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/settings/integrations/jira?test=success`);
    } else {
      redirect(`/orgs/${params.orgSlug}/settings/integrations/jira?test=failed&error=${encodeURIComponent(result.error || "Unknown error")}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orgs/${params.orgSlug}/settings/integrations`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Integrations
            </Link>
          </Button>
          <div className="flex items-center space-x-3">
            <JiraIcon className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Jira Integration</h1>
              <p className="text-muted-foreground">
                Synchronize epics, stories, and sprints with your Jira workspace
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge 
            className={jiraIntegration.isConnected 
              ? "bg-green-100 text-green-700" 
              : "bg-gray-100 text-gray-700"
            }
          >
            {jiraIntegration.isConnected ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            {jiraIntegration.isConnected ? "Connected" : "Not Connected"}
          </Badge>
        </div>
      </div>

      {/* Connection Status */}
      {searchParams.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Connection Error</span>
            </div>
            <p className="text-red-600 text-sm mt-1">
              {decodeURIComponent(searchParams.error)}
            </p>
          </CardContent>
        </Card>
      )}

      {searchParams.connected && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="font-medium">Successfully Connected</span>
            </div>
            <p className="text-green-600 text-sm mt-1">
              Jira integration has been configured successfully.
            </p>
          </CardContent>
        </Card>
      )}

      {!jiraIntegration.isConnected ? (
        <>
          {/* Connection Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <JiraIcon className="h-5 w-5" />
                <span>Connect Jira</span>
              </CardTitle>
              <CardDescription>
                Authorize ProdMatic to access your Jira workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">What this integration provides:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li className="flex items-center space-x-2">
                      <Target className="h-3 w-3" />
                      <span>Two-way synchronization of epics and stories</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Clock className="h-3 w-3" />
                      <span>Sprint planning integration and timeline sync</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Zap className="h-3 w-3" />
                      <span>Automatic status updates and transitions</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Users className="h-3 w-3" />
                      <span>Time tracking and effort estimation sync</span>
                    </li>
                  </ul>
                </div>

                <form action={handleConnect} className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="jiraUrl">Jira Instance URL</Label>
                      <Input
                        id="jiraUrl"
                        name="jiraUrl"
                        type="url"
                        placeholder="https://yourcompany.atlassian.net"
                        required
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Enter your Jira Cloud or Server instance URL
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="authenticationType">Authentication Method</Label>
                      <Select name="authenticationType" defaultValue="oauth">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oauth">OAuth 2.0 (Recommended)</SelectItem>
                          <SelectItem value="token">API Token</SelectItem>
                          <SelectItem value="basic">Basic Auth</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-2">Required Permissions:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { scope: "read:jira-work", description: "Read issues, projects, and workflows" },
                        { scope: "write:jira-work", description: "Create and update issues" },
                        { scope: "read:jira-user", description: "Read user information" },
                        { scope: "manage:jira-project", description: "Manage project settings" },
                      ].map((permission) => (
                        <div key={permission.scope} className="flex items-start space-x-2">
                          <Shield className="h-4 w-4 mt-0.5 text-blue-600" />
                          <div>
                            <code className="text-sm font-mono bg-gray-100 px-1 rounded">
                              {permission.scope}
                            </code>
                            <p className="text-sm text-muted-foreground">{permission.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Ready to connect?</h4>
                      <p className="text-sm text-muted-foreground">
                        You&apos;ll be redirected to Jira to authorize the connection
                      </p>
                    </div>
                    <Button type="submit" className="flex items-center space-x-2">
                      <JiraIcon className="h-4 w-4" />
                      <span>Connect Jira</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Connected State */}
          <div className="grid gap-6">
            {/* Instance Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Connected Instance</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <JiraIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{jiraIntegration.instance || "Jira Instance"}</h4>
                      <p className="text-sm text-muted-foreground">
                        Connected {jiraIntegration.lastSync ? "recently" : "just now"}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <form action={handleTest}>
                      <Button variant="outline" type="submit">Test Connection</Button>
                    </form>
                    <form action={handleDisconnect}>
                      <Button variant="destructive" type="submit">Disconnect</Button>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <GitBranch className="h-5 w-5" />
                  <span>Project Configuration</span>
                </CardTitle>
                <CardDescription>
                  Select Jira projects to sync with your products
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Available Projects</h4>
                    {jiraIntegration.projects.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No projects found. Make sure you have access to projects in your connected Jira instance.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {jiraIntegration.projects.map((project: any) => (
                          <div key={project.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center space-x-2">
                              <Checkbox id={project.id} />
                              <Label htmlFor={project.id}>{project.name}</Label>
                            </div>
                            <Badge variant="outline">{project.projectTypeKey}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Field Mapping */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Field Mapping</span>
                </CardTitle>
                <CardDescription>
                  Map ProdMatic fields to your Jira custom fields
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { prodField: "Priority", jiraField: "Priority", required: true },
                    { prodField: "Epic Link", jiraField: "Epic Link", required: false },
                    { prodField: "Story Points", jiraField: "Story Points", required: false },
                    { prodField: "Sprint", jiraField: "Sprint", required: false },
                    { prodField: "Assignee", jiraField: "Assignee", required: true },
                  ].map((mapping) => (
                    <div key={mapping.prodField} className="grid grid-cols-2 gap-4 items-center">
                      <div>
                        <Label className="font-medium">{mapping.prodField}</Label>
                        {mapping.required && (
                          <Badge variant="outline" className="ml-2 text-xs">Required</Badge>
                        )}
                      </div>
                      <Select defaultValue={mapping.jiraField.toLowerCase().replace(" ", "_")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="priority">Priority</SelectItem>
                          <SelectItem value="epic_link">Epic Link</SelectItem>
                          <SelectItem value="story_points">Story Points</SelectItem>
                          <SelectItem value="sprint">Sprint</SelectItem>
                          <SelectItem value="assignee">Assignee</SelectItem>
                          <SelectItem value="custom_field_1">Custom Field 1</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Integration Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Integration Settings</span>
                </CardTitle>
                <CardDescription>
                  Configure how Jira integrates with your products
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(jiraIntegration.settings).map(([key, value]) => {
                    const settingLabels: Record<string, { label: string; description: string }> = {
                      syncEpics: {
                        label: "Sync Epics",
                        description: "Synchronize epics between ProdMatic and Jira"
                      },
                      syncStories: {
                        label: "Sync Stories", 
                        description: "Synchronize user stories and tasks"
                      },
                      syncSprints: {
                        label: "Sync Sprints",
                        description: "Keep sprint information in sync across platforms"
                      },
                      autoTransitions: {
                        label: "Auto Status Transitions",
                        description: "Automatically transition issues based on workflow rules"
                      },
                      timeTracking: {
                        label: "Time Tracking",
                        description: "Sync time tracking and work logs"
                      }
                    };

                    const setting = settingLabels[key];
                    if (!setting) return null;

                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <Label htmlFor={key} className="font-medium">{setting.label}</Label>
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                        </div>
                        <Checkbox id={key} defaultChecked={value as boolean} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Webhook Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Webhook className="h-5 w-5" />
                  <span>Webhook Configuration</span>
                </CardTitle>
                <CardDescription>
                  Webhook endpoints for real-time synchronization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="font-medium">Webhook URL</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input 
                        value={`${process.env.NEXTAUTH_URL}/api/webhooks/jira`}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button variant="outline" size="sm">Copy</Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add this URL to your Jira webhook configuration
                    </p>
                  </div>

                  <div>
                    <Label className="font-medium">Supported Events</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {[
                        "Issue Created",
                        "Issue Updated", 
                        "Issue Deleted",
                        "Sprint Started",
                        "Sprint Completed",
                        "Comment Added"
                      ].map((event) => (
                        <div key={event} className="flex items-center space-x-2">
                          <CheckCircle className="h-3 w-3 text-green-600" />
                          <span className="text-sm">{event}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Check out our comprehensive guide for setting up Jira integration
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="https://docs.prodmatic.com/integrations/jira" target="_blank">
                View Documentation
                <ExternalLink className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}