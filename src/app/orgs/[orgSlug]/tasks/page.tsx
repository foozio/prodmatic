import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";

interface TasksPageProps {
  params: {
    orgSlug: string;
  };
  searchParams: {
    status?: string;
  };
}

export default async function TasksRedirectPage({
  params,
  searchParams,
}: TasksPageProps) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/auth/signin");
  }

  const organization = await db.organization.findUnique({
    where: { slug: params.orgSlug },
    include: {
      products: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 1,
      },
    },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  // Redirect to the first product's tasks page, or to products page if no products exist
  if (organization.products.length > 0) {
    const product = organization.products[0];
    const statusQuery = searchParams.status ? `?status=${searchParams.status}` : "";
    redirect(`/orgs/${params.orgSlug}/products/${product.key}/tasks/new${statusQuery}`);
  } else {
    redirect(`/orgs/${params.orgSlug}/products`);
  }
}