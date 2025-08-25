import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  ArrowLeft, 
  FileText,
  FilePenLine,
  FileCheck,
  FileSignature,
  FileArchive,
  FileQuestion
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DocumentPreviewPageProps {
  params: Promise<{
    orgSlug: string;
    documentId: string;
  }>;
}

async function DocumentPreviewContent({ orgSlug, documentId }: { orgSlug: string; documentId: string }) {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("User not found");
  }

  // Get organization and document data
  const organization = await db.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      memberships: {
        where: { userId: user.id },
        include: { user: true }
      }
    }
  });

  if (!organization) {
    notFound();
  }

  const document = await db.document.findUnique({
    where: { id: documentId },
    include: {
      author: {
        include: {
          profile: true,
        },
      },
      product: true,
    },
  });

  if (!document) {
    notFound();
  }

  // Check if document belongs to organization
  if (document.productId) {
    const product = await db.product.findUnique({
      where: { id: document.productId },
      select: { organizationId: true }
    });
    
    if (!product || product.organizationId !== organization.id) {
      notFound();
    }
  }

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
      case 'APPROVED':
        return 'bg-indigo-100 text-indigo-800';
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
      case 'SPEC':
        return FileSignature;
      case 'LAUNCH_PLAN':
        return FileText;
      case 'POST_MORTEM':
        return FileArchive;
      default:
        return FileQuestion;
    }
  };

  const TypeIcon = getTypeIcon(document.type);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" asChild className="mb-2">
            <Link href={`/orgs/${orgSlug}/documents/${documentId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Document
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <TypeIcon className="h-8 w-8 text-gray-600" />
            <h1 className="text-3xl font-bold text-gray-900">{document.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge className={getTypeColor(document.type)}>
              {document.type}
            </Badge>
            <Badge className={getStatusColor(document.status)}>
              {document.status}
            </Badge>
            {document.version && (
              <Badge variant="outline">
                v{document.version}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Document Content Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Document Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {document.content ? (
            <div className="prose max-w-none border rounded-lg p-6 min-h-[500px]">
              <div dangerouslySetInnerHTML={{ __html: document.content }} />
            </div>
          ) : (
            <p className="text-gray-500 italic text-center py-12">No content available for this document.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function DocumentPreviewPage({ params }: DocumentPreviewPageProps) {
  const { orgSlug, documentId } = await params;

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <DocumentPreviewContent orgSlug={orgSlug} documentId={documentId} />
    </Suspense>
  );
}