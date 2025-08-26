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
  MessageSquare,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Settings,
  Shield,
  Webhook,
  Hash,
  Users,
  Bell,
  Calendar,
  Send
} from "lucide-react";
import Link from "next/link";
import { setupSlackIntegration, testSlackConnection, disconnectSlackIntegration } from "@/server/actions/integrations";

interface SlackIntegrationPageProps {
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

export default async function SlackIntegrationPage({
  params,
  searchParams,
}: SlackIntegrationPageProps) {
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

  // Mock Slack integration status (would come from database in real implementation)
  const slackIntegration = {
    id: "slack-" + organization.id,
    isConnected: true, // Set to true to show connected state example
    workspace: {
      name: "Your Company",
      domain: "yourcompany.slack.com",
      id: "T1234567890"
    },
    channels: [
      { id: "C1234567890", name: "product-updates", private: false },
      { id: "C1234567891", name: "releases", private: false },
      { id: "C1234567892", name: "feedback", private: false },
    ],
    bot: {
      userId: "U1234567890",
      name: "ProdMatic",
    },
    lastSync: new Date().toISOString(),
    settings: {
      releaseNotifications: true,
      feedbackAlerts: true,
      dailyDigest: false,
      launchAnnouncements: true,
      sprintUpdates: true,
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
    
    const result = await setupSlackIntegration(organization.id, formData);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/settings/integrations/slack?connected=true`);
    } else {
      throw new Error(result.error);
    }
  }

  async function handleDisconnect() {
    "use server";
    if (!organization) {
      throw new Error("Organization not found");
    }
    
    const result = await disconnectSlackIntegration(organization.id);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/settings/integrations/slack?disconnected=true`);
    } else {
      throw new Error(result.error);
    }
  }

