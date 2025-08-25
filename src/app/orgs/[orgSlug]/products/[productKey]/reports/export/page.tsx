import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  Filter,
  Settings,
  FileText,
  Database
} from "lucide-react";
import Link from "next/link";
import { requestDataExport } from "@/server/actions/exports";

interface ExportConfigPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
  searchParams: {
    type: string;
  };
}

export default async function ExportConfigPage({
  params,
  searchParams,
}: ExportConfigPageProps) {
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

  const exportType = searchParams.type;

  if (!exportType) {
    redirect(`/orgs/${params.orgSlug}/products/${params.productKey}/reports`);
  }

  const exportConfigs = {
    ideas: {
      title: "Ideas Export Configuration",
      description: "Configure your ideas data export",
      fields: [
        { key: "title", label: "Idea Title", checked: true, required: true },
        { key: "description", label: "Description", checked: true },
        { key: "status", label: "Status", checked: true },
        { key: "priority", label: "Priority", checked: true },
        { key: "creator", label: "Creator", checked: true },
        { key: "scores", label: "RICE/WSJF Scores", checked: true },
        { key: "votes", label: "Vote Count", checked: false },
        { key: "tags", label: "Tags", checked: false },
        { key: "createdAt", label: "Created Date", checked: true },
        { key: "updatedAt", label: "Last Updated", checked: false },
      ],
      formats: ["CSV", "PDF"],
    },
    features: {
      title: "Features Export Configuration",
      description: "Configure your features data export",
      fields: [
        { key: "title", label: "Feature Title", checked: true, required: true },
        { key: "description", label: "Description", checked: true },
        { key: "status", label: "Status", checked: true },
        { key: "epic", label: "Epic", checked: true },
        { key: "priority", label: "Priority", checked: true },
        { key: "effort", label: "Effort Points", checked: false },
        { key: "acceptanceCriteria", label: "Acceptance Criteria", checked: false },
        { key: "createdAt", label: "Created Date", checked: true },
        { key: "assignee", label: "Assignee", checked: false },
      ],
      formats: ["CSV", "PDF"],
    },
    releases: {
      title: "Releases Export Configuration", 
      description: "Configure your releases data export",
      fields: [
        { key: "name", label: "Release Name", checked: true, required: true },
        { key: "version", label: "Version", checked: true, required: true },
        { key: "status", label: "Status", checked: true },
        { key: "type", label: "Release Type", checked: true },
        { key: "releaseDate", label: "Release Date", checked: true },
        { key: "features", label: "Features Count", checked: true },
        { key: "notes", label: "Release Notes", checked: false },
        { key: "artifacts", label: "Artifacts", checked: false },
      ],
      formats: ["CSV", "PDF"],
    },
    kpis: {
      title: "KPIs Export Configuration",
      description: "Configure your KPIs data export",
      fields: [
        { key: "name", label: "KPI Name", checked: true, required: true },
        { key: "metric", label: "Metric", checked: true, required: true },
        { key: "target", label: "Target Value", checked: true },
        { key: "currentValue", label: "Current Value", checked: true },
        { key: "frequency", label: "Frequency", checked: true },
        { key: "category", label: "Category", checked: false },
        { key: "owner", label: "Owner", checked: true },
        { key: "isActive", label: "Active Status", checked: true },
      ],
      formats: ["CSV", "PDF"],
    },
    customers: {
      title: "Customers Export Configuration",
      description: "Configure your customer data export",
      fields: [
        { key: "name", label: "Customer Name", checked: true, required: true },
        { key: "email", label: "Email (Masked)", checked: true },
        { key: "company", label: "Company", checked: true },
        { key: "tier", label: "Customer Tier", checked: true },
        { key: "segment", label: "Segment", checked: false },
        { key: "status", label: "Status", checked: true },
        { key: "createdAt", label: "Created Date", checked: true },
      ],
      formats: ["CSV", "PDF"],
    },
  };

  const config = exportConfigs[exportType as keyof typeof exportConfigs];

  if (!config) {
    redirect(`/orgs/${params.orgSlug}/products/${params.productKey}/reports`);
  }

  async function handleExport(formData: FormData) {
    "use server";
    if (!organization || !product) {
      throw new Error("Organization or product not found");
    }
    
    const result = await requestDataExport(product.id, organization.id, formData);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/products/${params.productKey}/reports?export=${result.data.exportId}`);
    } else {
      throw new Error(result.error);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/reports`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{config.title}</h1>
            <p className="text-muted-foreground">{config.description}</p>
          </div>
        </div>
      </div>

      <form action={handleExport} className="space-y-6">
        <input type="hidden" name="type" value={exportType} />
        
        {/* Export Format */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Export Format</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {config.formats.map((format) => (
                <div key={format} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="format"
                    value={format}
                    id={format}
                    defaultChecked={format === "CSV"}
                    className="text-primary"
                  />
                  <Label htmlFor={format} className="flex items-center space-x-2">
                    <span>{format}</span>
                    <Badge variant="outline" className="text-xs">
                      {format === "CSV" ? "Raw Data" : format === "PDF" ? "Formatted" : "Archive"}
                    </Badge>
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Date Range */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Date Range (Optional)</span>
            </CardTitle>
            <CardDescription>
              Filter data by creation date range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  type="date"
                  name="dateFrom"
                  id="dateFrom"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  type="date"
                  name="dateTo" 
                  id="dateTo"
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Field Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Field Selection</span>
            </CardTitle>
            <CardDescription>
              Choose which fields to include in your export
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.fields.map((field) => (
                <div key={field.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.key}
                    name={`field_${field.key}`}
                    defaultChecked={field.checked}
                    disabled={field.required}
                  />
                  <Label 
                    htmlFor={field.key} 
                    className={`flex items-center space-x-2 ${field.required ? 'text-muted-foreground' : ''}`}
                  >
                    <span>{field.label}</span>
                    {field.required && (
                      <Badge variant="outline" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Advanced Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Advanced Options</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="includeDeleted" name="includeDeleted" />
              <Label htmlFor="includeDeleted">Include deleted items</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox id="maskPII" name="maskPII" defaultChecked />
              <Label htmlFor="maskPII">Mask personally identifiable information</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox id="includeMetadata" name="includeMetadata" />
              <Label htmlFor="includeMetadata">Include system metadata</Label>
            </div>
          </CardContent>
        </Card>

        {/* Export Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Export will be generated and available for download for 7 days
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/reports`}>
                    Cancel
                  </Link>
                </Button>
                <Button type="submit">
                  <Download className="h-4 w-4 mr-2" />
                  Generate Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Export Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Export Preview</CardTitle>
          <CardDescription>
            Preview of what will be included in your export
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm">
              <strong>Export Type:</strong> {config.title.replace(" Export Configuration", "")}
            </div>
            <div className="text-sm">
              <strong>Default Format:</strong> CSV
            </div>
            <div className="text-sm">
              <strong>Estimated Fields:</strong> {config.fields.filter(f => f.checked).length} of {config.fields.length}
            </div>
            <div className="text-sm text-muted-foreground">
              The actual export may contain additional system fields and metadata
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}