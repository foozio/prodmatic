import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  Briefcase, 
  DollarSign,
  GraduationCap,
  Heart,
  Target,
  TrendingUp,
  AlertTriangle,
  Smartphone,
  Users
} from "lucide-react";
import Link from "next/link";
import { createPersona } from "@/server/actions/personas";

interface NewPersonaPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
}

export default async function NewPersonaPage({
  params,
}: NewPersonaPageProps) {
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

  async function handleCreatePersona(formData: FormData) {
    "use server";
    
    const result = await createPersona(product!.id, organization!.id, formData);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/products/${params.productKey}/personas`);
    }
    
    // Handle errors gracefully - in a real app you'd want to show these to the user  
    console.error("Failed to create persona:", result.error);
  }

  const sampleGoals = [
    "Complete tasks efficiently",
    "Make informed decisions",
    "Save time and effort",
    "Improve work quality",
    "Collaborate effectively with team",
    "Stay organized and productive",
  ];

  const samplePains = [
    "Repetitive manual tasks",
    "Lack of visibility into progress",
    "Difficulty finding information",
    "Poor communication between teams",
    "Complex approval processes",
    "Outdated tools and systems",
  ];

  const sampleGains = [
    "Increased productivity",
    "Better work-life balance",
    "Recognition for achievements",
    "Professional development",
    "Clear progress tracking",
    "Simplified workflows",
  ];

  const sampleBehaviors = [
    "Checks email first thing in the morning",
    "Prefers visual information over text",
    "Uses mobile apps during commute",
    "Relies on colleagues for recommendations",
    "Researches thoroughly before decisions",
    "Values security and privacy",
  ];

  const sampleChannels = [
    "Email newsletters",
    "Professional social networks",
    "Industry conferences",
    "Peer recommendations",
    "Google search",
    "Company intranet",
    "Mobile apps",
    "Video tutorials",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/personas`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Personas
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Persona</h1>
          <p className="text-muted-foreground">
            Define a new user persona for {product.name}
          </p>
        </div>
      </div>

      <form action={handleCreatePersona} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Start with the persona's name and overall description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Persona Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., Sarah the Sales Manager"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Use a descriptive name that includes their role or key characteristic
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="A brief overview of who this persona is and their context..."
                    rows={4}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="isPrimary" 
                    name="isPrimary"
                    className="rounded"
                  />
                  <Label htmlFor="isPrimary" className="text-sm">
                    This is a primary persona (main target user)
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Demographics */}
            <Card>
              <CardHeader>
                <CardTitle>Demographics</CardTitle>
                <CardDescription>
                  Demographic and contextual information about this persona
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="age">
                      <User className="h-4 w-4 inline mr-1" />
                      Age Range
                    </Label>
                    <Input
                      id="age"
                      name="age"
                      placeholder="e.g., 30-40"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">
                      <MapPin className="h-4 w-4 inline mr-1" />
                      Location
                    </Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="e.g., San Francisco, CA"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="occupation">
                      <Briefcase className="h-4 w-4 inline mr-1" />
                      Occupation
                    </Label>
                    <Input
                      id="occupation"
                      name="occupation"
                      placeholder="e.g., Sales Manager"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="income">
                      <DollarSign className="h-4 w-4 inline mr-1" />
                      Income Range
                    </Label>
                    <Input
                      id="income"
                      name="income"
                      placeholder="e.g., $80k-120k"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="education">
                      <GraduationCap className="h-4 w-4 inline mr-1" />
                      Education
                    </Label>
                    <Input
                      id="education"
                      name="education"
                      placeholder="e.g., Bachelor's Degree"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="familyStatus">
                      <Users className="h-4 w-4 inline mr-1" />
                      Family Status
                    </Label>
                    <Input
                      id="familyStatus"
                      name="familyStatus"
                      placeholder="e.g., Married with 2 kids"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="techSavviness">
                    <Smartphone className="h-4 w-4 inline mr-1" />
                    Tech Savviness
                  </Label>
                  <Select name="techSavviness">
                    <SelectTrigger>
                      <SelectValue placeholder="Select tech comfort level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low - Prefers simple, familiar tools</SelectItem>
                      <SelectItem value="MEDIUM">Medium - Comfortable with common tools</SelectItem>
                      <SelectItem value="HIGH">High - Early adopter, loves new tech</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Goals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-700">
                  <Target className="h-5 w-5 mr-2" />
                  Goals
                </CardTitle>
                <CardDescription>
                  What does this persona want to achieve?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Textarea
                    name="goals"
                    placeholder={sampleGoals.join("\n")}
                    rows={6}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter each goal on a new line
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Pain Points */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-red-700">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Pain Points
                </CardTitle>
                <CardDescription>
                  What frustrates or blocks this persona?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Textarea
                    name="pains"
                    placeholder={samplePains.join("\n")}
                    rows={6}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter each pain point on a new line
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Gains */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-blue-700">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Gains & Benefits
                </CardTitle>
                <CardDescription>
                  What value does this persona seek?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Textarea
                    name="gains"
                    placeholder={sampleGains.join("\n")}
                    rows={6}
                    className="text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter each gain on a new line
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Behaviors & Channels */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Behaviors & Habits</CardTitle>
              <CardDescription>
                How does this persona typically behave?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Textarea
                  name="behaviors"
                  placeholder={sampleBehaviors.join("\n")}
                  rows={6}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter each behavior on a new line
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferred Channels</CardTitle>
              <CardDescription>
                How do you reach this persona?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Textarea
                  name="channels"
                  placeholder={sampleChannels.join("\n")}
                  rows={6}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Enter each channel on a new line
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/personas`}>
              Cancel
            </Link>
          </Button>
          <Button type="submit">
            Create Persona
          </Button>
        </div>
      </form>
    </div>
  );
}