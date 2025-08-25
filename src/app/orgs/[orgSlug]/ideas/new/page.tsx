import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lightbulb, Save, Send } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { createIdea } from "@/server/actions/ideas";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NewIdeaPageProps {
  params: Promise<{
    orgSlug: string;
  }>;
}

export default async function NewIdeaPage({ params }: NewIdeaPageProps) {
  const { orgSlug } = await params;
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/auth/signin");
  }

  // Get organization and products for the dropdown
  const organization = await db.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      products: {
        select: {
          id: true,
          name: true,
          key: true,
        },
      },
    },
  });

  if (!organization) {
    throw new Error("Organization not found");
  }

  async function submitIdea(formData: FormData) {
    "use server";
    
    try {
      const result = await createIdea(formData);
      if (result.success) {
        redirect(`/orgs/${orgSlug}/ideas/${result.ideaId}`);
      } else {
        // Handle error - in a real app, you'd pass this to the client
        throw new Error(result.error || "Failed to create idea");
      }
    } catch (error) {
      console.error("Error creating idea:", error);
      throw error;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href={`/orgs/${orgSlug}/ideas`}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Ideas
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Lightbulb className="h-8 w-8 text-yellow-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Submit New Idea</h1>
          <p className="text-gray-600 mt-1">
            Share your product idea with the team for evaluation
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Idea Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={submitIdea} className="space-y-6">
            {/* Product Selection */}
            <div className="space-y-2">
              <Label htmlFor="productId">Product *</Label>
              <Select name="productId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {organization.products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Enter a clear, concise title for your idea"
                required
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe your idea in detail. What do you want to build?"
                rows={4}
                required
              />
            </div>

            {/* Problem */}
            <div className="space-y-2">
              <Label htmlFor="problem">Problem Statement</Label>
              <Textarea
                id="problem"
                name="problem"
                placeholder="What problem does this idea solve? Who experiences this problem?"
                rows={3}
              />
              <p className="text-sm text-gray-500">
                Optional: Help others understand the context and motivation behind your idea.
              </p>
            </div>

            {/* Hypothesis */}
            <div className="space-y-2">
              <Label htmlFor="hypothesis">Hypothesis</Label>
              <Textarea
                id="hypothesis"
                name="hypothesis"
                placeholder="What do you believe will happen if this idea is implemented?"
                rows={3}
              />
              <p className="text-sm text-gray-500">
                Optional: Express your assumptions about the expected outcome.
              </p>
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                name="source"
                placeholder="e.g., Customer feedback, User research, Internal discussion"
              />
              <p className="text-sm text-gray-500">
                Optional: Where did this idea come from?
              </p>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select name="priority" defaultValue="MEDIUM">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH">High - Critical for success</SelectItem>
                  <SelectItem value="MEDIUM">Medium - Important but not urgent</SelectItem>
                  <SelectItem value="LOW">Low - Nice to have</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                name="tags"
                placeholder="Enter tags separated by commas (e.g., ui, mobile, performance)"
              />
              <p className="text-sm text-gray-500">
                Optional: Add relevant tags to help categorize your idea.
              </p>
            </div>

            {/* RICE Scoring (Optional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reachScore">Reach (1-5)</Label>
                <Select name="reachScore">
                  <SelectTrigger>
                    <SelectValue placeholder="Rate reach" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Very Low</SelectItem>
                    <SelectItem value="2">2 - Low</SelectItem>
                    <SelectItem value="3">3 - Medium</SelectItem>
                    <SelectItem value="4">4 - High</SelectItem>
                    <SelectItem value="5">5 - Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="impactScore">Impact (1-5)</Label>
                <Select name="impactScore">
                  <SelectTrigger>
                    <SelectValue placeholder="Rate impact" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Minimal</SelectItem>
                    <SelectItem value="2">2 - Low</SelectItem>
                    <SelectItem value="3">3 - Medium</SelectItem>
                    <SelectItem value="4">4 - High</SelectItem>
                    <SelectItem value="5">5 - Massive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confidenceScore">Confidence (1-5)</Label>
                <Select name="confidenceScore">
                  <SelectTrigger>
                    <SelectValue placeholder="Rate confidence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Low confidence</SelectItem>
                    <SelectItem value="2">2 - Some confidence</SelectItem>
                    <SelectItem value="3">3 - Medium confidence</SelectItem>
                    <SelectItem value="4">4 - High confidence</SelectItem>
                    <SelectItem value="5">5 - Very high confidence</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="effortScore">Effort (1-5)</Label>
                <Select name="effortScore">
                  <SelectTrigger>
                    <SelectValue placeholder="Rate effort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Minimal effort</SelectItem>
                    <SelectItem value="2">2 - Low effort</SelectItem>
                    <SelectItem value="3">3 - Medium effort</SelectItem>
                    <SelectItem value="4">4 - High effort</SelectItem>
                    <SelectItem value="5">5 - Massive effort</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
              <strong>RICE Scoring:</strong> These optional scores help prioritize ideas based on Reach (how many people will be affected), 
              Impact (how much it will affect each person), Confidence (how sure you are about your estimates), 
              and Effort (how much work is required).
            </p>

            {/* Hidden fields */}
            <input type="hidden" name="creatorId" value={user.id} />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" asChild>
                <Link href={`/orgs/${orgSlug}/ideas`}>
                  Cancel
                </Link>
              </Button>
              <Button type="submit">
                <Send className="h-4 w-4 mr-2" />
                Submit Idea
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}