import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, Clock, MapPin, Target, HelpCircle } from "lucide-react";
import Link from "next/link";
import { createInterview, createCustomer } from "@/server/actions/interviews";

interface NewInterviewPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
}

export default async function NewInterviewPage({
  params,
}: NewInterviewPageProps) {
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
  await requireRole(user.id, organization.id, ["ADMIN", "PRODUCT_MANAGER"]);

  const customers = await db.customer.findMany({
    where: {
      productId: product.id,
      deletedAt: null,
    },
    orderBy: {
      name: "asc",
    },
  });

  async function handleCreateInterview(formData: FormData) {
    "use server";
    
    const result = await createInterview(product!.id, organization!.id, formData);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/products/${params.productKey}/interviews`);
    }
    
    // Handle errors gracefully - in a real app you'd want to show these to the user
    console.error("Failed to create interview:", result.error);
  }

  async function handleCreateCustomer(formData: FormData) {
    "use server";
    
    const result = await createCustomer(product!.id, organization!.id, formData);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/products/${params.productKey}/interviews/new`);
    }
    
    // Handle errors gracefully - in a real app you'd want to show these to the user
    console.error("Failed to create customer:", result.error);
  }

  const defaultQuestions = [
    "Can you walk me through your current process for [relevant workflow]?",
    "What are the biggest challenges you face with [product area]?",
    "How do you currently solve this problem?",
    "What would an ideal solution look like for you?",
    "What tools do you currently use for this?",
    "How much time do you spend on this task daily/weekly?",
    "What frustrates you most about your current approach?",
    "What would success look like to you?",
  ];

  const defaultObjectives = [
    "Understand current workflow and pain points",
    "Identify unmet needs and opportunities",
    "Validate problem assumptions",
    "Gather feature requirements and priorities",
    "Learn about decision-making process",
    "Understand user goals and motivations",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/interviews`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Interviews
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule Interview</h1>
          <p className="text-muted-foreground">
            Schedule a customer interview for {product.name}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Interview Details</CardTitle>
              <CardDescription>
                Provide information about the interview you want to schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={handleCreateInterview} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customerId">Customer *</Label>
                    <Select name="customerId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} {customer.company && `(${customer.company})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {customers.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No customers found. <Link href="#add-customer" className="text-primary hover:underline">Add a customer first</Link>.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Interview Title *</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="e.g., Discovery Interview - Workflow Pain Points"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Brief description of what this interview is about..."
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="scheduledAt">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Date & Time *
                    </Label>
                    <Input
                      id="scheduledAt"
                      name="scheduledAt"
                      type="datetime-local"
                      required
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">
                      <Clock className="h-4 w-4 inline mr-1" />
                      Duration (minutes)
                    </Label>
                    <Select name="duration" defaultValue="60">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="90">90 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      Location/Link
                    </Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="Zoom link, office, etc."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objectives">
                    <Target className="h-4 w-4 inline mr-1" />
                    Interview Objectives
                  </Label>
                  <Textarea
                    id="objectives"
                    name="objectives"
                    placeholder={defaultObjectives.join("\n")}
                    rows={4}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter each objective on a new line
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="questions">
                    <HelpCircle className="h-4 w-4 inline mr-1" />
                    Interview Questions
                  </Label>
                  <Textarea
                    id="questions"
                    name="questions"
                    placeholder={defaultQuestions.join("\n")}
                    rows={6}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter each question on a new line
                  </p>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" asChild>
                    <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/interviews`}>
                      Cancel
                    </Link>
                  </Button>
                  <Button type="submit">
                    Schedule Interview
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card id="add-customer">
            <CardHeader>
              <CardTitle>Add New Customer</CardTitle>
              <CardDescription>
                Don't see the customer you need? Add them here first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={handleCreateCustomer} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-name">Name *</Label>
                  <Input
                    id="customer-name"
                    name="name"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer-email">Email</Label>
                  <Input
                    id="customer-email"
                    name="email"
                    type="email"
                    placeholder="john@company.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer-company">Company</Label>
                  <Input
                    id="customer-company"
                    name="company"
                    placeholder="Acme Corp"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer-role">Role</Label>
                  <Input
                    id="customer-role"
                    name="role"
                    placeholder="Product Manager"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customer-segment">Segment</Label>
                  <Input
                    id="customer-segment"
                    name="segment"
                    placeholder="Enterprise, SMB, etc."
                  />
                </div>

                <Button type="submit" size="sm" className="w-full">
                  Add Customer
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interview Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium">Before the Interview</h4>
                <p className="text-muted-foreground">Research the customer and prepare specific questions based on their background.</p>
              </div>
              <div>
                <h4 className="font-medium">During the Interview</h4>
                <p className="text-muted-foreground">Listen more than you talk. Ask "why" and "how" questions to get deeper insights.</p>
              </div>
              <div>
                <h4 className="font-medium">After the Interview</h4>
                <p className="text-muted-foreground">Document insights immediately while they're fresh in your memory.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}