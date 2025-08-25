import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  BarChart3,
  Users,
  Lightbulb,
  Calendar,
  Rocket,
  Flag,
  Target,
  Archive,
  Database,
  TrendingUp
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface ReportsPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
}

export default async function ReportsPage({
  params,
}: ReportsPageProps) {
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
  await requireRole(user.id, organization.id, ["ADMIN", "PRODUCT_MANAGER", "CONTRIBUTOR", "STAKEHOLDER"]);

  const currentMembership = user.memberships.find(m => m.organizationId === organization.id);
  const canExportData = currentMembership?.role === "ADMIN" || 
                       currentMembership?.role === "PRODUCT_MANAGER" ||
                       currentMembership?.role === "CONTRIBUTOR";

  // Get counts for export statistics
  const [
    ideasCount,
    featuresCount,
    releasesCount,
    experimentsCount,
    kpisCount,
    flagsCount,
    customersCount,
    feedbackCount
  ] = await Promise.all([
    db.idea.count({ where: { productId: product.id, deletedAt: null } }),
    db.feature.count({ where: { productId: product.id, deletedAt: null } }),
    db.release.count({ where: { productId: product.id, deletedAt: null } }),
    db.experiment.count({ where: { productId: product.id, deletedAt: null } }),
    db.kPI.count({ where: { productId: product.id, deletedAt: null } }),
    db.featureFlag.count({ where: { productId: product.id, deletedAt: null } }),
    db.customer.count({ where: { productId: product.id, deletedAt: null } }),
    db.feedback.count({ where: { productId: product.id, deletedAt: null } }),
  ]);

  const reportCategories = [
    {
      title: "Product Management",
      description: "Core product data and workflows",
      reports: [
        {
          name: "Ideas Export",
          description: "All product ideas with scores and status",
          count: ideasCount,
          icon: Lightbulb,
          type: "ideas",
          formats: ["CSV", "PDF"]
        },
        {
          name: "Features Export",
          description: "Feature definitions and delivery status",
          count: featuresCount,
          icon: Target,
          type: "features",
          formats: ["CSV", "PDF"]
        },
        {
          name: "Releases Export",
          description: "Release history and changelogs",
          count: releasesCount,
          icon: Rocket,
          type: "releases",
          formats: ["CSV", "PDF"]
        },
      ]
    },
    {
      title: "Analytics & Experiments",
      description: "Data insights and experiment results",
      reports: [
        {
          name: "KPIs Export",
          description: "Key performance indicators and metrics",
          count: kpisCount,
          icon: BarChart3,
          type: "kpis",
          formats: ["CSV", "PDF"]
        },
        {
          name: "Experiments Export",
          description: "A/B test results and analysis",
          count: experimentsCount,
          icon: TrendingUp,
          type: "experiments",
          formats: ["CSV", "PDF"]
        },
        {
          name: "Feature Flags Export",
          description: "Feature flag configurations and usage",
          count: flagsCount,
          icon: Flag,
          type: "flags",
          formats: ["CSV"]
        },
      ]
    },
    {
      title: "Customer Data",
      description: "Customer feedback and insights",
      reports: [
        {
          name: "Customers Export",
          description: "Customer profiles and segments",
          count: customersCount,
          icon: Users,
          type: "customers",
          formats: ["CSV", "PDF"]
        },
        {
          name: "Feedback Export",
          description: "Customer feedback and feature requests",
          count: feedbackCount,
          icon: FileText,
          type: "feedback",
          formats: ["CSV", "PDF"]
        },
      ]
    },
    {
      title: "Complete Data Export",
      description: "Full product data archive",
      reports: [
        {
          name: "Full Product Export",
          description: "Complete product data for backup or migration",
          count: null,
          icon: Archive,
          type: "full",
          formats: ["ZIP"]
        },
        {
          name: "Analytics Dashboard",
          description: "Executive summary and key metrics",
          count: null,
          icon: Database,
          type: "dashboard",
          formats: ["PDF"]
        },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Product
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Exports</h1>
            <p className="text-muted-foreground">
              Download and export data for {product.name}
            </p>
          </div>
        </div>
      </div>

      {/* Export Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ideas</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ideasCount}</div>
            <p className="text-xs text-muted-foreground">
              Available for export
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Features</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{featuresCount}</div>
            <p className="text-xs text-muted-foreground">
              In development
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customersCount}</div>
            <p className="text-xs text-muted-foreground">
              Customer records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feedback</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackCount}</div>
            <p className="text-xs text-muted-foreground">
              Feedback items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Categories */}
      <div className="space-y-6">
        {reportCategories.map((category, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>{category.title}</CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.reports.map((report, reportIndex) => {
                  const Icon = report.icon;
                  
                  return (
                    <div key={reportIndex} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-5 w-5 text-blue-600" />
                          <h4 className="font-medium">{report.name}</h4>
                        </div>
                        {report.count !== null && (
                          <Badge variant="outline" className="text-xs">
                            {report.count} items
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-4">
                        {report.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-1">
                          {report.formats.map((format) => (
                            <Badge key={format} variant="secondary" className="text-xs">
                              {format}
                            </Badge>
                          ))}
                        </div>
                        
                        {canExportData && (
                          <Button 
                            size="sm" 
                            disabled={report.count === 0}
                            asChild
                          >
                            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/reports/export?type=${report.type}`}>
                              <Download className="h-3 w-3 mr-1" />
                              Export
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Export Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Export Guidelines</CardTitle>
          <CardDescription>
            Important information about data exports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium">Data Privacy</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Customer PII is automatically masked in exports</li>
                <li>• Internal notes and private data are excluded</li>
                <li>• Exports comply with GDPR and privacy regulations</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">File Formats</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• CSV: Raw data suitable for analysis</li>
                <li>• PDF: Formatted reports for presentations</li>
                <li>• ZIP: Complete data archives</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Export Limits</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Maximum 10,000 records per CSV export</li>
                <li>• Large datasets will be split into multiple files</li>
                <li>• Exports are generated asynchronously</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Retention Policy</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Export files are available for 7 days</li>
                <li>• Download links expire after first use</li>
                <li>• Contact support for extended retention</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Exports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Exports</CardTitle>
          <CardDescription>
            Your recent data export history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Download className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No recent exports. Start by exporting some data above.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}