import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  // If user already has organizations, show option to create another or go to existing
  if (user.memberships.length > 0) {
    const firstOrg = user.memberships[0].organization;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Create New Organization</h1>
            <p className="mt-2 text-gray-600">
              You&apos;re already part of {user.memberships.length} organization(s)
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">Your Organizations</h2>
            <ul className="space-y-2">
              {user.memberships.map((membership) => (
                <li key={membership.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span>{membership.organization.name}</span>
                  <Link href={`/orgs/${membership.organization.slug}`}>
                    <Button variant="outline" size="sm">Go to Organization</Button>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href={`/orgs/${firstOrg.slug}`}>
              <Button variant="outline" className="w-full sm:w-auto">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go to Existing Organization
              </Button>
            </Link>
            <OnboardingForm user={user} asButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to ProdMatic</h1>
          <p className="mt-2 text-gray-600">
            Let&apos;s get you started by creating your organization
          </p>
        </div>
        <OnboardingForm user={user} />
      </div>
    </div>
  );
}