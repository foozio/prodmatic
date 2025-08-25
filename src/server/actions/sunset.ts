"use server";

import { db } from "@/lib/db";
import { getCurrentUser, requireRole, logActivity } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { z } from "zod";

const createSunsetPlanSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
  timeline: z.string().optional(),
  migrationPath: z.string().optional(),
  retentionPolicy: z.string().optional(),
  communicationPlan: z.string().optional(),
  eolDate: z.coerce.date().optional(),
  eoslDate: z.coerce.date().optional(),
});

const updateSunsetPlanSchema = z.object({
  reason: z.string().min(1, "Reason is required"),
  timeline: z.string().optional(),
  migrationPath: z.string().optional(),
  retentionPolicy: z.string().optional(),
  communicationPlan: z.string().optional(),
  eolDate: z.coerce.date().optional(),
  eoslDate: z.coerce.date().optional(),
  status: z.enum(["PLANNED", "ANNOUNCED", "IN_PROGRESS", "COMPLETED"]),
});

export async function createSunsetPlan(
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

    // Check if sunset plan already exists
    const existingPlan = await db.sunsetPlan.findUnique({
      where: { productId },
    });

    if (existingPlan) {
      return { success: false, error: "Sunset plan already exists for this product" };
    }

    const data = {
      reason: formData.get("reason") as string,
      timeline: formData.get("timeline") as string,
      migrationPath: formData.get("migrationPath") as string,
      retentionPolicy: formData.get("retentionPolicy") as string,
      communicationPlan: formData.get("communicationPlan") as string,
      eolDate: formData.get("eolDate") ? new Date(formData.get("eolDate") as string) : undefined,
      eoslDate: formData.get("eoslDate") ? new Date(formData.get("eoslDate") as string) : undefined,
    };

    const validatedData = createSunsetPlanSchema.parse(data);

    // Validate dates
    if (validatedData.eolDate && validatedData.eoslDate && validatedData.eolDate <= validatedData.eoslDate) {
      return { success: false, error: "End of Life date must be after End of Support Life date" };
    }

    const sunsetPlan = await db.sunsetPlan.create({
      data: {
        ...validatedData,
        productId,
        status: "PLANNED",
        timeline: validatedData.timeline ? JSON.parse(validatedData.timeline) : {},
      },
      include: {
        product: {
          include: {
            organization: true,
          },
        },
      },
    });

    // Update product lifecycle to SUNSET
    await db.product.update({
      where: { id: productId },
      data: { lifecycle: "SUNSET" },
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "CREATE",
      entityType: "SunsetPlan",
      entityId: sunsetPlan.id,
      metadata: { 
        productId,
        productName: sunsetPlan.product.name,
        reason: sunsetPlan.reason,
        eolDate: sunsetPlan.eolDate,
        eoslDate: sunsetPlan.eoslDate,
      },
    });

    revalidatePath(`/orgs/${sunsetPlan.product.organization.slug}/products/${sunsetPlan.product.key}/sunset`);
    return { success: true, data: sunsetPlan };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating sunset plan:", error);
    return { success: false, error: "Failed to create sunset plan" };
  }
}

