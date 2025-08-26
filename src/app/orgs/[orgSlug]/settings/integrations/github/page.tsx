import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  Github,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Settings,
  Shield,
  Webhook,
  GitBranch,
  GitPullRequest,
  Tag,
  Users
} from "lucide-react";
import Link from "next/link";
import { setupGitHubIntegration, testGitHubConnection, disconnectGitHubIntegration } from "@/server/actions/integrations";

interface GitHubIntegrationPageProps {
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

export default async function GitHubIntegrationPage({
  params,
  searchParams,
}: GitHubIntegrationPageProps) {
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

  // Mock GitHub integration status (would come from database in real implementation)
  const githubIntegration = {
    id: "github-" + organization.id,
    isConnected: false,
    account: null,
    repositories: [],
    webhooksConfigured: false,
    lastSync: null,
    scopes: ["repo", "read:org", "read:user"],
    settings: {
      autoCreateIssues: true,
      linkPullRequests: true,
      syncReleases: true,
      trackCommits: false,
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
    
    const result = await setupGitHubIntegration(organization.id, formData);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/settings/integrations/github?connected=true`);
    } else {
      throw new Error(result.error);
    }
  }

  async function handleDisconnect() {
    "use server";
    if (!organization) {
      throw new Error("Organization not found");
    }
    
    const result = await disconnectGitHubIntegration(organization.id);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/settings/integrations/github?disconnected=true`);
    } else {
      throw new Error(result.error);
    }
  }

  async function handleTest() {
    "use server";
    if (!organization) {
      throw new Error("Organization not found");
    }
    
    const result = await testGitHubConnection(organization.id);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/settings/integrations/github?test=success`);
    } else {
      redirect(`/orgs/${params.orgSlug}/settings/integrations/github?test=failed&error=${encodeURIComponent(result.error)}`);
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
            <Github className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">GitHub Integration</h1>
              <p className="text-muted-foreground">
                Connect your GitHub repositories to sync issues, pull requests, and releases
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge 
            className={githubIntegration.isConnected 
              ? "bg-green-100 text-green-700" 
              : "bg-gray-100 text-gray-700"
            }
          >
            {githubIntegration.isConnected ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            {githubIntegration.isConnected ? "Connected" : "Not Connected"}
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
              GitHub integration has been configured successfully.
            </p>
          </CardContent>
        </Card>
      )}

      {!githubIntegration.isConnected ? (
        <>
          {/* Connection Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Github className="h-5 w-5" />
                <span>Connect GitHub</span>
              </CardTitle>
              <CardDescription>
                Authorize ProdMatic to access your GitHub repositories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">What this integration provides:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li className="flex items-center space-x-2">
                      <GitBranch className="h-3 w-3" />
                      <span>Automatic issue creation from product ideas</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <GitPullRequest className="h-3 w-3" />
                      <span>Link features to pull requests and commits</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Tag className="h-3 w-3" />
                      <span>Sync releases and generate automated changelogs</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Users className="h-3 w-3" />
                      <span>Track developer activity and contributions</span>
                    </li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Required Permissions:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { scope: "repo", description: "Access repository data and create issues" },
                      { scope: "read:org", description: "Read organization membership" },
                      { scope: "read:user", description: "Read basic user profile information" },
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
                        You&apos;ll be redirected to GitHub to authorize the connection
                      </p>
                    </div>
                    <Button type="submit" className="flex items-center space-x-2">
                      <Github className="h-4 w-4" />
                      <span>Connect GitHub</span>
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
            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Connected Account</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Github className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">{githubIntegration.account || "GitHub Account"}</h4>
                      <p className="text-sm text-muted-foreground">
                        Connected {githubIntegration.lastSync ? "recently" : "just now"}
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

            {/* Repository Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <GitBranch className="h-5 w-5" />
                  <span>Repository Configuration</span>
                </CardTitle>
                <CardDescription>
                  Select repositories to sync with your products
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3">Available Repositories</h4>
                    {githubIntegration.repositories.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No repositories found. Make sure you have access to repositories in your connected account.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {githubIntegration.repositories.map((repo: any) => (
                          <div key={repo.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center space-x-2">
                              <Checkbox id={repo.id} />
                              <Label htmlFor={repo.id}>{repo.full_name}</Label>
                            </div>
                            <Badge variant="outline">{repo.language}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                  Configure how GitHub integrates with your products
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(githubIntegration.settings).map(([key, value]) => {
                    const settingLabels: Record<string, { label: string; description: string }> = {
                      autoCreateIssues: {
                        label: "Auto-create GitHub issues",
                        description: "Automatically create GitHub issues when ideas are approved"
                      },
                      linkPullRequests: {
                        label: "Link pull requests",
                        description: "Connect pull requests to features and track development progress"
                      },
                      syncReleases: {
                        label: "Sync releases",
                        description: "Automatically sync GitHub releases with product releases"
                      },
                      trackCommits: {
                        label: "Track commits",
                        description: "Monitor commit activity and link to features"
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
                        value={`${process.env.NEXTAUTH_URL}/api/webhooks/github`}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button variant="outline" size="sm">Copy</Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add this URL to your GitHub repository webhooks
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Webhook Status</span>
                      <p className="text-sm text-muted-foreground">
                        Status of webhook configuration
                      </p>
                    </div>
                    <Badge 
                      className={githubIntegration.webhooksConfigured 
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                      }
                    >
                      {githubIntegration.webhooksConfigured ? "Configured" : "Pending"}
                    </Badge>
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
                Check out our comprehensive guide for setting up GitHub integration
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="https://docs.prodmatic.com/integrations/github" target="_blank">
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