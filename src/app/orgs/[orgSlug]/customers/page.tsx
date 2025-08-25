import { Suspense } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Mail,
  Building,
  Calendar,
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

interface CustomersPageProps {
  params: Promise<{
    orgSlug: string;
  }>;
  searchParams: Promise<{
    tier?: string;
    status?: string;
    search?: string;
  }>;
}

async function CustomersContent({ orgSlug, searchParams }: {
  orgSlug: string;
  searchParams: { tier?: string; status?: string; search?: string; };
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("User not found");
  }

  // Get organization data with customers
  const organization = await db.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      products: {
        include: {
          customers: {
            where: {
              ...(searchParams.tier && { tier: searchParams.tier as any }),
              ...(searchParams.status && { status: searchParams.status as any }),
              ...(searchParams.search && {
                OR: [
                  { name: { contains: searchParams.search, mode: 'insensitive' } },
                  { email: { contains: searchParams.search, mode: 'insensitive' } },
                  { company: { contains: searchParams.search, mode: 'insensitive' } },
                ],
              }),
            },
            include: {
              product: true,
            },
            orderBy: [
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

  // Flatten customers from all products
  const allCustomers = organization.products.flatMap((product: any) => product.customers);

  const stats = {
    total: allCustomers.length,
    active: allCustomers.filter((customer: any) => customer.status === 'ACTIVE').length,
    inactive: allCustomers.filter((customer: any) => customer.status === 'INACTIVE').length,
    enterprise: allCustomers.filter((customer: any) => customer.tier === 'ENTERPRISE').length,
    pro: allCustomers.filter((customer: any) => customer.tier === 'PRO').length,
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'ENTERPRISE':
        return 'bg-purple-100 text-purple-800';
      case 'PRO':
        return 'bg-blue-100 text-blue-800';
      case 'STANDARD':
        return 'bg-green-100 text-green-800';
      case 'INDIVIDUAL':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-red-100 text-red-800';
      case 'CHURNED':
        return 'bg-yellow-100 text-yellow-800';
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
            <Users className="h-8 w-8 text-blue-500" />
            Customers
          </h1>
          <p className="text-gray-600 mt-1">
            Manage and analyze your customer base across all products
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button asChild>
            <Link href={`/orgs/${orgSlug}/customers/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enterprise</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.enterprise}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.pro}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search customers..."
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

      {/* Customers List */}
      <div className="space-y-4">
        {allCustomers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No customers yet</h3>
              <p className="text-gray-600 text-center mb-6">
                Start building relationships by adding your first customer.
              </p>
              <Button asChild>
                <Link href={`/orgs/${orgSlug}/customers/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Customer
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          allCustomers.map((customer: any) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {customer.name?.charAt(0) || customer.email?.charAt(0) || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link 
                          href={`/orgs/${orgSlug}/customers/${customer.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {customer.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getTierColor(customer.tier)}>
                            {customer.tier}
                          </Badge>
                          <Badge className={getStatusColor(customer.status)}>
                            {customer.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      {customer.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                      
                      {customer.company && (
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          <span>{customer.company}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(customer.createdAt).toLocaleDateString()}</span>
                      </div>

                      <Badge variant="outline">
                        {customer.product.name}
                      </Badge>
                    </div>

                    {customer.segment && (
                      <div className="text-sm text-gray-600">
                        Segment: {customer.segment}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 ml-4">
                    <Link href={`/orgs/${orgSlug}/customers/${customer.id}`}>
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

export default async function CustomersPage({ params, searchParams }: CustomersPageProps) {
  const { orgSlug } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CustomersContent orgSlug={orgSlug} searchParams={resolvedSearchParams} />
    </Suspense>
  );
}