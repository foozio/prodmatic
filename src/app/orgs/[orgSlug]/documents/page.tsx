import { Suspense } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  User,
  Eye,
  ChevronRight,
  File,
  FileCheck,
  FilePenLine,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DocumentsPageProps {
  params: Promise<{
    orgSlug: string;
  }>;
  searchParams: Promise<{
    type?: string;
    status?: string;
    search?: string;
  }>;
}

async function DocumentsContent({ orgSlug, searchParams }: {
  orgSlug: string;
  searchParams: { type?: string; status?: string; search?: string; };
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("User not found");
  }

  // Get organization data with documents
  const organization = await db.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      products: {
        include: {
          documents: {
            where: {
              ...(searchParams.type && { type: searchParams.type as any }),
              ...(searchParams.status && { status: searchParams.status as any }),
              ...(searchParams.search && {
                OR: [
                  { title: { contains: searchParams.search, mode: 'insensitive' } },
                  { content: { contains: searchParams.search, mode: 'insensitive' } },
                ],
              }),
            },
            include: {
              author: {
                include: {
                  profile: true,
                },
              },
              product: true,
            },
            orderBy: [
              { updatedAt: 'desc' },
            ],
          },
        },
      },
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  // Flatten documents from all products
  const allDocuments = organization.products.flatMap((product: any) => product.documents);

  const stats = {
    total: allDocuments.length,
    prd: allDocuments.filter((doc: any) => doc.type === 'PRD').length,
    rfc: allDocuments.filter((doc: any) => doc.type === 'RFC').length,
    draft: allDocuments.filter((doc: any) => doc.status === 'DRAFT').length,
    published: allDocuments.filter((doc: any) => doc.status === 'PUBLISHED').length,
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PRD':
        return 'bg-blue-100 text-blue-800';
      case 'RFC':
        return 'bg-green-100 text-green-800';
      case 'SPEC':
        return 'bg-purple-100 text-purple-800';
      case 'LAUNCH_PLAN':
        return 'bg-orange-100 text-orange-800';
      case 'POST_MORTEM':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800';
      case 'REVIEW':
        return 'bg-blue-100 text-blue-800';
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PRD':
        return FilePenLine;
      case 'RFC':
        return FileCheck;
      default:
        return File;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="h-8 w-8 text-green-500" />
            Documents
          </h1>
          <p className="text-gray-600 mt-1">
            Manage PRDs, RFCs, specifications, and other project documentation
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button asChild>
            <Link href={`/orgs/${orgSlug}/documents/new`}>
              <Plus className="h-4 w-4 mr-2" />
              New Document
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PRDs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.prd}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RFCs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.rfc}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search documents..."
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

      {/* Documents List */}
      <div className="space-y-4">
        {allDocuments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-600 text-center mb-6">
                Start documenting your product with PRDs, RFCs, and specifications.
              </p>
              <Button asChild>
                <Link href={`/orgs/${orgSlug}/documents/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Document
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          allDocuments.map((document: any) => {
            const TypeIcon = getTypeIcon(document.type);
            return (
              <Card key={document.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <TypeIcon className="h-5 w-5 text-gray-600" />
                        <Link 
                          href={`/orgs/${orgSlug}/documents/${document.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {document.title}
                        </Link>
                        <Badge className={getTypeColor(document.type)}>
                          {document.type}
                        </Badge>
                        <Badge className={getStatusColor(document.status)}>
                          {document.status}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {document.summary || "No summary available"}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={document.author.image || ""} />
                            <AvatarFallback>
                              {document.author.name?.charAt(0) || document.author.email.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{document.author.name || document.author.email}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(document.updatedAt).toLocaleDateString()}</span>
                        </div>

                        <Badge variant="outline">
                          {document.product.name}
                        </Badge>

                        {document.version && (
                          <span className="text-xs">v{document.version}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 ml-4">
                      <Link href={`/orgs/${orgSlug}/documents/${document.id}`}>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

export default async function DocumentsPage({ params, searchParams }: DocumentsPageProps) {
  const { orgSlug } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <DocumentsContent orgSlug={orgSlug} searchParams={resolvedSearchParams} />
    </Suspense>
  );
}