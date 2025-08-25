import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Lightbulb, 
  Plus, 
  TrendingUp, 
  Vote, 
  Target,
  Clock,
  User,
  ArrowUp,
  ArrowDown,
  Filter,
  MoreHorizontal
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface IdeasPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
}

const priorityColors = {
  HIGH: "bg-red-500",
  MEDIUM: "bg-yellow-500", 
  LOW: "bg-green-500",
};

const statusColors = {
  SUBMITTED: "bg-gray-500",
  REVIEWING: "bg-blue-500",
  APPROVED: "bg-green-500",
  REJECTED: "bg-red-500",
  CONVERTED: "bg-purple-500",
};

const statusLabels = {
  SUBMITTED: "Submitted",
  REVIEWING: "Reviewing",
  APPROVED: "Approved", 
  REJECTED: "Rejected",
  CONVERTED: "Converted",
};

// Calculate RICE score
const calculateRiceScore = (reach: number, impact: number, confidence: number, effort: number): number => {
  if (effort === 0) return 0;
  return Math.round((reach * impact * confidence) / effort * 10) / 10;
};

// Calculate WSJF score  
const calculateWSJFScore = (impact: number, timeCriticality: number, effort: number): number => {
  if (effort === 0) return 0;
  return Math.round((impact + timeCriticality) / effort * 10) / 10;
};

export default async function IdeasPage({
  params,
}: IdeasPageProps) {
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

  const ideas = await db.idea.findMany({
    where: {
      productId: product.id,
      deletedAt: null,
    },
    include: {
      creator: {
        include: {
          profile: true,
        },
      },
      convertedToEpic: true,
    },
    orderBy: [
      { priority: "desc" },
      { createdAt: "desc" },
    ],
  });

  const currentMembership = user.memberships.find(m => m.organizationId === organization.id);
  const canManageIdeas = currentMembership?.role === "ADMIN" || currentMembership?.role === "PRODUCT_MANAGER";

  // Calculate scores for each idea
  const ideasWithScores = ideas.map(idea => {
    const riceScore = idea.reachScore && idea.impactScore && idea.confidenceScore && idea.effortScore
      ? calculateRiceScore(idea.reachScore, idea.impactScore, idea.confidenceScore, idea.effortScore)
      : null;

    const wsjfScore = idea.impactScore && idea.effortScore
      ? calculateWSJFScore(idea.impactScore, 3, idea.effortScore) // Using default time criticality of 3
      : null;

    return {
      ...idea,
      riceScore,
      wsjfScore,
    };
  });

  // Sort by RICE score if available
  ideasWithScores.sort((a, b) => {
    if (a.riceScore && b.riceScore) {
      return b.riceScore - a.riceScore;
    }
    if (a.riceScore) return -1;
    if (b.riceScore) return 1;
    return 0;
  });

  const ideaStats = {
    total: ideas.length,
    submitted: ideas.filter(i => i.status === "SUBMITTED").length,
    reviewing: ideas.filter(i => i.status === "REVIEWING").length,
    approved: ideas.filter(i => i.status === "APPROVED").length,
    converted: ideas.filter(i => i.status === "CONVERTED").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ideas</h1>
          <p className="text-muted-foreground">
            Collect, prioritize, and convert ideas for {product.name}
          </p>
        </div>
        <Button asChild>
          <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/ideas/new`}>
            <Plus className="h-4 w-4 mr-2" />
            Submit Idea
          </Link>
        </Button>
      </div>

      {/* Ideas Overview */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ideas</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ideaStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ideaStats.submitted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ideaStats.reviewing}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ideaStats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ideaStats.converted}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters & Prioritization</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Select defaultValue="all">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                <SelectItem value="REVIEWING">Reviewing</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="CONVERTED">Converted</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="HIGH">High Priority</SelectItem>
                <SelectItem value="MEDIUM">Medium Priority</SelectItem>
                <SelectItem value="LOW">Low Priority</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="rice">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rice">Sort by RICE</SelectItem>
                <SelectItem value="wsjf">Sort by WSJF</SelectItem>
                <SelectItem value="votes">Sort by Votes</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
              </SelectContent>
            </Select>

            {canManageIdeas && (
              <Button variant="outline">
                Bulk Actions
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ideas List */}
      <div className="space-y-4">
        {ideasWithScores.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No ideas yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Submit your first idea to start building your product backlog
              </p>
              <Button asChild>
                <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/ideas/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit First Idea
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          ideasWithScores.map((idea, index) => (
            <Card key={idea.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="text-sm text-muted-foreground font-mono min-w-[2rem]">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold">
                            <Link 
                              href={`/orgs/${params.orgSlug}/products/${params.productKey}/ideas/${idea.id}`}
                              className="hover:underline"
                            >
                              {idea.title}
                            </Link>
                          </h3>
                          <Badge 
                            variant="outline" 
                            className={`${statusColors[idea.status]} text-white border-0`}
                          >
                            {statusLabels[idea.status]}
                          </Badge>
                          <Badge 
                            variant="outline"
                            className={`${priorityColors[idea.priority]} text-white border-0`}
                          >
                            {idea.priority}
                          </Badge>
                        </div>
                        
                        <p className="text-muted-foreground line-clamp-2 mb-2">
                          {idea.description}
                        </p>

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{idea.creator.name || idea.creator.email}</span>
                          </div>
                          <span>•</span>
                          <span>{formatDistanceToNow(idea.createdAt)} ago</span>
                          {idea.votes > 0 && (
                            <>
                              <span>•</span>
                              <div className="flex items-center space-x-1">
                                <Vote className="h-3 w-3" />
                                <span>{idea.votes} votes</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {canManageIdeas && (
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Scoring Section */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {idea.riceScore ? idea.riceScore : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">RICE Score</div>
                      {idea.riceScore && (
                        <Progress value={(idea.riceScore / 10) * 100} className="h-1 mt-1" />
                      )}
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {idea.wsjfScore ? idea.wsjfScore : "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">WSJF Score</div>
                      {idea.wsjfScore && (
                        <Progress value={(idea.wsjfScore / 10) * 100} className="h-1 mt-1" />
                      )}
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {idea.effortScore || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">Effort (1-5)</div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-bold">
                        {idea.impactScore || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">Impact (1-5)</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <ArrowUp className="h-4 w-4 mr-1" />
                        Upvote
                      </Button>
                      <Button variant="ghost" size="sm">
                        <ArrowDown className="h-4 w-4 mr-1" />
                        Downvote
                      </Button>
                    </div>

                    <div className="flex items-center space-x-2">
                      {canManageIdeas && idea.status === "APPROVED" && !idea.convertedToEpic && (
                        <Button size="sm" variant="outline">
                          Convert to Epic
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/ideas/${idea.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Prioritization Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Prioritization Framework</CardTitle>
          <CardDescription>
            Understanding RICE and WSJF scoring methodologies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-2">RICE Framework</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Reach:</strong> How many users will be affected?</div>
                <div><strong>Impact:</strong> How much will this impact each user?</div>
                <div><strong>Confidence:</strong> How confident are we in our estimates?</div>
                <div><strong>Effort:</strong> How much work will this take?</div>
                <div className="text-muted-foreground">
                  Formula: (Reach × Impact × Confidence) ÷ Effort
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">WSJF Framework</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Business Value:</strong> Economic benefit to the business</div>
                <div><strong>Time Criticality:</strong> How time-sensitive is this?</div>
                <div><strong>Job Size:</strong> Relative effort required</div>
                <div className="text-muted-foreground">
                  Formula: (Business Value + Time Criticality) ÷ Job Size
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}