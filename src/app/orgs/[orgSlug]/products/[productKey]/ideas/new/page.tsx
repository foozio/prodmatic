import { getCurrentUser, requireRole } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createIdea } from "@/server/actions/ideas";
import { ArrowLeft, Lightbulb, Target, TrendingUp, Clock, Users } from "lucide-react";
import Link from "next/link";

interface NewIdeaPageProps {
  params: {
    orgSlug: string;
    productKey: string;
  };
}

export default async function NewIdeaPage({
  params,
}: NewIdeaPageProps) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/orgs/${params.orgSlug}/products/${params.productKey}/ideas`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Submit New Idea</h1>
          <p className="text-muted-foreground">
            Share your idea for {product.name} and help prioritize development
          </p>
        </div>
      </div>

      <div className="max-w-4xl grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5" />
              <CardTitle>Idea Details</CardTitle>
            </div>
            <CardDescription>
              Describe your idea and provide context for evaluation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createIdea} className="space-y-6">
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="creatorId" value={user.id} />
              
              <div>
                <Label htmlFor="title">Idea Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="A concise, descriptive title for your idea"
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Keep it clear and specific
                </p>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Describe your idea in detail. What problem does it solve? How would it work?"
                  className="min-h-[120px]"
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Provide enough detail for others to understand and evaluate your idea
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="problem">Problem Statement</Label>
                  <Textarea
                    id="problem"
                    name="problem"
                    placeholder="What specific problem or pain point does this address?"
                    className="min-h-[80px]"
                  />
                </div>
                <div>
                  <Label htmlFor="hypothesis">Hypothesis</Label>
                  <Textarea
                    id="hypothesis"
                    name="hypothesis"
                    placeholder="What do you believe will happen if this idea is implemented?"
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="source">Source</Label>
                  <Select name="source">
                    <SelectTrigger>
                      <SelectValue placeholder="Where did this idea come from?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer_feedback">Customer Feedback</SelectItem>
                      <SelectItem value="user_research">User Research</SelectItem>
                      <SelectItem value="internal_brainstorm">Internal Brainstorming</SelectItem>
                      <SelectItem value="competitive_analysis">Competitive Analysis</SelectItem>
                      <SelectItem value="data_insights">Data Insights</SelectItem>
                      <SelectItem value="support_tickets">Support Tickets</SelectItem>
                      <SelectItem value="team_suggestion">Team Suggestion</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Initial Priority</Label>
                  <Select name="priority" defaultValue="MEDIUM">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH">High Priority</SelectItem>
                      <SelectItem value="MEDIUM">Medium Priority</SelectItem>
                      <SelectItem value="LOW">Low Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="tags">Tags (Optional)</Label>
                <Input
                  id="tags"
                  name="tags"
                  placeholder="feature, ui, performance, mobile"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Comma-separated tags to help categorize this idea
                </p>
              </div>

              <Button type="submit" className="w-full">
                Submit Idea
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* RICE Scoring Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <CardTitle>RICE Scoring (Optional)</CardTitle>
            </div>
            <CardDescription>
              Help prioritize your idea by providing initial RICE scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="reachScore">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="h-4 w-4" />
                      <span>Reach</span>
                    </div>
                  </Label>
                  <Select name="reachScore">
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Very Few Users</SelectItem>
                      <SelectItem value="2">2 - Some Users</SelectItem>
                      <SelectItem value="3">3 - Many Users</SelectItem>
                      <SelectItem value="4">4 - Most Users</SelectItem>
                      <SelectItem value="5">5 - All Users</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    How many users will be affected?
                  </p>
                </div>

                <div>
                  <Label htmlFor="impactScore">
                    <div className="flex items-center space-x-2 mb-2">
                      <TrendingUp className="h-4 w-4" />
                      <span>Impact</span>
                    </div>
                  </Label>
                  <Select name="impactScore">
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Minimal</SelectItem>
                      <SelectItem value="2">2 - Low</SelectItem>
                      <SelectItem value="3">3 - Medium</SelectItem>
                      <SelectItem value="4">4 - High</SelectItem>
                      <SelectItem value="5">5 - Massive</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    How much will this impact each user?
                  </p>
                </div>

                <div>
                  <Label htmlFor="confidenceScore">
                    <div className="flex items-center space-x-2 mb-2">
                      <Target className="h-4 w-4" />
                      <span>Confidence</span>
                    </div>
                  </Label>
                  <Select name="confidenceScore">
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Low Confidence</SelectItem>
                      <SelectItem value="2">2 - Medium-Low</SelectItem>
                      <SelectItem value="3">3 - Medium</SelectItem>
                      <SelectItem value="4">4 - Medium-High</SelectItem>
                      <SelectItem value="5">5 - High Confidence</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    How confident are you in these estimates?
                  </p>
                </div>

                <div>
                  <Label htmlFor="effortScore">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="h-4 w-4" />
                      <span>Effort</span>
                    </div>
                  </Label>
                  <Select name="effortScore">
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 - Very Easy</SelectItem>
                      <SelectItem value="2">2 - Easy</SelectItem>
                      <SelectItem value="3">3 - Medium</SelectItem>
                      <SelectItem value="4">4 - Hard</SelectItem>
                      <SelectItem value="5">5 - Very Hard</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    How much effort will this require?
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">RICE Score Calculation</h4>
                <p className="text-sm text-muted-foreground">
                  RICE = (Reach × Impact × Confidence) ÷ Effort
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Higher scores indicate higher priority items that should be worked on first.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Idea Submission Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium">Good Ideas Should:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Solve a real user problem or pain point</li>
                  <li>Be specific and actionable</li>
                  <li>Include context about why it matters</li>
                  <li>Consider feasibility and effort required</li>
                  <li>Align with product goals and strategy</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium">What Happens Next:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Your idea will be reviewed by the product team</li>
                  <li>The team may ask for clarification or additional details</li>
                  <li>Ideas are prioritized using RICE/WSJF scoring</li>
                  <li>Approved ideas may be converted to epics or features</li>
                  <li>You'll be notified of any status changes</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}