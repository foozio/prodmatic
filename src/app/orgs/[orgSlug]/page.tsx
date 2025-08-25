import {
  Package,
  Lightbulb,
  Users,
  Rocket,
  TrendingUp,
  Calendar,
  Plus,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DashboardPageProps {
  params: Promise<{
    orgSlug: string;
  }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { orgSlug } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("User not found");
  }

  // Get organization data
  const organization = await db.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      products: {
        include: {
          ideas: {
            where: { status: "SUBMITTED" },
          },
          releases: {
            where: {
              releaseDate: {
                gte: new Date(),
              },
            },
            orderBy: {
              releaseDate: "asc",
            },
            take: 3,
          },
        },
      },
      teams: true,
      memberships: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  const stats = {
    products: organization.products.length,
    ideas: organization.products.reduce(
      (sum, product) => sum + product.ideas.length,
      0
    ),
    members: organization.memberships.length,
    upcomingReleases: organization.products.reduce(
      (sum, product) => sum + product.releases.length,
      0
    ),
  };

  const recentActivities = [
    {
      id: "1",
      type: "idea",
      title: "New payment integration idea submitted",
      user: "John Doe",
      time: "2 hours ago",
    },
    {
      id: "2",
      type: "release",
      title: "Mobile app v2.1.0 released",
      user: "Jane Smith",
      time: "1 day ago",
    },
    {
      id: "3",
      type: "feature",
      title: "User dashboard feature completed",
      user: "Mike Johnson",
      time: "2 days ago",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.name || "there"}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with {organization.name}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button asChild>
            <Link href={`/orgs/${orgSlug}/ideas/new`}>
              <Plus className="h-4 w-4 mr-2" />
              New Idea
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/orgs/${orgSlug}/products/new`}>
              <Package className="h-4 w-4 mr-2" />
              New Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.products}</div>
            <p className="text-xs text-muted-foreground">
              Active product lines
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Ideas</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ideas}</div>
            <p className="text-xs text-muted-foreground">
              Pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.members}</div>
            <p className="text-xs text-muted-foreground">
              Across {organization.teams.length} teams
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Releases
            </CardTitle>
            <Rocket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingReleases}</div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Activity
              <Link
                href={`/orgs/${orgSlug}/activity`}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.title}</p>
                    <p className="text-xs text-gray-500">
                      by {activity.user} • {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to get you started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link
                href={`/orgs/${orgSlug}/ideas/new`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Lightbulb className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium">Submit an idea</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
              
              <Link
                href={`/orgs/${orgSlug}/products`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Package className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">View products</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>

              <Link
                href={`/orgs/${orgSlug}/roadmap`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Review roadmap</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>

              <Link
                href={`/orgs/${orgSlug}/analytics`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">View analytics</span>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Products Overview */}
      {organization.products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Active Products
              <Link
                href={`/orgs/${orgSlug}/products`}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                View all
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organization.products.slice(0, 3).map((product) => (
                <Link
                  key={product.id}
                  href={`/orgs/${orgSlug}/products/${product.key}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{product.name}</h3>
                    <Badge variant="outline">{product.lifecycle}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {product.description || "No description"}
                  </p>
                  <div className="flex items-center text-xs text-gray-500">
                    <span>{product.ideas.length} new ideas</span>
                    {product.releases.length > 0 && (
                      <span className="ml-4">
                        {product.releases.length} upcoming releases
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}