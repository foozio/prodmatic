import { Suspense } from "react";
import Link from "next/link";
import {
  Calendar,
  Plus,
  Filter,
  Settings,
  Target,
  Clock,
  Users,
  Flag,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RoadmapPageProps {
  params: Promise<{
    orgSlug: string;
  }>;
  searchParams: Promise<{
    product?: string;
    timeframe?: string;
  }>;
}

async function RoadmapContent({ orgSlug, searchParams }: {
  orgSlug: string;
  searchParams: { product?: string; timeframe?: string; };
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("User not found");
  }

  // Get organization data with roadmap items
  const organization = await db.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      products: {
        where: searchParams.product ? { id: searchParams.product } : {},
        include: {
          roadmapItems: {
            include: {
              epic: {
                include: {
                  features: true,
                },
              },
              product: true,
            },
            orderBy: [
              { startDate: 'asc' },
            ],
          },
          epics: {
            where: {
              status: {
                in: ['NEW', 'IN_PROGRESS'],
              },
            },
            include: {
              features: true,
            },
          },
        },
      },
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  // Flatten roadmap items from all products
  const allRoadmapItems = organization.products.flatMap((product: any) => product.roadmapItems);
  const allEpics = organization.products.flatMap((product: any) => product.epics);

  // Group roadmap items by timeframe
  const now = new Date();
  const nextQuarter = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const roadmapByTimeframe = {
    'Current': allRoadmapItems.filter((item: any) => 
      item.startDate && new Date(item.startDate) <= now && 
      item.endDate && new Date(item.endDate) >= now
    ),
    'Next 3 Months': allRoadmapItems.filter((item: any) => 
      item.startDate && new Date(item.startDate) > now && 
      new Date(item.startDate) <= nextQuarter
    ),
    'Next 6 Months': allRoadmapItems.filter((item: any) => 
      item.startDate && new Date(item.startDate) > nextQuarter && 
      new Date(item.startDate) <= new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
    ),
    'Future': allRoadmapItems.filter((item: any) => 
      item.startDate && new Date(item.startDate) > new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000)
    ),
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
      case 'PLANNED':
        return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
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
            <Calendar className="h-8 w-8 text-purple-500" />
            Product Roadmap
          </h1>
          <p className="text-gray-600 mt-1">
            Plan and track your product development timeline
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            View Settings
          </Button>
          <Button asChild>
            <Link href={`/orgs/${orgSlug}/roadmap/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Link>
          </Button>
        </div>
      </div>

      {/* Roadmap Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allRoadmapItems.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {allRoadmapItems.filter((item: any) => item.status === 'IN_PROGRESS').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {allRoadmapItems.filter((item: any) => item.status === 'COMPLETED').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Epics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{allEpics.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline View */}
      <div className="space-y-8">
        {Object.entries(roadmapByTimeframe).map(([timeframe, items]) => (
          <div key={timeframe} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-600" />
                {timeframe}
                <Badge variant="secondary">{items.length}</Badge>
              </h2>
              {items.length > 0 && (
                <Button variant="outline" size="sm">
                  View All
                </Button>
              )}
            </div>

            {items.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Calendar className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm">No items planned for {timeframe.toLowerCase()}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item: any) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <Link 
                            href={`/orgs/${orgSlug}/roadmap/${item.id}`}
                            className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
                          >
                            {item.title}
                          </Link>
                          <div className="flex items-center gap-2">
                            <Badge className={getPriorityColor(item.priority)}>
                              {item.priority}
                            </Badge>
                            <Badge className={getStatusColor(item.status)}>
                              {item.status}
                            </Badge>
                          </div>
                        </div>
                        <Link href={`/orgs/${orgSlug}/roadmap/${item.id}`}>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </Link>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {item.description || "No description provided"}
                      </p>

                      {/* Epic Association */}
                      {item.epic && (
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-500" />
                          <Link 
                            href={`/orgs/${orgSlug}/epics/${item.epic.id}`}
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            {item.epic.title}
                          </Link>
                        </div>
                      )}

                      {/* Timeline */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Timeline</span>
                          <Badge variant="outline" className="text-xs">
                            {item.product.name}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {item.startDate && new Date(item.startDate).toLocaleDateString()} - {item.endDate && new Date(item.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Features Count */}
                      {item.epic?.features && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Flag className="h-3 w-3" />
                          <span>{item.epic.features.length} features</span>
                        </div>
                      )}

                      {/* Progress indicator */}
                      {item.progress !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <span>Progress</span>
                            <span>{item.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${item.progress || 0}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Unplanned Epics */}
      {allEpics.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gray-600" />
            Backlog Epics
            <Badge variant="secondary">{allEpics.length}</Badge>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allEpics.slice(0, 6).map((epic: any) => (
              <Card key={epic.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <Link 
                      href={`/orgs/${orgSlug}/epics/${epic.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
                    >
                      {epic.title}
                    </Link>
                    
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {epic.description || "No description"}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {epic.features?.length || 0} features
                      </Badge>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/orgs/${orgSlug}/roadmap/new?epic=${epic.id}`}>
                          Add to Roadmap
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default async function RoadmapPage({ params, searchParams }: RoadmapPageProps) {
  const { orgSlug } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <RoadmapContent orgSlug={orgSlug} searchParams={resolvedSearchParams} />
    </Suspense>
  );
}