  async function handleTest() {
    "use server";
    if (!organization) {
      throw new Error("Organization not found");
    }
    
    const result = await testSlackConnection(organization.id);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/settings/integrations/slack?test=success`);
    } else {
      redirect(`/orgs/${params.orgSlug}/settings/integrations/slack?test=failed&error=${encodeURIComponent(result.error || "Unknown error")}`);
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
            <MessageSquare className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Slack Integration</h1>
              <p className="text-muted-foreground">
                Get notifications and updates about your products in Slack channels
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge 
            className={slackIntegration.isConnected 
              ? "bg-green-100 text-green-700" 
              : "bg-gray-100 text-gray-700"
            }
          >
            {slackIntegration.isConnected ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            {slackIntegration.isConnected ? "Connected" : "Not Connected"}
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
              Slack integration has been configured successfully.
            </p>
          </CardContent>
        </Card>
      )}

      {!slackIntegration.isConnected ? (
        <>
          {/* Connection Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Connect Slack</span>
              </CardTitle>
              <CardDescription>
                Authorize ProdMatic to send notifications to your Slack workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">What this integration provides:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li className="flex items-center space-x-2">
                      <Bell className="h-3 w-3" />
                      <span>Real-time product update notifications</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Send className="h-3 w-3" />
                      <span>Automated release announcements</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <MessageSquare className="h-3 w-3" />
                      <span>Feedback collection via Slack channels</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Calendar className="h-3 w-3" />
                      <span>Daily digest and sprint updates</span>
                    </li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Required Permissions:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { scope: "channels:read", description: "View channels in your workspace" },
                      { scope: "chat:write", description: "Send messages as ProdMatic" },
                      { scope: "users:read", description: "View people in your workspace" },
                      { scope: "incoming-webhook", description: "Post messages to specific channels" },
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

                <form action={handleConnect} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Ready to connect?</h4>
                      <p className="text-sm text-muted-foreground">
                        You&apos;ll be redirected to Slack to authorize the connection
                      </p>
                    </div>
                    <Button type="submit" className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Connect Slack</span>
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
            {/* Workspace Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Connected Workspace</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{slackIntegration.workspace.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {slackIntegration.workspace.domain}
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

            {/* Bot Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5" />
                  <span>Bot Configuration</span>
                </CardTitle>
                <CardDescription>
                  ProdMatic bot information and status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">@{slackIntegration.bot.name}</h4>
                      <p className="text-sm text-muted-foreground">Bot User ID: {slackIntegration.bot.userId}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Channel Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Hash className="h-5 w-5" />
                  <span>Channel Configuration</span>
                </CardTitle>
                <CardDescription>
                  Configure which channels receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4">
                    {[
                      { type: "releases", label: "Release Notifications", description: "New releases and version updates" },
                      { type: "feedback", label: "Feedback Alerts", description: "New customer feedback and feature requests" },
                      { type: "sprints", label: "Sprint Updates", description: "Sprint start, end, and progress updates" },
                      { type: "launches", label: "Launch Announcements", description: "Product launch and milestone notifications" },
                    ].map((notificationType) => (
                      <div key={notificationType.type} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{notificationType.label}</h4>
                            <p className="text-sm text-muted-foreground">{notificationType.description}</p>
                          </div>
                          <Checkbox defaultChecked={notificationType.type === "releases"} />
                        </div>
                        <div className="mt-3">
                          <Label className="text-sm">Channel</Label>
                          <Select defaultValue={notificationType.type === "releases" ? "C1234567891" : ""}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select channel" />
                            </SelectTrigger>
                            <SelectContent>
                              {slackIntegration.channels.map((channel) => (
                                <SelectItem key={channel.id} value={channel.id}>
                                  #{channel.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notification Settings</span>
                </CardTitle>
                <CardDescription>
                  Configure when and how notifications are sent
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(slackIntegration.settings).map(([key, value]) => {
                    const settingLabels: Record<string, { label: string; description: string }> = {
                      releaseNotifications: {
                        label: "Release Notifications",
                        description: "Send notifications when new releases are published"
                      },
                      feedbackAlerts: {
                        label: "Feedback Alerts",
                        description: "Get notified about new customer feedback"
                      },
                      dailyDigest: {
                        label: "Daily Digest",
                        description: "Receive a daily summary of product activity"
                      },
                      launchAnnouncements: {
                        label: "Launch Announcements",
                        description: "Announce major product launches and milestones"
                      },
                      sprintUpdates: {
                        label: "Sprint Updates",
                        description: "Updates about sprint progress and completion"
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

            {/* Message Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Message Templates</span>
                </CardTitle>
                <CardDescription>
                  Customize notification message formats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="releaseTemplate">Release Notification Template</Label>
                    <Input
                      id="releaseTemplate"
                      defaultValue="🚀 New release {version} is now available! Check out what's new: {changelog_url}"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="feedbackTemplate">Feedback Alert Template</Label>
                    <Input
                      id="feedbackTemplate"
                      defaultValue="💬 New feedback received: '{title}' from {customer_name}"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sprintTemplate">Sprint Update Template</Label>
                    <Input
                      id="sprintTemplate"
                      defaultValue="🏃‍♂️ Sprint '{sprint_name}' has {status}. {completed_tasks}/{total_tasks} tasks completed."
                      className="mt-1"
                    />
                  </div>
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
                  Webhook endpoints for real-time notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="font-medium">Webhook URL</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input 
                        value={`${process.env.NEXTAUTH_URL}/api/webhooks/slack`}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button variant="outline" size="sm">Copy</Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      This webhook URL is automatically configured when you connect Slack
                    </p>
                  </div>

                  <div>
                    <Label className="font-medium">Supported Events</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {[
                        "Release Published",
                        "Feedback Received",
                        "Sprint Started",
                        "Sprint Completed",
                        "Launch Milestone",
                        "Feature Flag Changed"
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
                Check out our comprehensive guide for setting up Slack integration
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="https://docs.prodmatic.com/integrations/slack" target="_blank">
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