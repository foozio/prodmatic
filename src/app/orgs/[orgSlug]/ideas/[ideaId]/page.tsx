import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Lightbulb,
  User,
  Calendar,
  Vote,
  Star,
  Edit,
  Flag,
  Package,
  TrendingUp,
  Target,
  Zap,
  Clock,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface IdeaDetailPageProps {
  params: Promise<{
    orgSlug: string;
    ideaId: string;
  }>;
}

export default async function IdeaDetailPage({ params }: IdeaDetailPageProps) {
  const { orgSlug, ideaId } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("User not found");
  }

  // Get idea with all related data
  const idea = await db.idea.findUnique({
    where: { id: ideaId },
    include: {
      product: {
        include: {
          organization: true,
        },
      },
      creator: {
        include: {
          profile: true,
        },
      },
      convertedToEpic: true,
      insights: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!idea) {
    notFound();
  }

  // Verify organization matches
  if (idea.product.organization.slug !== orgSlug) {
    notFound();
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'UNDER_REVIEW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CONVERTED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiceScore = () => {
    if (!idea.reachScore || !idea.impactScore || !idea.confidenceScore || !idea.effortScore) {
      return null;
    }
    return (idea.reachScore * idea.impactScore * idea.confidenceScore) / idea.effortScore;
  };

  const riceScore = getRiceScore();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href={`/orgs/${orgSlug}/ideas`}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Ideas
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {(user.id === idea.creatorId) && (
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Vote className="h-4 w-4 mr-2" />
            Vote ({idea.votes})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title and Meta */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Lightbulb className="h-8 w-8 text-yellow-500" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{idea.title}</h1>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge className={getPriorityColor(idea.priority)}>
                        {idea.priority}
                      </Badge>
                      <Badge className={getStatusColor(idea.status)}>
                        {idea.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">
                        <Package className="h-3 w-3 mr-1" />
                        {idea.product.name}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 leading-relaxed">{idea.description}</p>
              </div>

              {idea.problem && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    Problem Statement
                  </h3>
                  <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                    {idea.problem}
                  </p>
                </div>
              )}

              {idea.hypothesis && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Hypothesis
                  </h3>
                  <p className="text-gray-700 leading-relaxed bg-blue-50 p-4 rounded-lg">
                    {idea.hypothesis}
                  </p>
                </div>
              )}

              {idea.tags && idea.tags.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {idea.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* RICE Scoring */}
          {riceScore && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  RICE Score: {riceScore.toFixed(1)}
                </CardTitle>
                <CardDescription>
                  Prioritization scoring based on Reach, Impact, Confidence, and Effort
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{idea.reachScore}</div>
                    <div className="text-sm text-gray-600">Reach</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{idea.impactScore}</div>
                    <div className="text-sm text-gray-600">Impact</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{idea.confidenceScore}</div>
                    <div className="text-sm text-gray-600">Confidence</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{idea.effortScore}</div>
                    <div className="text-sm text-gray-600">Effort</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Converted Epic */}
          {idea.convertedToEpic && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700 flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Converted to Epic
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  This idea has been approved and converted to an epic for development.
                </p>
                <Link
                  href={`/orgs/${orgSlug}/products/${idea.product.key}/epics/${idea.convertedToEpic.id}`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-500 mt-2"
                >
                  View Epic
                  <ArrowLeft className="h-4 w-4 ml-1 rotate-180" />
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Creator Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Created by</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={idea.creator.image || ""} />
                  <AvatarFallback>
                    {idea.creator.name?.charAt(0) || idea.creator.email.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-gray-900">
                    {idea.creator.name || idea.creator.email}
                  </div>
                  {idea.creator.profile?.title && (
                    <div className="text-sm text-gray-600">{idea.creator.profile.title}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">
                  Created {new Date(idea.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">
                  Updated {new Date(idea.updatedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Vote className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{idea.votes} votes</span>
              </div>

              {idea.source && (
                <div className="flex items-center gap-3 text-sm">
                  <Star className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Source: {idea.source}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Product</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href={`/orgs/${orgSlug}/products/${idea.product.key}`}
                className="flex items-center gap-3 hover:bg-gray-50 p-2 -m-2 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{idea.product.name}</div>
                  <div className="text-sm text-gray-600">{idea.product.key}</div>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Related Insights */}
          {idea.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-600">
                  Related Insights ({idea.insights.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {idea.insights.slice(0, 3).map((insight) => (
                    <div key={insight.id} className="border-l-4 border-blue-200 pl-3">
                      <div className="font-medium text-sm text-gray-900">{insight.title}</div>
                      <div className="text-xs text-gray-600 mt-1">{insight.description}</div>
                    </div>
                  ))}
                  {idea.insights.length > 3 && (
                    <div className="text-sm text-blue-600">
                      +{idea.insights.length - 3} more insights
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}