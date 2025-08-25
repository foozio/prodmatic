import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Plus, 
  Settings, 
  Check,
  X,
  Github,
  MessageSquare,
  ExternalLink,
  Zap,
  Database,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";
import Link from "next/link";

interface IntegrationsPageProps {
  params: {
    orgSlug: string;
  };
}

// Jira icon component (lucide doesn't have one)
const JiraIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.53 2c0 2.4-1.97 4.35-4.35 4.35H2.81L11.53 2zM21.44 11.76c2.4 0 4.35-1.97 4.35-4.35V2.81L21.44 11.76zM11.53 22c0-2.4 1.97-4.35 4.35-4.35h4.37L11.53 22zM2.56 12.24c-2.4 0-4.35 1.97-4.35 4.35v4.6l8.72-8.95z"/>
  </svg>
);

export default async function IntegrationsPage({
  params,
}: IntegrationsPageProps) {
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

  // Mock integration status (would come from database in real implementation)
  const integrations = [
    {
      id: "github",
      name: "GitHub",
      description: "Sync issues, pull requests, and releases with your product development",
      icon: Github,
      category: "Development",
      status: "disconnected", // connected, disconnected, error
      features: [
        "Automatic issue creation from ideas",
        "Link features to pull requests", 
        "Release notes from commits",
        "Developer activity tracking"
      ],
      setupUrl: `/orgs/${params.orgSlug}/settings/integrations/github`,
      docsUrl: "https://docs.prodmatic.com/integrations/github",
      webhookUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/github`,
    },
    {
      id: "jira",
      name: "Jira",
      description: "Synchronize epics, stories, and sprints with your Jira workspace",
      icon: JiraIcon,
      category: "Project Management",
      status: "disconnected",
      features: [
        "Two-way sync of epics and stories",
        "Sprint planning integration",
        "Status updates and transitions",
        "Time tracking and estimates"
      ],
      setupUrl: `/orgs/${params.orgSlug}/settings/integrations/jira`,
      docsUrl: "https://docs.prodmatic.com/integrations/jira",
      webhookUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/jira`,
    },
    {
      id: "slack",
      name: "Slack",
      description: "Get notifications and updates about your products in Slack channels",
      icon: MessageSquare,
      category: "Communication",
      status: "connected",
      features: [
        "Product update notifications",
        "Release announcements",
        "Feedback collection via Slack",
        "Daily standups and reports"
      ],
      setupUrl: `/orgs/${params.orgSlug}/settings/integrations/slack`,
      docsUrl: "https://docs.prodmatic.com/integrations/slack",
      webhookUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/slack`,
    },
    {
      id: "linear",
      name: "Linear",
      description: "Streamline issue tracking and project management with Linear",
      icon: Zap,
      category: "Development",
      status: "coming_soon",
      features: [
        "Issue sync and management",
        "Project milestone tracking",
        "Team workflow integration",
        "Automated status updates"
      ],
      setupUrl: `/orgs/${params.orgSlug}/settings/integrations/linear`,
      docsUrl: "https://docs.prodmatic.com/integrations/linear",
      webhookUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/linear`,
    },
    {
      id: "notion",
      name: "Notion",
      description: "Sync product documents and specifications with your Notion workspace",
      icon: Database,
      category: "Documentation",
      status: "coming_soon",
      features: [
        "Document synchronization",
        "Specification templates",
        "Knowledge base integration",
        "Collaborative editing"
      ],
      setupUrl: `/orgs/${params.orgSlug}/settings/integrations/notion`,
      docsUrl: "https://docs.prodmatic.com/integrations/notion",
      webhookUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/notion`,
    },
    {
      id: "zapier",
      name: "Zapier",
      description: "Connect ProdMatic with 5000+ apps through automated workflows",
      icon: Zap,
      category: "Automation",
      status: "disconnected",
      features: [
        "Custom workflow automation",
        "Data synchronization",
        "Event-driven triggers",
        "Multi-app integrations"
      ],
      setupUrl: `/orgs/${params.orgSlug}/settings/integrations/zapier`,
      docsUrl: "https://docs.prodmatic.com/integrations/zapier",
      webhookUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/zapier`,
    },
  ];

  const statusConfig = {
    connected: {
      color: "bg-green-100 text-green-700",
      icon: CheckCircle,
      label: "Connected"
    },
    disconnected: {
      color: "bg-gray-100 text-gray-700", 
      icon: X,
      label: "Not Connected"
    },
    error: {
      color: "bg-red-100 text-red-700",
      icon: AlertCircle,
      label: "Connection Error"
    },
    coming_soon: {
      color: "bg-blue-100 text-blue-700",
      icon: Clock,
      label: "Coming Soon"
    }
  };

  const categories = [...new Set(integrations.map(i => i.category))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orgs/${params.orgSlug}/settings`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
            <p className="text-muted-foreground">
              Connect ProdMatic with your favorite tools and services
            </p>
          </div>
        </div>
      </div>

      {/* Integration Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Integrations</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations.length}</div>
            <p className="text-xs text-muted-foreground">
              Available integrations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {integrations.filter(i => i.status === "connected").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Active connections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {integrations.filter(i => i.status === "disconnected").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready to connect
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coming Soon</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {integrations.filter(i => i.status === "coming_soon").length}
            </div>
            <p className="text-xs text-muted-foreground">
              In development
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integration Categories */}
      {categories.map(category => (
        <div key={category} className="space-y-4">
          <div className="border-b pb-2">
            <h2 className="text-xl font-semibold">{category}</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {integrations.filter(integration => integration.category === category).map(integration => {
              const Icon = integration.icon;
              const statusInfo = statusConfig[integration.status as keyof typeof statusConfig];
              const StatusIcon = statusInfo.icon;
              
              return (
                <Card key={integration.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Icon className="h-8 w-8" />
                        <div>
                          <CardTitle className="text-lg">{integration.name}</CardTitle>
                          <Badge className={`text-xs ${statusInfo.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>
                      
                      {integration.status === "connected" && (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={integration.setupUrl}>
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </Link>
                        </Button>
                      )}
                      
                      {integration.status === "disconnected" && (
                        <Button size="sm" asChild>
                          <Link href={integration.setupUrl}>
                            <Plus className="h-4 w-4 mr-2" />
                            Connect
                          </Link>
                        </Button>
                      )}
                      
                      {integration.status === "coming_soon" && (
                        <Button variant="outline" size="sm" disabled>
                          Coming Soon
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <CardDescription className="mb-4">
                      {integration.description}
                    </CardDescription>
                    
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm mb-2">Features:</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {integration.features.map((feature, index) => (
                            <li key={index} className="flex items-center space-x-2">
                              <Check className="h-3 w-3 text-green-600" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={integration.docsUrl} target="_blank">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Documentation
                          </Link>
                        </Button>
                        
                        {integration.status === "connected" && (
                          <div className="text-xs text-muted-foreground">
                            Last sync: 5 minutes ago
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Integration Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security & Privacy</span>
          </CardTitle>
          <CardDescription>
            How we keep your integrations secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Data Protection</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• All connections use OAuth 2.0 or API keys</li>
                <li>• Data is encrypted in transit and at rest</li>
                <li>• Regular security audits and monitoring</li>
                <li>• Minimal permission requests</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Access Control</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Only admins can manage integrations</li>
                <li>• Granular permission controls</li>
                <li>• Audit logs for all integration actions</li>
                <li>• Easy disconnection and data removal</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Information */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Endpoints</CardTitle>
          <CardDescription>
            Use these endpoints to configure webhooks in external services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {integrations.filter(i => i.status !== "coming_soon").map(integration => (
              <div key={integration.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <integration.icon className="h-4 w-4" />
                  <span className="font-medium">{integration.name}</span>
                </div>
                <div className="text-sm text-muted-foreground font-mono">
                  {integration.webhookUrl}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}