export async function updateSunsetPlan(
  sunsetPlanId: string,
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
      reason: formData.get("reason") as string,
      timeline: formData.get("timeline") as string,
      migrationPath: formData.get("migrationPath") as string,
      retentionPolicy: formData.get("retentionPolicy") as string,
      communicationPlan: formData.get("communicationPlan") as string,
      eolDate: formData.get("eolDate") ? new Date(formData.get("eolDate") as string) : undefined,
      eoslDate: formData.get("eoslDate") ? new Date(formData.get("eoslDate") as string) : undefined,
      status: formData.get("status") as "PLANNED" | "ANNOUNCED" | "IN_PROGRESS" | "COMPLETED",
    };

    const validatedData = updateSunsetPlanSchema.parse(data);

    // Validate dates
    if (validatedData.eolDate && validatedData.eoslDate && validatedData.eolDate <= validatedData.eoslDate) {
      return { success: false, error: "End of Life date must be after End of Support Life date" };
    }

    const sunsetPlan = await db.sunsetPlan.update({
      where: { id: sunsetPlanId },
      data: {
        ...validatedData,
        timeline: validatedData.timeline ? JSON.parse(validatedData.timeline) : {},
      },
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
      entityType: "SunsetPlan",
      entityId: sunsetPlan.id,
      metadata: { 
        productId: sunsetPlan.productId,
        productName: sunsetPlan.product.name,
        status: sunsetPlan.status,
        eolDate: sunsetPlan.eolDate,
        eoslDate: sunsetPlan.eoslDate,
      },
    });

    revalidatePath(`/orgs/${sunsetPlan.product.organization.slug}/products/${sunsetPlan.product.key}/sunset`);
    return { success: true, data: sunsetPlan };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating sunset plan:", error);
    return { success: false, error: "Failed to update sunset plan" };
  }
}

export async function updateSunsetStatus(
  sunsetPlanId: string,
  organizationId: string,
  status: "PLANNED" | "ANNOUNCED" | "IN_PROGRESS" | "COMPLETED"
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const sunsetPlan = await db.sunsetPlan.update({
      where: { id: sunsetPlanId },
      data: { status },
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
      entityType: "SunsetPlan",
      entityId: sunsetPlan.id,
      metadata: { 
        productId: sunsetPlan.productId,
        productName: sunsetPlan.product.name,
        status,
        action: "status_update",
      },
    });

    revalidatePath(`/orgs/${sunsetPlan.product.organization.slug}/products/${sunsetPlan.product.key}/sunset`);
    return { success: true, data: sunsetPlan };
  } catch (error) {
    console.error("Error updating sunset status:", error);
    return { success: false, error: "Failed to update sunset status" };
  }
}

export async function deleteSunsetPlan(
  sunsetPlanId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const sunsetPlan = await db.sunsetPlan.findUnique({
      where: { id: sunsetPlanId },
      include: {
        product: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!sunsetPlan) {
      return { success: false, error: "Sunset plan not found" };
    }

    // Delete the sunset plan
    await db.sunsetPlan.delete({
      where: { id: sunsetPlanId },
    });

    // Reset product lifecycle from SUNSET
    await db.product.update({
      where: { id: sunsetPlan.productId },
      data: { lifecycle: "MATURITY" }, // Reset to previous stage
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "DELETE",
      entityType: "SunsetPlan",
      entityId: sunsetPlan.id,
      metadata: { 
        productId: sunsetPlan.productId,
        productName: sunsetPlan.product.name,
        reason: sunsetPlan.reason,
      },
    });

    revalidatePath(`/orgs/${sunsetPlan.product.organization.slug}/products/${sunsetPlan.product.key}/sunset`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting sunset plan:", error);
    return { success: false, error: "Failed to delete sunset plan" };
  }
}

export async function generateDataExport(
  productId: string,
  organizationId: string,
  exportType: "customer_data" | "product_data" | "analytics_data"
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const product = await db.product.findFirst({
      where: {
        id: productId,
        organizationId,
        deletedAt: null,
      },
      include: {
        organization: true,
      },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    // In a real implementation, this would trigger a background job
    // to generate and prepare the data export
    const exportId = `export_${Date.now()}`;

    await logActivity({
      userId: user.id,
      organizationId,
      action: "EXPORT",
      entityType: "Product",
      entityId: productId,
      metadata: { 
        productName: product.name,
        exportType,
        exportId,
        action: "data_export",
      },
    });

    // Simulate export generation (would be async in real implementation)
    return { 
      success: true, 
      data: { 
        exportId,
        status: "generating",
        message: "Data export is being generated. You will be notified when it's ready."
      }
    };
  } catch (error) {
    console.error("Error generating data export:", error);
    return { success: false, error: "Failed to generate data export" };
  }
}