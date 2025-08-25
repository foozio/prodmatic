import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Plus, 
  Sunset, 
  Calendar, 
  Archive,
  AlertTriangle,
  Clock,
  Users,
  Database,
  FileText,
  CheckCircle,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";

interface SunsetPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
}

export default async function SunsetPage({
  params,
}: SunsetPageProps) {
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
    include: {
      sunsetPlan: true,
    },
  });

  if (!product) {
    redirect(`/orgs/${params.orgSlug}/products`);
  }

  // Check if user has access
  await requireRole(user.id, organization.id, ["ADMIN", "PRODUCT_MANAGER", "CONTRIBUTOR", "STAKEHOLDER"]);

  const currentMembership = user.memberships.find(m => m.organizationId === organization.id);
  const canManageSunset = currentMembership?.role === "ADMIN" || 
                         currentMembership?.role === "PRODUCT_MANAGER";

  const sunsetPlan = product.sunsetPlan;
  
  // Calculate sunset metrics
  const today = new Date();
  const eolDate = sunsetPlan?.eolDate ? new Date(sunsetPlan.eolDate) : null;
  const eoslDate = sunsetPlan?.eoslDate ? new Date(sunsetPlan.eoslDate) : null;
  
  const daysToEOL = eolDate ? differenceInDays(eolDate, today) : null;
  const daysToEOSL = eoslDate ? differenceInDays(eoslDate, today) : null;

  const statusColors = {
    PLANNED: "bg-blue-100 text-blue-700",
    ANNOUNCED: "bg-yellow-100 text-yellow-700",
    IN_PROGRESS: "bg-orange-100 text-orange-700",
    COMPLETED: "bg-gray-100 text-gray-700",
  };

  // Mock sunset checklist (would be dynamic in real implementation)
  const sunsetChecklist = [
    {
      id: "1",
      title: "Customer Communication Plan",
      description: "Notify all customers about the upcoming sunset",
      completed: !!sunsetPlan?.communicationPlan,
      category: "Communication",
    },
    {
      id: "2", 
      title: "Data Migration Strategy",
      description: "Plan how customer data will be handled",
      completed: !!sunsetPlan?.migrationPath,
      category: "Data",
    },
    {
      id: "3",
      title: "Support Transition",
      description: "Plan end of support lifecycle",
      completed: !!sunsetPlan?.eoslDate,
      category: "Support",
    },
    {
      id: "4",
      title: "Data Retention Policy",
      description: "Define how long data will be retained",
      completed: !!sunsetPlan?.retentionPolicy,
      category: "Compliance",
    },
    {
      id: "5",
      title: "Alternative Solutions",
      description: "Provide customers with alternative options",
      completed: false,
      category: "Migration",
    },
    {
      id: "6",
      title: "Final Data Export",
      description: "Allow customers to export their data",
      completed: false,
      category: "Data",
    },
  ];

  const completedTasks = sunsetChecklist.filter(task => task.completed).length;
  const progress = (completedTasks / sunsetChecklist.length) * 100;

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
            <h1 className="text-3xl font-bold tracking-tight">Sunset Management</h1>
            <p className="text-muted-foreground">
              End-of-life planning for {product.name}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canManageSunset && !sunsetPlan && (
            <Button asChild>
              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/sunset/new`}>
                <Plus className="h-4 w-4 mr-2" />
                Create Sunset Plan
              </Link>
            </Button>
          )}
          {canManageSunset && sunsetPlan && (
            <Button variant="outline" asChild>
              <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/sunset/edit`}>
                Edit Plan
              </Link>
            </Button>
          )}
        </div>
      </div>

      {!sunsetPlan ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Sunset className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No sunset plan yet</h3>
              <p className="text-muted-foreground mb-6">
                Create a sunset plan to manage the end-of-life process for this product
              </p>
              {canManageSunset && (
                <Button asChild>
                  <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/sunset/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Sunset Plan
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Sunset Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                <Sunset className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Badge className={statusColors[sunsetPlan.status]}>
                  {sunsetPlan.status.replace("_", " ")}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  Current sunset status
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">End of Life</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {eolDate ? format(eolDate, "MMM d, yyyy") : "Not set"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {daysToEOL !== null && daysToEOL >= 0 
                    ? `${daysToEOL} days remaining`
                    : daysToEOL !== null && daysToEOL < 0
                    ? `${Math.abs(daysToEOL)} days overdue`
                    : "No date set"
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">End of Support</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {eoslDate ? format(eoslDate, "MMM d, yyyy") : "Not set"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {daysToEOSL !== null && daysToEOSL >= 0 
                    ? `${daysToEOSL} days remaining`
                    : daysToEOSL !== null && daysToEOSL < 0
                    ? `${Math.abs(daysToEOSL)} days overdue`
                    : "No date set"
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Progress</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(progress)}%</div>
                <p className="text-xs text-muted-foreground">
                  {completedTasks} of {sunsetChecklist.length} tasks
                </p>
                <Progress value={progress} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Sunset Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Sunset Plan Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-1">Reason for Sunset</h4>
                  <p className="text-sm text-muted-foreground">
                    {sunsetPlan.reason}
                  </p>
                </div>

                {sunsetPlan.migrationPath && (
                  <div>
                    <h4 className="font-medium mb-1">Migration Path</h4>
                    <p className="text-sm text-muted-foreground">
                      {sunsetPlan.migrationPath}
                    </p>
                  </div>
                )}

                {sunsetPlan.retentionPolicy && (
                  <div>
                    <h4 className="font-medium mb-1">Data Retention Policy</h4>
                    <p className="text-sm text-muted-foreground">
                      {sunsetPlan.retentionPolicy}
                    </p>
                  </div>
                )}

                {sunsetPlan.communicationPlan && (
                  <div>
                    <h4 className="font-medium mb-1">Communication Plan</h4>
                    <p className="text-sm text-muted-foreground">
                      {sunsetPlan.communicationPlan}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5" />
                  <span>Sunset Checklist</span>
                </CardTitle>
                <CardDescription>
                  Track progress through the sunset process
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sunsetChecklist.map((task) => (
                    <div key={task.id} className="flex items-start space-x-3">
                      <div className="mt-1">
                        {task.completed ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-medium text-sm ${
                            task.completed ? "text-green-800" : ""
                          }`}>
                            {task.title}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {task.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Sunset Timeline</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sunsetPlan.eoslDate && (
                  <div className="flex items-center space-x-4 p-3 border rounded-lg">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="flex-1">
                      <h4 className="font-medium">End of Support Life (EOSL)</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(sunsetPlan.eoslDate), "MMMM d, yyyy")}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {daysToEOSL !== null && daysToEOSL >= 0 
                        ? `${daysToEOSL} days`
                        : "Past due"
                      }
                    </div>
                  </div>
                )}

                {sunsetPlan.eolDate && (
                  <div className="flex items-center space-x-4 p-3 border rounded-lg">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="flex-1">
                      <h4 className="font-medium">End of Life (EOL)</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(sunsetPlan.eolDate), "MMMM d, yyyy")}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {daysToEOL !== null && daysToEOL >= 0 
                        ? `${daysToEOL} days`
                        : "Past due"
                      }
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Sunset Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Sunset Best Practices</CardTitle>
          <CardDescription>
            Guidelines for a successful product sunset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Early Communication",
                description: "Notify customers well in advance with multiple touchpoints",
                icon: Users,
              },
              {
                title: "Data Protection",
                description: "Ensure customer data is handled according to privacy regulations",
                icon: Database,
              },
              {
                title: "Migration Support",
                description: "Provide clear paths and assistance for customers to migrate",
                icon: Archive,
              },
              {
                title: "Documentation",
                description: "Document the entire process for future reference",
                icon: FileText,
              },
            ].map((practice, index) => {
              const Icon = practice.icon;
              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon className="h-4 w-4" />
                    <h4 className="font-medium">{practice.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{practice.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}