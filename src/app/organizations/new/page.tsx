import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewOrganizationPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <div className="mb-6">
          <Link href={user.memberships.length > 0 ? `/orgs/${user.memberships[0].organization.slug}` : "/onboarding"}>
            <Button variant="ghost" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </Link>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Organization</h1>
          <p className="mt-2 text-gray-600">
            Set up a new workspace for your team
          </p>
        </div>
        
        <OnboardingForm user={user} />
      </div>
    </div>
  );
}