import Image from "next/image";
import { getCurrentUser } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  // If user has organizations, redirect to first organization
  if (user.memberships.length > 0) {
    const firstOrg = user.memberships[0].organization;
    redirect(`/orgs/${firstOrg.slug}`);
  }

  // If no organizations, redirect to onboarding
  redirect("/onboarding");
}
