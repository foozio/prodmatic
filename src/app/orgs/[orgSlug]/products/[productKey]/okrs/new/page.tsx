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
  Target, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  CheckCircle,
  User,
  Calendar
} from "lucide-react";
import Link from "next/link";
import { createOKR } from "@/server/actions/okrs";

interface NewOKRPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
}

export default async function NewOKRPage({
  params,
}: NewOKRPageProps) {
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

  // Get team members for owner assignment
  const teamMembers = await db.user.findMany({
    where: {
      memberships: {
        some: {
          organizationId: organization.id,
        },
      },
    },
    include: {
      memberships: {
        where: { organizationId: organization.id },
      },
    },
  });

  // Generate current and upcoming quarters
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentQuarter = Math.ceil((currentDate.getMonth() + 1) / 3);
  const quarters = [
    { key: `${currentYear}-Q${currentQuarter}`, label: `Q${currentQuarter} ${currentYear}`, year: currentYear },
    { key: `${currentYear}-Q${Math.min(currentQuarter + 1, 4)}`, label: `Q${Math.min(currentQuarter + 1, 4)} ${currentYear}`, year: currentYear },
    currentQuarter === 4 
      ? { key: `${currentYear + 1}-Q1`, label: `Q1 ${currentYear + 1}`, year: currentYear + 1 }
      : { key: `${currentYear}-Q${currentQuarter + 1}`, label: `Q${currentQuarter + 1} ${currentYear}`, year: currentYear },
  ];

  async function handleCreateOKR(formData: FormData) {
    "use server";
    
    const result = await createOKR(product!.id, organization!.id, formData);
    
    if (result.success) {
      redirect(`/orgs/${params.orgSlug}/products/${params.productKey}/okrs`);
    }
    
    // Handle errors gracefully - in a real app you'd want to show these to the user
    console.error("Failed to create OKR:", result.error);
  }

  const keyResultTypes = [
    { value: "INCREASE", label: "Increase", icon: TrendingUp, description: "Target to grow a metric" },
    { value: "DECREASE", label: "Decrease", icon: TrendingDown, description: "Target to reduce a metric" },
    { value: "MAINTAIN", label: "Maintain", icon: Minus, description: "Keep a metric stable" },
    { value: "BINARY", label: "Binary", icon: CheckCircle, description: "Yes/No completion target" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/okrs`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to OKRs
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create OKR</h1>
          <p className="text-muted-foreground">
            Set objectives and key results for {product.name}
          </p>
        </div>
      </div>

      <form action={handleCreateOKR} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Objective Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Objective
                </CardTitle>
                <CardDescription>
                  Define what you want to achieve this quarter
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="objective">Objective Statement *</Label>
                  <Input
                    id="objective"
                    name="objective"
                    placeholder="e.g., Increase user engagement and product adoption"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Write a clear, inspirational goal that your team can rally around
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Provide additional context about this objective..."
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="quarter">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      Quarter *
                    </Label>
                    <Select name="quarter" defaultValue={quarters[0].key}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {quarters.map((quarter) => (
                          <SelectItem key={quarter.key} value={quarter.key}>
                            {quarter.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Year *</Label>
                    <Input
                      id="year"
                      name="year"
                      type="number"
                      min={currentYear}
                      max={currentYear + 2}
                      defaultValue={currentYear}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ownerId">
                      <User className="h-4 w-4 inline mr-1" />
                      Owner *
                    </Label>
                    <Select name="ownerId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select owner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name} ({member.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Results */}
            <Card>
              <CardHeader>
                <CardTitle>Key Results</CardTitle>
                <CardDescription>
                  Define 2-5 measurable outcomes that indicate success
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div id="key-results-container" className="space-y-4">
                  {/* Default key result template */}
                  <div className="key-result-item border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Key Result 1</h4>
                      <Button type="button" variant="ghost" size="sm" className="remove-kr-btn hidden">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Description *</Label>
                        <Input
                          name="kr_description_1"
                          placeholder="e.g., Increase monthly active users to 10,000"
                          required
                        />
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>Target Value *</Label>
                          <Input
                            name="kr_target_1"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="10000"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Unit</Label>
                          <Input
                            name="kr_unit_1"
                            placeholder="users, %, $, etc."
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select name="kr_type_1" defaultValue="INCREASE">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {keyResultTypes.map((type) => {
                                const Icon = type.icon;
                                return (
                                  <SelectItem key={type.value} value={type.value}>
                                    <div className="flex items-center">
                                      <Icon className="h-4 w-4 mr-2" />
                                      {type.label}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Button type="button" variant="outline" className="mt-4" id="add-kr-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Key Result
                </Button>

                <input type="hidden" name="keyResults" id="keyResults" />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* OKR Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle>OKR Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium">Good Objectives</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Aspirational and inspiring</li>
                    <li>• Qualitative, not quantitative</li>
                    <li>• Time-bound (quarterly)</li>
                    <li>• Aligned with company strategy</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium">Good Key Results</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Specific and measurable</li>
                    <li>• Ambitious but achievable</li>
                    <li>• 2-5 per objective</li>
                    <li>• Lead to objective completion</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium">Key Result Types</h4>
                  <div className="space-y-2">
                    {keyResultTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <div key={type.value} className="flex items-start space-x-2">
                          <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-muted-foreground">{type.description}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Example OKR */}
            <Card>
              <CardHeader>
                <CardTitle>Example OKR</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <h4 className="font-medium">Objective:</h4>
                  <p className="text-muted-foreground">
                    Launch the best mobile experience in our industry
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium">Key Results:</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Increase mobile app rating to 4.7+ stars</li>
                    <li>• Achieve 50k mobile app downloads</li>
                    <li>• Reduce mobile crash rate to &lt;0.1%</li>
                    <li>• Launch 3 mobile-exclusive features</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/okrs`}>
              Cancel
            </Link>
          </Button>
          <Button type="submit">
            Create OKR
          </Button>
        </div>
      </form>

      {/* JavaScript for dynamic key results management */}
      <script dangerouslySetInnerHTML={{
        __html: `
          let krCount = 1;
          
          document.getElementById('add-kr-btn').addEventListener('click', function() {
            krCount++;
            const container = document.getElementById('key-results-container');
            const template = document.querySelector('.key-result-item').cloneNode(true);
            
            // Update the template for new key result
            template.querySelector('h4').textContent = 'Key Result ' + krCount;
            template.querySelector('.remove-kr-btn').classList.remove('hidden');
            
            // Update input names
            const inputs = template.querySelectorAll('input, select');
            inputs.forEach(input => {
              const name = input.name;
              if (name && name.includes('_1')) {
                input.name = name.replace('_1', '_' + krCount);
                input.value = '';
                input.removeAttribute('required');
              }
            });
            
            container.appendChild(template);
            
            // Add remove functionality
            template.querySelector('.remove-kr-btn').addEventListener('click', function() {
              template.remove();
            });
          });
          
          // Collect key results data before form submission
          document.querySelector('form').addEventListener('submit', function() {
            const keyResults = [];
            const krItems = document.querySelectorAll('.key-result-item');
            
            krItems.forEach((item, index) => {
              const krIndex = index + 1;
              const description = item.querySelector('[name*="kr_description"]').value;
              const target = parseFloat(item.querySelector('[name*="kr_target"]').value);
              const unit = item.querySelector('[name*="kr_unit"]').value;
              const type = item.querySelector('[name*="kr_type"]').value;
              
              if (description && target) {
                keyResults.push({
                  description,
                  target,
                  unit: unit || '',
                  type
                });
              }
            });
            
            document.getElementById('keyResults').value = JSON.stringify(keyResults);
          });
        `
      }} />
    </div>
  );
}