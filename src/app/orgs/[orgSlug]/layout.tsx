import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";

interface OrganizationLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    orgSlug: string;
  }>;
}

export default async function OrganizationLayout({
  children,
  params,
}: OrganizationLayoutProps) {
  const { orgSlug } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  // Get current organization
  const currentOrganization = await db.organization.findUnique({
    where: { slug: orgSlug },
    include: {
      teams: true,
      memberships: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
  });

  if (!currentOrganization) {
    redirect("/onboarding");
  }

  // Check if user is a member
  const membership = user.memberships.find(
    (m) => m.organizationId === currentOrganization.id
  );

  if (!membership) {
    redirect("/onboarding");
  }

  // Get all user's organizations
  const organizations = await db.organization.findMany({
    where: {
      memberships: {
        some: {
          userId: user.id,
        },
      },
    },
    include: {
      teams: true,
      memberships: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      },
    },
  });

  return (
    <AppShell
      user={user}
      currentOrganization={currentOrganization}
      organizations={organizations}
    >
      {children}
    </AppShell>
  );
}