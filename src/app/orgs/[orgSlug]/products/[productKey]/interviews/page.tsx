import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  MessageSquare, 
  Plus, 
  Calendar, 
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Target,
  TrendingUp,
  Users
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import Link from "next/link";

interface InterviewsPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
}

const interviewStatusColors = {
  SCHEDULED: "bg-blue-500",
  COMPLETED: "bg-green-500",
  CANCELLED: "bg-red-500",
  NO_SHOW: "bg-orange-500",
};

const interviewStatusLabels = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled", 
  NO_SHOW: "No Show",
};

export default async function InterviewsPage({
  params,
}: InterviewsPageProps) {
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

  const interviews = await db.interview.findMany({
    where: {
      productId: product.id,
      deletedAt: null,
    },
    include: {
      customer: true,
      insights: true,
    },
    orderBy: {
      scheduledAt: "desc",
    },
  });

  const customers = await db.customer.findMany({
    where: {
      productId: product.id,
      deletedAt: null,
    },
    orderBy: {
      name: "asc",
    },
  });

  const currentMembership = user.memberships.find(m => m.organizationId === organization.id);
  const canManageInterviews = currentMembership?.role === "ADMIN" || currentMembership?.role === "PRODUCT_MANAGER";

  const interviewStats = {
    total: interviews.length,
    scheduled: interviews.filter(i => i.status === "SCHEDULED").length,
    completed: interviews.filter(i => i.status === "COMPLETED").length,
    totalInsights: interviews.reduce((acc, i) => acc + i.insights.length, 0),
    recentCompleted: interviews.filter(i => 
      i.status === "COMPLETED" && 
      new Date(i.scheduledAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Interviews</h1>
          <p className="text-muted-foreground">
            Conduct user research and gather insights for {product.name}
          </p>
        </div>
        {canManageInterviews && (
          <Button asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/interviews/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Interview
            </Link>
          </Button>
        )}
      </div>

      {/* Interview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interviewStats.total}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interviewStats.scheduled}</div>
            <p className="text-xs text-muted-foreground">
              Upcoming
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interviewStats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {interviewStats.recentCompleted} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insights Generated</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interviewStats.totalInsights}</div>
            <p className="text-xs text-muted-foreground">
              From all interviews
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold">Customer Database</h3>
                <p className="text-sm text-muted-foreground">{customers.length} customers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold">Personas</h3>
                <p className="text-sm text-muted-foreground">Define user types</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold">Research Insights</h3>
                <p className="text-sm text-muted-foreground">View all findings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interviews List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Interviews</CardTitle>
          <CardDescription>
            Customer interviews and research sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {interviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No interviews yet</h3>
              <p className="text-muted-foreground mb-4">
                Start conducting customer research to gather valuable insights
              </p>
              {canManageInterviews && (
                <Button asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/interviews/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule First Interview
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {interviews.map((interview) => (
                <div
                  key={interview.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {interview.customer.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h4 className="font-medium">{interview.title}</h4>
                        <Badge 
                          variant="outline"
                          className={`${interviewStatusColors[interview.status]} text-white border-0`}
                        >
                          {interviewStatusLabels[interview.status]}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{interview.customer.name}</span>
                          {interview.customer.company && (
                            <span>at {interview.customer.company}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(interview.scheduledAt, "MMM d, yyyy")}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{interview.duration} minutes</span>
                        </div>
                        {interview.insights.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Target className="h-3 w-3" />
                            <span>{interview.insights.length} insights</span>
                          </div>
                        )}
                      </div>

                      {interview.objective && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {interview.objective}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {interview.status === "SCHEDULED" && (
                      <Badge variant="outline" className="text-blue-600">
                        {formatDistanceToNow(interview.scheduledAt)} away
                      </Badge>
                    )}
                    
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/interviews/${interview.id}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Research Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Interview Best Practices</CardTitle>
          <CardDescription>
            Guidelines for conducting effective customer interviews
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-3">Before the Interview</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Define clear objectives and research questions</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Research the participant's background</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Prepare open-ended questions</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Set up recording equipment (with consent)</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">During the Interview</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span>Listen more than you speak</span>
                </li>
                <li className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span>Ask "why" and "how" questions</span>
                </li>
                <li className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span>Avoid leading questions</span>
                </li>
                <li className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span>Take detailed notes</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}