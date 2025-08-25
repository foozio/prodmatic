import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding-form";

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  // If user already has organizations, redirect to first organization
  if (user.memberships.length > 0) {
    const firstOrg = user.memberships[0].organization;
    redirect(`/orgs/${firstOrg.slug}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to ProdMatic</h1>
          <p className="mt-2 text-gray-600">
            Let's get you started by creating your organization
          </p>
        </div>
        <OnboardingForm user={user} />
      </div>
    </div>
  );
}