"use server";

import { db } from "@/lib/db";
import { getCurrentUser, requireRole, logActivity } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { z } from "zod";

const createExperimentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  hypothesis: z.string().min(1, "Hypothesis is required"),
  type: z.enum(["AB_TEST", "MULTIVARIATE", "FEATURE_FLAG", "QUALITATIVE"]).default("AB_TEST"),
  audience: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  ownerId: z.string().optional(),
  metrics: z.array(z.string()).default([]),
  variants: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    allocation: z.number().min(0).max(100),
  })).default([]),
});

const updateExperimentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  hypothesis: z.string().min(1, "Hypothesis is required"),
  type: z.enum(["AB_TEST", "MULTIVARIATE", "FEATURE_FLAG", "QUALITATIVE"]),
  status: z.enum(["DRAFT", "RUNNING", "COMPLETED", "CANCELLED", "PAUSED"]),
  audience: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  ownerId: z.string().optional(),
  metrics: z.array(z.string()).default([]),
  variants: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    allocation: z.number().min(0).max(100),
  })).default([]),
  results: z.string().optional(),
  conclusion: z.string().optional(),
});

export async function createExperiment(
  productId: string,
  organizationId: string,
  formData: FormData
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER, Role.CONTRIBUTOR]);

    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      hypothesis: formData.get("hypothesis") as string,
      type: formData.get("type") as "AB_TEST" | "MULTIVARIATE" | "FEATURE_FLAG" | "QUALITATIVE" || "AB_TEST",
      audience: formData.get("audience") as string,
      startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : undefined,
      endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : undefined,
      ownerId: formData.get("ownerId") as string || user.id,
      metrics: formData.get("metrics") ? JSON.parse(formData.get("metrics") as string) : [],
      variants: formData.get("variants") ? JSON.parse(formData.get("variants") as string) : [],
    };

    const validatedData = createExperimentSchema.parse(data);

    const experiment = await db.experiment.create({
      data: {
        ...validatedData,
        productId,
        status: "DRAFT",
        metrics: validatedData.metrics,
        variants: validatedData.variants,
      },
      include: {
        owner: true,
        product: {
          include: {
            organization: true,
          },
        },
      },
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "CREATE",
      entityType: "Experiment",
      entityId: experiment.id,
      metadata: { 
        name: experiment.name,
        type: experiment.type,
        hypothesis: experiment.hypothesis,
      },
    });

    revalidatePath(`/orgs/${experiment.product.organization.slug}/products/${experiment.product.key}/experiments`);
    return { success: true, data: experiment };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating experiment:", error);
    return { success: false, error: "Failed to create experiment" };
  }
}

export async function updateExperiment(
  experimentId: string,
  organizationId: string,
  formData: FormData
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER, Role.CONTRIBUTOR]);

    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      hypothesis: formData.get("hypothesis") as string,
      type: formData.get("type") as "AB_TEST" | "MULTIVARIATE" | "FEATURE_FLAG" | "QUALITATIVE",
      status: formData.get("status") as "DRAFT" | "RUNNING" | "COMPLETED" | "CANCELLED" | "PAUSED",
      audience: formData.get("audience") as string,
      startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : undefined,
      endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : undefined,
      ownerId: formData.get("ownerId") as string || undefined,
      metrics: formData.get("metrics") ? JSON.parse(formData.get("metrics") as string) : [],
      variants: formData.get("variants") ? JSON.parse(formData.get("variants") as string) : [],
      results: formData.get("results") as string,
      conclusion: formData.get("conclusion") as string,
    };

    const validatedData = updateExperimentSchema.parse(data);

    const experiment = await db.experiment.update({
      where: { id: experimentId },
      data: {
        ...validatedData,
        metrics: validatedData.metrics,
        variants: validatedData.variants,
      },
      include: {
        owner: true,
        product: {
          include: {
            organization: true,
          },
        },
      },
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "UPDATE",
      entityType: "Experiment",
      entityId: experiment.id,
      metadata: { 
        name: experiment.name,
        status: experiment.status,
      },
    });

    revalidatePath(`/orgs/${experiment.product.organization.slug}/products/${experiment.product.key}/experiments`);
    return { success: true, data: experiment };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating experiment:", error);
    return { success: false, error: "Failed to update experiment" };
  }
}

export async function updateExperimentStatus(
  experimentId: string,
  organizationId: string,
  status: "DRAFT" | "RUNNING" | "COMPLETED" | "CANCELLED" | "PAUSED"
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER, Role.CONTRIBUTOR]);

    const updateData: any = { status };
    
    if (status === "RUNNING" && !updateData.startDate) {
      updateData.startDate = new Date();
    }
    
    if (status === "COMPLETED" && !updateData.endDate) {
      updateData.endDate = new Date();
    }

    const experiment = await db.experiment.update({
      where: { id: experimentId },
      data: updateData,
      include: {
        product: {
          include: {
            organization: true,
          },
        },
      },
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "UPDATE",
      entityType: "Experiment",
      entityId: experiment.id,
      metadata: { 
        name: experiment.name,
        status,
        action: "status_update",
      },
    });

    revalidatePath(`/orgs/${experiment.product.organization.slug}/products/${experiment.product.key}/experiments`);
    return { success: true, data: experiment };
  } catch (error) {
    console.error("Error updating experiment status:", error);
    return { success: false, error: "Failed to update experiment status" };
  }
}

export async function deleteExperiment(
  experimentId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const experiment = await db.experiment.update({
      where: { id: experimentId },
      data: { deletedAt: new Date() },
      include: {
        product: {
          include: {
            organization: true,
          },
        },
      },
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "DELETE",
      entityType: "Experiment",
      entityId: experiment.id,
      metadata: { 
        name: experiment.name,
        type: experiment.type,
      },
    });

    revalidatePath(`/orgs/${experiment.product.organization.slug}/products/${experiment.product.key}/experiments`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting experiment:", error);
    return { success: false, error: "Failed to delete experiment" };
  }
}