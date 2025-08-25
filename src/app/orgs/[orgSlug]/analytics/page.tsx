import { Suspense } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  Target,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  ThumbsUp,
  MessageSquare,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AnalyticsPageProps {
  params: Promise<{
    orgSlug: string;
  }>;
  searchParams: Promise<{
    timeframe?: string;
    product?: string;
  }>;
}

async function AnalyticsContent({ orgSlug, searchParams }: {
  orgSlug: string;
  searchParams: { timeframe?: string; product?: string; };
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("User not found");
  }

  // Get organization data with analytics-relevant information
  const organization = await db.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      products: {
        where: searchParams.product ? { id: searchParams.product } : {},
        include: {
          ideas: {
            include: {
              creator: true,
            },
          },
          customers: true,
          releases: true,
          experiments: true,
          insights: true,
          interviews: true,
          feedback: true,
        },
      },
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  // Flatten analytics data from all products
  const allIdeas = organization?.products?.flatMap((product: any) => product.ideas) || [];
  const allCustomers = organization?.products?.flatMap((product: any) => product.customers) || [];
  const allReleases = organization?.products?.flatMap((product: any) => product.releases) || [];
  const allExperiments = organization?.products?.flatMap((product: any) => product.experiments) || [];
  const allInsights = organization?.products?.flatMap((product: any) => product.insights) || [];
  const allInterviews = organization?.products?.flatMap((product: any) => product.interviews) || [];
  const allFeedback = organization?.products?.flatMap((product: any) => product.feedback) || [];

  // Calculate time-based metrics (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const recentIdeas = allIdeas.filter((idea: any) => new Date(idea.createdAt) >= thirtyDaysAgo);
  const recentCustomers = allCustomers.filter((customer: any) => new Date(customer.createdAt) >= thirtyDaysAgo);
  const recentInsights = allInsights.filter((insight: any) => new Date(insight.createdAt) >= thirtyDaysAgo);

  const metrics = {
    totalIdeas: allIdeas.length,
    newIdeas: recentIdeas.length,
    totalCustomers: allCustomers.length,
    newCustomers: recentCustomers.length,
    totalReleases: allReleases.length,
    activeExperiments: allExperiments.filter((exp: any) => exp.status === 'ACTIVE').length,
    totalInsights: allInsights.length,
    newInsights: recentInsights.length,
    totalInterviews: allInterviews.length,
    totalFeedback: allFeedback.length,
  };

  // Product performance data
  const productMetrics = organization?.products?.map((product: any) => ({
    name: product.name,
    ideas: product.ideas?.length || 0,
    customers: product.customers?.length || 0,
    releases: product.releases?.length || 0,
    experiments: product.experiments?.length || 0,
    insights: product.insights?.length || 0,
  })) || [];

  // Recent activity
  const recentActivity = [
    ...recentIdeas.map((idea: any) => ({
      type: 'idea',
      title: idea.title,
      user: idea.creator?.name || idea.creator?.email,
      date: idea.createdAt,
      product: organization.products.find((p: any) => p.id === idea.productId)?.name,
    })),
    ...recentInsights.map((insight: any) => ({
      type: 'insight',
      title: insight.title,
      date: insight.createdAt,
      product: organization.products.find((p: any) => p.id === insight.productId)?.name,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-500" />
            Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Insights and metrics across your product organization
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ideas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalIdeas}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +{metrics.newIdeas}
              </span>
              new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +{metrics.newCustomers}
              </span>
              new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Experiments</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeExperiments}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalReleases} total releases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insights</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalInsights}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +{metrics.newInsights}
              </span>
              new this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Product Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Product Performance
          </CardTitle>
          <CardDescription>
            Compare metrics across your product portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          {productMetrics.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No products available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {productMetrics.map((product: any) => (
                <div key={product.name} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="font-medium text-gray-900">{product.name}</div>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>{product.ideas} ideas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{product.customers} customers</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-4 w-4" />
                      <span>{product.experiments} experiments</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span>{product.insights} insights</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Research & Feedback Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">User Interviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalInterviews}</div>
            <p className="text-xs text-gray-500 mt-1">
              Conducted across all products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Customer Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalFeedback}</div>
            <p className="text-xs text-gray-500 mt-1">
              Total feedback items collected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Research Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalInsights}</div>
            <p className="text-xs text-gray-500 mt-1">
              Generated from research activities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest ideas and insights across your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity: any, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex-shrink-0 mt-1">
                    {activity.type === 'idea' ? (
                      <TrendingUp className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-purple-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {activity.product}
                      </Badge>
                      {activity.user && (
                        <span className="text-xs text-gray-500">
                          by {activity.user}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(activity.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Detailed Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-600 mb-3">
              Generate comprehensive analytics reports
            </p>
            <Button size="sm" className="w-full" asChild>
              <Link href={`/orgs/${orgSlug}/analytics/reports`}>
                View Reports
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <Target className="h-4 w-4 mr-2" />
              Goals & KPIs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-600 mb-3">
              Track organizational goals and key performance indicators
            </p>
            <Button size="sm" className="w-full" variant="outline" asChild>
              <Link href={`/orgs/${orgSlug}/analytics/kpis`}>
                Manage KPIs
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-sm">
              <Activity className="h-4 w-4 mr-2" />
              Experiments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-600 mb-3">
              Monitor A/B tests and feature experiments
            </p>
            <Button size="sm" className="w-full" variant="outline" asChild>
              <Link href={`/orgs/${orgSlug}/analytics/experiments`}>
                View Experiments
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default async function AnalyticsPage({ params, searchParams }: AnalyticsPageProps) {
  const { orgSlug } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <AnalyticsContent orgSlug={orgSlug} searchParams={resolvedSearchParams} />
    </Suspense>
  );
}