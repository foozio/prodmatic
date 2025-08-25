import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  MessageCircle,
  Lightbulb,
  Eye,
  ChevronRight,
  Filter,
  Search
} from "lucide-react";
import Link from "next/link";
import { createInsight } from "@/server/actions/interviews";

interface InsightsPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
}

const insightSourceColors = {
  INTERVIEW: "bg-blue-500",
  SURVEY: "bg-green-500", 
  ANALYTICS: "bg-purple-500",
  EXPERIMENT: "bg-orange-500",
  FEEDBACK: "bg-red-500",
  OBSERVATION: "bg-gray-500",
};

const impactColors = {
  LOW: "bg-gray-500",
  MEDIUM: "bg-yellow-500",
  HIGH: "bg-orange-500", 
  CRITICAL: "bg-red-500",
};

export default async function InsightsPage({
  params,
}: InsightsPageProps) {
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

  const insights = await db.insight.findMany({
    where: {
      productId: product.id,
      deletedAt: null,
    },
    include: {
      interview: {
        include: {
          customer: true,
        },
      },
      idea: true,
      experiment: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const interviews = await db.interview.findMany({
    where: {
      productId: product.id,
      status: "CONDUCTED",
      deletedAt: null,
    },
    include: {
      customer: true,
      insights: true,
    },
    orderBy: {
      conductedAt: "desc",
    },
  });

  const currentMembership = user.memberships.find(m => m.organizationId === organization.id);
  const canExtractInsights = currentMembership?.role === "ADMIN" || 
                            currentMembership?.role === "PRODUCT_MANAGER" ||
                            currentMembership?.role === "CONTRIBUTOR";

  const insightStats = {
    total: insights.length,
    bySource: insights.reduce((acc, insight) => {
      acc[insight.source] = (acc[insight.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byImpact: insights.reduce((acc, insight) => {
      acc[insight.impact] = (acc[insight.impact] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    pendingInterviews: interviews.filter(i => i.insights.length === 0).length,
  };

  async function handleCreateInsight(formData: FormData) {
    "use server";
    
    const result = await createInsight(organization!.id, formData);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/products/${params.productKey}/insights`);
    }
    
    console.error("Failed to create insight:", result.error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Insights & Analysis</h1>
          <p className="text-muted-foreground">
            Extract and analyze insights from user research for {product.name}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/interviews`}>
              <MessageCircle className="h-4 w-4 mr-2" />
              View Interviews
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/personas`}>
              <Target className="h-4 w-4 mr-2" />
              View Personas
            </Link>
          </Button>
        </div>
      </div>

      {/* Insights Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Insights</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insightStats.total}</div>
            <p className="text-xs text-muted-foreground">
              Extracted insights
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Impact</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(insightStats.byImpact.HIGH || 0) + (insightStats.byImpact.CRITICAL || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Critical & high impact
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">From Interviews</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insightStats.bySource.INTERVIEW || 0}</div>
            <p className="text-xs text-muted-foreground">
              User research insights
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Analysis</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insightStats.pendingInterviews}</div>
            <p className="text-xs text-muted-foreground">
              Interviews to analyze
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Insights List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Insights</CardTitle>
                  <CardDescription>
                    Key insights extracted from user research
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {insights.length === 0 ? (
                <div className="text-center py-8">
                  <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No insights yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start extracting insights from your interviews and research
                  </p>
                  {canExtractInsights && interviews.length > 0 && (
                    <p className="text-sm text-blue-600">
                      You have {insightStats.pendingInterviews} interviews ready for analysis
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {insights.map((insight) => (
                    <div 
                      key={insight.id} 
                      className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium">{insight.title}</h3>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="secondary" 
                            className={`text-white ${insightSourceColors[insight.source]}`}
                          >
                            {insight.source}
                          </Badge>
                          <Badge 
                            variant="secondary" 
                            className={`text-white ${impactColors[insight.impact]}`}
                          >
                            {insight.impact}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {insight.description}
                      </p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center space-x-4">
                          {insight.interview && (
                            <span>
                              From: {insight.interview.title}
                              {insight.interview.customer && ` (${insight.interview.customer.name})`}
                            </span>
                          )}
                          <span>Confidence: {insight.confidence}/5</span>
                        </div>
                        <span>
                          {new Date(insight.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {insight.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {insight.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Extract New Insight */}
          {canExtractInsights && (
            <Card>
              <CardHeader>
                <CardTitle>Extract Insight</CardTitle>
                <CardDescription>
                  Create a new insight from research data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={handleCreateInsight} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="interviewId">Source Interview</Label>
                    <Select name="interviewId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select interview" />
                      </SelectTrigger>
                      <SelectContent>
                        {interviews.map((interview) => (
                          <SelectItem key={interview.id} value={interview.id}>
                            {interview.title}
                            {interview.customer && ` (${interview.customer.name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Insight Title</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="Key finding or insight..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Detailed description of the insight..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="impact">Impact</Label>
                      <Select name="impact" defaultValue="MEDIUM">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confidence">Confidence (1-5)</Label>
                      <Select name="confidence" defaultValue="3">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Very Low</SelectItem>
                          <SelectItem value="2">2 - Low</SelectItem>
                          <SelectItem value="3">3 - Medium</SelectItem>
                          <SelectItem value="4">4 - High</SelectItem>
                          <SelectItem value="5">5 - Very High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      name="tags"
                      placeholder="user-behavior, pain-point, feature-request"
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Extract Insight
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Pending Analysis */}
          {insightStats.pendingInterviews > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pending Analysis</CardTitle>
                <CardDescription>
                  Interviews ready for insight extraction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {interviews
                    .filter(i => i.insights.length === 0)
                    .slice(0, 5)
                    .map((interview) => (
                    <div key={interview.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="text-sm font-medium">{interview.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {interview.customer?.name} • {new Date(interview.conductedAt!).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/interviews/${interview.id}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                  {insightStats.pendingInterviews > 5 && (
                    <div className="text-center pt-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/interviews`}>
                          View all {insightStats.pendingInterviews} interviews
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insight Analysis Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium">Look for Patterns</h4>
                <p className="text-muted-foreground">Identify recurring themes across multiple interviews.</p>
              </div>
              <div>
                <h4 className="font-medium">Prioritize Impact</h4>
                <p className="text-muted-foreground">Focus on insights that could significantly affect user experience.</p>
              </div>
              <div>
                <h4 className="font-medium">Be Specific</h4>
                <p className="text-muted-foreground">Include concrete details and quotes when possible.</p>
              </div>
              <div>
                <h4 className="font-medium">Tag Consistently</h4>
                <p className="text-muted-foreground">Use consistent tags to enable better filtering and analysis.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}