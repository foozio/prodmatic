"use server";

import { db } from "@/lib/db";
import { getCurrentUser, requireRole, logActivity } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { z } from "zod";

const createKPISchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  metric: z.string().min(1, "Metric is required"),
  target: z.number().min(0, "Target must be non-negative"),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]).default("MONTHLY"),
  ownerId: z.string().optional(),
});

const updateKPISchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  metric: z.string().min(1, "Metric is required"),
  target: z.number().min(0, "Target must be non-negative"),
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  ownerId: z.string().optional(),
  isActive: z.boolean(),
});

const recordKPIValueSchema = z.object({
  value: z.number(),
  period: z.string().min(1, "Period is required"), // e.g., "2024-01", "2024-Q1"
  notes: z.string().optional(),
});

export async function createKPI(
  productId: string,
  organizationId: string,
  formData: FormData
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      metric: formData.get("metric") as string,
      target: parseFloat(formData.get("target") as string),
      frequency: formData.get("frequency") as "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" || "MONTHLY",
      ownerId: formData.get("ownerId") as string || undefined,
    };

    const validatedData = createKPISchema.parse(data);

    const kpi = await db.kPI.create({
      data: {
        ...validatedData,
        productId,
        isActive: true,
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
      entityType: "KPI",
      entityId: kpi.id,
      metadata: { 
        name: kpi.name,
        metric: kpi.metric,
        target: kpi.target,
        frequency: kpi.frequency,
      },
    });

    revalidatePath(`/orgs/${kpi.product.organization.slug}/products/${kpi.product.key}/analytics`);
    return { success: true, data: kpi };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating KPI:", error);
    return { success: false, error: "Failed to create KPI" };
  }
}

export async function updateKPI(
  kpiId: string,
  organizationId: string,
  formData: FormData
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      metric: formData.get("metric") as string,
      target: parseFloat(formData.get("target") as string),
      frequency: formData.get("frequency") as "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY",
      ownerId: formData.get("ownerId") as string || undefined,
      isActive: formData.get("isActive") === "true",
    };

    const validatedData = updateKPISchema.parse(data);

    const kpi = await db.kPI.update({
      where: { id: kpiId },
      data: validatedData,
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
      entityType: "KPI",
      entityId: kpi.id,
      metadata: { 
        name: kpi.name,
        isActive: kpi.isActive,
      },
    });

    revalidatePath(`/orgs/${kpi.product.organization.slug}/products/${kpi.product.key}/analytics`);
    return { success: true, data: kpi };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating KPI:", error);
    return { success: false, error: "Failed to update KPI" };
  }
}

export async function deleteKPI(
  kpiId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const kpi = await db.kPI.update({
      where: { id: kpiId },
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
      entityType: "KPI",
      entityId: kpi.id,
      metadata: { 
        name: kpi.name,
        metric: kpi.metric,
      },
    });

    revalidatePath(`/orgs/${kpi.product.organization.slug}/products/${kpi.product.key}/analytics`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting KPI:", error);
    return { success: false, error: "Failed to delete KPI" };
  }
}