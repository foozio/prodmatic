import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, Save, Eye } from "lucide-react";
import Link from "next/link";
import { createDocument } from "@/server/actions/documents";

interface NewDocumentPageProps {
  params: Promise<{
    orgSlug: string;
  }>;
}

const documentTypes = [
  { 
    value: "PRD", 
    label: "Product Requirements Document",
    description: "Define what needs to be built and why"
  },
  { 
    value: "RFC", 
    label: "Request for Comments",
    description: "Propose technical changes and gather feedback"
  },
  { 
    value: "SPEC", 
    label: "Technical Specification",
    description: "Detailed technical implementation details"
  },
  { 
    value: "DESIGN", 
    label: "Design Document",
    description: "User experience and interface specifications"
  },
  { 
    value: "ANALYSIS", 
    label: "Analysis Document",
    description: "Research findings and market analysis"
  },
  { 
    value: "PROPOSAL", 
    label: "Proposal",
    description: "Business proposals and recommendations"
  },
  { 
    value: "GUIDE", 
    label: "User Guide",
    description: "End-user documentation and tutorials"
  },
  { 
    value: "OTHER", 
    label: "Other Document",
    description: "Custom document type"
  },
];

export default async function NewDocumentPage({
  params,
}: NewDocumentPageProps) {
  const { orgSlug } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/auth/signin");
  }

  const organization = await db.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      products: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  // Check if user has access
  await requireRole(user.id, organization.id, ["ADMIN", "PRODUCT_MANAGER", "CONTRIBUTOR"]);

  async function handleCreateDocument(formData: FormData) {
    "use server";
    
    const productId = formData.get("productId") as string;
    // If "none" is selected, set productId to null
    const finalProductId = productId === "none" ? null : productId;
    
    // Add productId to formData if it exists
    if (finalProductId) {
      formData.set("productId", finalProductId);
    } else {
      // Remove productId from formData if none is selected
      formData.delete("productId");
    }
    
    const result = await createDocument(finalProductId || "", organization!.id, formData);
    
    if (result.success) {
      redirect(`/orgs/${orgSlug}/documents/${result.data!.id}`);
    }
    
    console.error("Failed to create document:", result.error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/orgs/${orgSlug}/documents`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Document</h1>
          <p className="text-muted-foreground">
            Create a new document for {organization.name}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
              <CardDescription>
                Fill in the document information and content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={handleCreateDocument} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Document Title *</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="e.g., User Authentication PRD"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Document Type *</Label>
                    <Select name="type" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-sm text-muted-foreground">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productId">Product (Optional)</Label>
                  <Select name="productId" defaultValue="none">
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
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    name="content"
                    placeholder="Start writing your document content here. You can use Markdown formatting."
                    rows={20}
                    className="text-sm font-mono"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports Markdown formatting. You can use headers, lists, links, and more.
                  </p>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" asChild>
                    <Link href={`/orgs/${orgSlug}/documents`}>
                      Cancel
                    </Link>
                  </Button>
                  <Button variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    Create Document
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Document Types Guide */}
          <Card>
            <CardHeader>
              <CardTitle>Document Types</CardTitle>
              <CardDescription>
                Choose the right document type for your needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {documentTypes.slice(0, 4).map((type) => (
                <div key={type.value} className="space-y-1">
                  <h4 className="font-medium text-sm">{type.label}</h4>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Markdown Guide */}
          <Card>
            <CardHeader>
              <CardTitle>Markdown Formatting</CardTitle>
              <CardDescription>
                Use these shortcuts to format your content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <code className="bg-muted px-1 rounded"># Heading 1</code>
                <p className="text-muted-foreground">Large heading</p>
              </div>
              <div>
                <code className="bg-muted px-1 rounded">## Heading 2</code>
                <p className="text-muted-foreground">Section heading</p>
              </div>
              <div>
                <code className="bg-muted px-1 rounded">**bold text**</code>
                <p className="text-muted-foreground">Bold formatting</p>
              </div>
              <div>
                <code className="bg-muted px-1 rounded">*italic text*</code>
                <p className="text-muted-foreground">Italic formatting</p>
              </div>
              <div>
                <code className="bg-muted px-1 rounded">- List item</code>
                <p className="text-muted-foreground">Bulleted list</p>
              </div>
              <div>
                <code className="bg-muted px-1 rounded">1. Numbered item</code>
                <p className="text-muted-foreground">Numbered list</p>
              </div>
            </CardContent>
          </Card>

          {/* Writing Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Writing Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium">Be Clear & Concise</h4>
                <p className="text-muted-foreground">Use simple language and short sentences.</p>
              </div>
              <div>
                <h4 className="font-medium">Structure Your Content</h4>
                <p className="text-muted-foreground">Use headings and sections to organize information.</p>
              </div>
              <div>
                <h4 className="font-medium">Include Examples</h4>
                <p className="text-muted-foreground">Add concrete examples to illustrate your points.</p>
              </div>
              <div>
                <h4 className="font-medium">Review Before Publishing</h4>
                <p className="text-muted-foreground">Always review your document before submitting for approval.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}