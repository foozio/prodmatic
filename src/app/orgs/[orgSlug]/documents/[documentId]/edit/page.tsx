import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  ArrowLeft, 
  FileText,
  Save,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DocumentEditPageProps {
  params: Promise<{
    orgSlug: string;
    documentId: string;
  }>;
}

async function DocumentEditContent({ orgSlug, documentId }: { orgSlug: string; documentId: string }) {
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
      },
      products: true
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

  // Document type options
  const documentTypes = [
    { value: 'PRD', label: 'Product Requirements Document' },
    { value: 'RFC', label: 'Request for Comments' },
    { value: 'SPEC', label: 'Specification' },
    { value: 'LAUNCH_PLAN', label: 'Launch Plan' },
    { value: 'POST_MORTEM', label: 'Post Mortem' },
    { value: 'TEMPLATE', label: 'Template' },
    { value: 'GUIDE', label: 'Guide' }
  ];

  // Document status options
  const documentStatuses = [
    { value: 'DRAFT', label: 'Draft' },
    { value: 'REVIEW', label: 'In Review' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'ARCHIVED', label: 'Archived' }
  ];

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
            <h1 className="text-3xl font-bold text-gray-900">Edit Document</h1>
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
        <Button form="document-form">
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      {/* Document Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Document Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form id="document-form" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input 
                  id="title" 
                  name="title" 
                  defaultValue={document.title}
                  placeholder="Enter document title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="product">Product</Label>
                <Select name="productId" defaultValue={document.productId || "none"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {organization.products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Document Type</Label>
                <Select name="type" defaultValue={document.type}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={document.status}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea 
                id="content" 
                name="content" 
                defaultValue={document.content || ""}
                placeholder="Enter document content"
                rows={15}
              />
            </div>
            
            <input type="hidden" name="documentId" value={document.id} />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function DocumentEditPage({ params }: DocumentEditPageProps) {
  const { orgSlug, documentId } = await params;

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <DocumentEditContent orgSlug={orgSlug} documentId={documentId} />
    </Suspense>
  );
}