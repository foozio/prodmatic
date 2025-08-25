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
  params: {
    orgSlug: string;
    productKey: string;
  };
}

const documentTypes = [
  { 
    value: "PRD", 
    label: "Product Requirements Document",
    description: "Define what needs to be built and why",
    template: "prd-template"
  },
  { 
    value: "RFC", 
    label: "Request for Comments",
    description: "Propose technical changes and gather feedback",
    template: "rfc-template"
  },
  { 
    value: "SPEC", 
    label: "Technical Specification",
    description: "Detailed technical implementation details",
    template: "spec-template"
  },
  { 
    value: "DESIGN", 
    label: "Design Document",
    description: "User experience and interface specifications",
    template: "design-template"
  },
  { 
    value: "ANALYSIS", 
    label: "Analysis Document",
    description: "Research findings and market analysis",
    template: "analysis-template"
  },
  { 
    value: "PROPOSAL", 
    label: "Proposal",
    description: "Business proposals and recommendations",
    template: "proposal-template"
  },
  { 
    value: "GUIDE", 
    label: "User Guide",
    description: "End-user documentation and tutorials",
    template: "guide-template"
  },
  { 
    value: "OTHER", 
    label: "Other Document",
    description: "Custom document type",
    template: null
  },
];

const templates = {
  "prd-template": `# Product Requirements Document

## 1. Overview
### Problem Statement
[Describe the problem this product solves]

### Solution Overview
[High-level description of the proposed solution]

### Success Metrics
[How will you measure success?]

## 2. Requirements
### Functional Requirements
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

### Non-Functional Requirements
- Performance: [Performance requirements]
- Security: [Security requirements]
- Usability: [Usability requirements]

## 3. User Stories
### Epic 1: [Epic Name]
- As a [user type], I want [functionality] so that [benefit]
- As a [user type], I want [functionality] so that [benefit]

## 4. Acceptance Criteria
[Define what "done" looks like]

## 5. Dependencies
[List any dependencies or blockers]

## 6. Timeline
[Proposed timeline and milestones]

## 7. Risk Assessment
[Identify potential risks and mitigation strategies]
`,
  "rfc-template": `# RFC: [Title]

## Summary
[Brief summary of the proposed change]

## Motivation
[Why is this change needed?]

## Detailed Design
[Detailed explanation of the proposed solution]

### API Changes
[Any API changes required]

### Implementation Details
[How will this be implemented?]

## Alternatives Considered
[What other approaches were considered?]

## Backwards Compatibility
[Impact on existing functionality]

## Testing Plan
[How will this be tested?]

## Migration Strategy
[How will existing users/systems migrate?]

## Questions and Discussion
[Open questions for discussion]
`,
  "spec-template": `# Technical Specification: [Title]

## Architecture Overview
[High-level architecture description]

## System Components
### Component 1
[Description, responsibilities, interfaces]

### Component 2
[Description, responsibilities, interfaces]

## Data Models
[Database schemas, data structures]

## API Specification
[Endpoint definitions, request/response formats]

## Security Considerations
[Authentication, authorization, data protection]

## Performance Requirements
[Latency, throughput, scalability requirements]

## Monitoring and Observability
[Logging, metrics, alerting]

## Deployment Strategy
[How will this be deployed and scaled?]
`,
  "design-template": `# Design Document: [Title]

## Design Goals
[What are we trying to achieve with this design?]

## User Research
[Key insights from user research]

## Design Principles
[Guiding principles for this design]

## User Flows
[Step-by-step user journeys]

## Wireframes & Mockups
[Link to design files or embed images]

## Interaction Design
[How users interact with the interface]

## Visual Design
[Colors, typography, spacing guidelines]

## Accessibility
[How will this be accessible to all users?]

## Responsive Design
[How will this work across devices?]

## Success Metrics
[How will you measure design success?]
`,
  "analysis-template": `# Analysis Document: [Title]

## Executive Summary
[Key findings and recommendations]

## Research Methodology
[How was this analysis conducted?]

## Key Findings
### Finding 1
[Description and supporting data]

### Finding 2
[Description and supporting data]

## Market Analysis
[Competitive landscape, market size, trends]

## User Analysis
[User segments, behaviors, needs]

## Technical Analysis
[Technical feasibility, constraints, opportunities]

## Recommendations
[Actionable recommendations based on findings]

## Next Steps
[What should happen next?]

## Appendix
[Supporting data, charts, references]
`,
  "proposal-template": `# Proposal: [Title]

## Problem Statement
[What problem are we solving?]

## Proposed Solution
[Your recommended approach]

## Benefits
[Why should this be approved?]

## Resource Requirements
[People, time, budget needed]

## Timeline
[Key milestones and deliverables]

## Success Criteria
[How will success be measured?]

## Risks and Mitigation
[Potential risks and how to address them]

## Alternatives Considered
[Other options that were evaluated]

## Recommendation
[Final recommendation and call to action]
`,
  "guide-template": `# User Guide: [Title]

## Getting Started
[Initial setup and prerequisites]

## Basic Usage
### Task 1: [Task Name]
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Task 2: [Task Name]
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Advanced Features
[More complex functionality]

## Troubleshooting
### Common Issues
[List of common problems and solutions]

## FAQ
[Frequently asked questions]

## Support
[How to get additional help]
`,
};

export default async function NewDocumentPage({
  params,
}: NewDocumentPageProps) {
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

  async function handleCreateDocument(formData: FormData) {
    "use server";
    
    const result = await createDocument(product!.id, organization!.id, formData);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/products/${params.productKey}/documents/${result.data!.id}`);
    }
    
    console.error("Failed to create document:", result.error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/documents`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Document</h1>
          <p className="text-muted-foreground">
            Create a new document for {product.name}
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
                  <Label htmlFor="template">Template (Optional)</Label>
                  <Select name="template">
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a template to get started" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prd-template">PRD Template</SelectItem>
                      <SelectItem value="rfc-template">RFC Template</SelectItem>
                      <SelectItem value="spec-template">Technical Spec Template</SelectItem>
                      <SelectItem value="design-template">Design Template</SelectItem>
                      <SelectItem value="analysis-template">Analysis Template</SelectItem>
                      <SelectItem value="proposal-template">Proposal Template</SelectItem>
                      <SelectItem value="guide-template">User Guide Template</SelectItem>
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
                    defaultValue={templates["prd-template"]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Supports Markdown formatting. You can use headers, lists, links, and more.
                  </p>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" asChild>
                    <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/documents`}>
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