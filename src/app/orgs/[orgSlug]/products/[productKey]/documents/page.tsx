import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  FileText, 
  Plus, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Filter,
  Search,
  MoreHorizontal,
  GitBranch,
  Eye,
  Edit
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface DocumentsPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
}

const documentTypeLabels = {
  PRD: "Product Requirements Document",
  RFC: "Request for Comments", 
  SPEC: "Technical Specification",
  DESIGN: "Design Document",
  ANALYSIS: "Analysis Document",
  PROPOSAL: "Proposal",
  GUIDE: "User Guide",
  OTHER: "Other Document",
};

const statusColors = {
  DRAFT: "bg-gray-500",
  REVIEW: "bg-yellow-500",
  APPROVED: "bg-green-500",
  REJECTED: "bg-red-500",
  ARCHIVED: "bg-gray-400",
};

const statusIcons = {
  DRAFT: Clock,
  REVIEW: AlertCircle,
  APPROVED: CheckCircle,
  REJECTED: XCircle,
  ARCHIVED: FileText,
};

export default async function DocumentsPage({
  params,
}: DocumentsPageProps) {
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

  const documents = await db.document.findMany({
    where: {
      productId: product.id,
      deletedAt: null,
    },
    include: {
      author: {
        include: {
          profile: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const currentMembership = user.memberships.find(m => m.organizationId === organization.id);
  const canCreateDocuments = currentMembership?.role === "ADMIN" || 
                             currentMembership?.role === "PRODUCT_MANAGER" ||
                             currentMembership?.role === "CONTRIBUTOR";

  const documentStats = {
    total: documents.length,
    byStatus: documents.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byType: documents.reduce((acc, doc) => {
      acc[doc.type] = (acc[doc.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    recentlyUpdated: documents.filter(doc => 
      new Date(doc.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Product requirements, specifications, and design documents for {product.name}
          </p>
        </div>
        {canCreateDocuments && (
          <div className="flex space-x-2">
            <Button variant="outline" asChild>
              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/documents/templates`}>
                <FileText className="h-4 w-4 mr-2" />
                Templates
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/documents/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New Document
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Document Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentStats.total}</div>
            <p className="text-xs text-muted-foreground">
              All document types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Review</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentStats.byStatus.REVIEW || 0}</div>
            <p className="text-xs text-muted-foreground">
              Pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentStats.byStatus.APPROVED || 0}</div>
            <p className="text-xs text-muted-foreground">
              Ready for implementation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Updates</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentStats.recentlyUpdated}</div>
            <p className="text-xs text-muted-foreground">
              This week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Documents</CardTitle>
              <CardDescription>
                Product documentation and specifications
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
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first product document to define requirements and specifications
              </p>
              {canCreateDocuments && (
                <div className="flex justify-center space-x-2">
                  <Button variant="outline" asChild>
                    <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/documents/templates`}>
                      Browse Templates
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/documents/new`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Document
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((document) => {
                const StatusIcon = statusIcons[document.status];
                return (
                  <div 
                    key={document.id} 
                    className="border rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <StatusIcon className={`h-4 w-4 text-white`} />
                          <div>
                            <h3 className="font-medium">
                              <Link
                                href={`/orgs/${params.orgSlug}/products/${params.productKey}/documents/${document.id}`}
                                className="hover:underline"
                              >
                                {document.title}
                              </Link>
                            </h3>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Badge variant="outline">
                                {documentTypeLabels[document.type]}
                              </Badge>
                              <Badge 
                                variant="secondary" 
                                className={`text-white ${statusColors[document.status]}`}
                              >
                                {document.status}
                              </Badge>
                              <span>v{document.version}</span>
                              {document.template && (
                                <Badge variant="outline" className="text-xs">
                                  Template: {document.template}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {document.author.name?.charAt(0) || document.author.email.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span>
                                {document.author.profile?.displayName || document.author.name || document.author.email}
                              </span>
                            </div>
                            <span>
                              Updated {formatDistanceToNow(new Date(document.updatedAt))} ago
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/documents/${document.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            {(canCreateDocuments || document.authorId === user.id) && (
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/documents/${document.id}/edit`}>
                                  <Edit className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {canCreateDocuments && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Create PRD</h3>
                  <p className="text-sm text-muted-foreground">Product Requirements Document</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <GitBranch className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Create RFC</h3>
                  <p className="text-sm text-muted-foreground">Request for Comments</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Design Spec</h3>
                  <p className="text-sm text-muted-foreground">Technical Specification</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}