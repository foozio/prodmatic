import { Suspense } from "react";
import Link from "next/link";
import {
  Lightbulb,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Vote,
  Clock,
  User,
  Star,
  ChevronRight,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface IdeasPageProps {
  params: Promise<{
    orgSlug: string;
  }>;
  searchParams: Promise<{
    status?: string;
    priority?: string;
    search?: string;
  }>;
}

async function IdeasContent({ orgSlug, searchParams }: {
  orgSlug: string;
  searchParams: { status?: string; priority?: string; search?: string; };
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("User not found");
  }

  // Get organization data with ideas
  const organization = await db.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      products: {
        include: {
          ideas: {
            where: {
              ...(searchParams.status && { status: searchParams.status as any }),
              ...(searchParams.priority && { priority: searchParams.priority as any }),
              ...(searchParams.search && {
                OR: [
                  { title: { contains: searchParams.search, mode: 'insensitive' } },
                  { description: { contains: searchParams.search, mode: 'insensitive' } },
                ],
              }),
            },
            include: {
              creator: {
                include: {
                  profile: true,
                },
              },
              product: true,
            },
            orderBy: [
              { votes: 'desc' },
              { createdAt: 'desc' },
            ],
          },
        },
      },
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  // Flatten ideas from all products
  const allIdeas = organization.products.flatMap((product: any) => product.ideas);

  const stats = {
    total: allIdeas.length,
    submitted: allIdeas.filter((idea: any) => idea.status === 'SUBMITTED').length,
    underReview: allIdeas.filter((idea: any) => idea.status === 'UNDER_REVIEW').length,
    approved: allIdeas.filter((idea: any) => idea.status === 'APPROVED').length,
    high: allIdeas.filter((idea: any) => idea.priority === 'HIGH').length,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'UNDER_REVIEW':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'CONVERTED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Lightbulb className="h-8 w-8 text-yellow-500" />
            Ideas
          </h1>
          <p className="text-gray-600 mt-1">
            Collect, evaluate, and prioritize product ideas from your team
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button asChild>
            <Link href={`/orgs/${orgSlug}/ideas/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Submit Idea
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ideas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.submitted}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.underReview}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.high}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search ideas..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Sort
          </Button>
        </div>
      </div>

      {/* Ideas List */}
      <div className="space-y-4">
        {allIdeas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lightbulb className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No ideas yet</h3>
              <p className="text-gray-600 text-center mb-6">
                Get started by submitting your first product idea.
              </p>
              <Button asChild>
                <Link href={`/orgs/${orgSlug}/ideas/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Submit First Idea
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          allIdeas.map((idea: any) => (
            <Card key={idea.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link 
                        href={`/orgs/${orgSlug}/ideas/${idea.id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {idea.title}
                      </Link>
                      <Badge className={getPriorityColor(idea.priority)}>
                        {idea.priority}
                      </Badge>
                      <Badge className={getStatusColor(idea.status)}>
                        {idea.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 mb-3 line-clamp-2">
                      {idea.description}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={idea.creator.image || ""} />
                          <AvatarFallback>
                            {idea.creator.name?.charAt(0) || idea.creator.email.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{idea.creator.name || idea.creator.email}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Vote className="h-4 w-4" />
                        <span>{idea.votes} votes</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(idea.createdAt).toLocaleDateString()}</span>
                      </div>

                      <Badge variant="outline">
                        {idea.product.name}
                      </Badge>
                    </div>

                    {idea.tags && idea.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {idea.tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 ml-4">
                    <Link href={`/orgs/${orgSlug}/ideas/${idea.id}`}>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default async function IdeasPage({ params, searchParams }: IdeasPageProps) {
  const { orgSlug } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <IdeasContent orgSlug={orgSlug} searchParams={resolvedSearchParams} />
    </Suspense>
  );
}