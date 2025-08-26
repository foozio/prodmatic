import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth-helpers";

interface TaskDetailPageProps {
  params: {
    orgSlug: string;
    taskId: string;
  };
}

export default async function TaskDetailRedirectPage({
  params,
}: TaskDetailPageProps) {
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

  // Find the task to determine which product it belongs to
  const task = await db.task.findUnique({
    where: { id: params.taskId },
    include: {
      product: true,
    },
  });

  if (!task) {
    // If task doesn't exist, redirect to the first product's tasks page or products page
    const firstProduct = await db.product.findFirst({
      where: {
        organizationId: organization.id,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (firstProduct) {
      redirect(`/orgs/${params.orgSlug}/products/${firstProduct.key}/sprints`);
    } else {
      redirect(`/orgs/${params.orgSlug}/products`);
    }
  }

  // Redirect to the task detail page in the appropriate product
  redirect(`/orgs/${params.orgSlug}/products/${task.product.key}/tasks/${params.taskId}`);
}