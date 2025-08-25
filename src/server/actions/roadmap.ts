"use server";

import { db } from "@/lib/db";
import { getCurrentUser, requireRole, logActivity } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { z } from "zod";

const createRoadmapItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["EPIC", "FEATURE", "INITIATIVE", "MILESTONE"]).default("FEATURE"),
  lane: z.enum(["NOW", "NEXT", "LATER", "PARKED"]).default("LATER"),
  quarter: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  effort: z.number().min(0).max(100).optional(),
  confidence: z.number().min(1).max(5).optional(),
  epicId: z.string().optional(),
});

const updateRoadmapItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["EPIC", "FEATURE", "INITIATIVE", "MILESTONE"]),
  status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ON_HOLD"]),
  lane: z.enum(["NOW", "NEXT", "LATER", "PARKED"]),
  quarter: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  effort: z.number().min(0).max(100).optional(),
  confidence: z.number().min(1).max(5).optional(),
  epicId: z.string().optional(),
});

export async function createRoadmapItem(
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
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      type: formData.get("type") as "EPIC" | "FEATURE" | "INITIATIVE" | "MILESTONE" || "FEATURE",
      lane: formData.get("lane") as "NOW" | "NEXT" | "LATER" | "PARKED" || "LATER",
      quarter: formData.get("quarter") as string,
      startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : undefined,
      endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : undefined,
      effort: formData.get("effort") ? parseInt(formData.get("effort") as string) : undefined,
      confidence: formData.get("confidence") ? parseInt(formData.get("confidence") as string) : undefined,
      epicId: formData.get("epicId") as string || undefined,
    };

    const validatedData = createRoadmapItemSchema.parse(data);

    const roadmapItem = await db.roadmapItem.create({
      data: {
        ...validatedData,
        productId,
        status: "PLANNED",
      },
      include: {
        epic: true,
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
      entityType: "RoadmapItem",
      entityId: roadmapItem.id,
      metadata: { 
        title: roadmapItem.title,
        type: roadmapItem.type,
        lane: roadmapItem.lane,
        quarter: roadmapItem.quarter,
      },
    });

    revalidatePath(`/orgs/${roadmapItem.product.organization.slug}/products/${roadmapItem.product.key}/roadmap`);
    return { success: true, data: roadmapItem };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating roadmap item:", error);
    return { success: false, error: "Failed to create roadmap item" };
  }
}

export async function updateRoadmapItem(
  roadmapItemId: string,
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
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      type: formData.get("type") as "EPIC" | "FEATURE" | "INITIATIVE" | "MILESTONE",
      status: formData.get("status") as "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ON_HOLD",
      lane: formData.get("lane") as "NOW" | "NEXT" | "LATER" | "PARKED",
      quarter: formData.get("quarter") as string,
      startDate: formData.get("startDate") ? new Date(formData.get("startDate") as string) : undefined,
      endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : undefined,
      effort: formData.get("effort") ? parseInt(formData.get("effort") as string) : undefined,
      confidence: formData.get("confidence") ? parseInt(formData.get("confidence") as string) : undefined,
      epicId: formData.get("epicId") as string || undefined,
    };

    const validatedData = updateRoadmapItemSchema.parse(data);

    const roadmapItem = await db.roadmapItem.update({
      where: { id: roadmapItemId },
      data: validatedData,
      include: {
        epic: true,
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
      entityType: "RoadmapItem",
      entityId: roadmapItem.id,
      metadata: { 
        title: roadmapItem.title,
        status: roadmapItem.status,
        lane: roadmapItem.lane,
      },
    });

    revalidatePath(`/orgs/${roadmapItem.product.organization.slug}/products/${roadmapItem.product.key}/roadmap`);
    return { success: true, data: roadmapItem };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating roadmap item:", error);
    return { success: false, error: "Failed to update roadmap item" };
  }
}

export async function deleteRoadmapItem(
  roadmapItemId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const roadmapItem = await db.roadmapItem.update({
      where: { id: roadmapItemId },
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
      entityType: "RoadmapItem",
      entityId: roadmapItem.id,
      metadata: { title: roadmapItem.title },
    });

    revalidatePath(`/orgs/${roadmapItem.product.organization.slug}/products/${roadmapItem.product.key}/roadmap`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting roadmap item:", error);
    return { success: false, error: "Failed to delete roadmap item" };
  }
}

export async function moveRoadmapItem(
  roadmapItemId: string,
  organizationId: string,
  lane: "NOW" | "NEXT" | "LATER" | "PARKED",
  quarter?: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const updateData: any = { lane };
    if (quarter !== undefined) {
      updateData.quarter = quarter || null;
    }

    const roadmapItem = await db.roadmapItem.update({
      where: { id: roadmapItemId },
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
      entityType: "RoadmapItem",
      entityId: roadmapItem.id,
      metadata: { 
        title: roadmapItem.title,
        lane,
        quarter,
        action: "move",
      },
    });

    revalidatePath(`/orgs/${roadmapItem.product.organization.slug}/products/${roadmapItem.product.key}/roadmap`);
    return { success: true, data: roadmapItem };
  } catch (error) {
    console.error("Error moving roadmap item:", error);
    return { success: false, error: "Failed to move roadmap item" };
  }
}

export async function updateRoadmapItemStatus(
  roadmapItemId: string,
  organizationId: string,
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ON_HOLD"
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const roadmapItem = await db.roadmapItem.update({
      where: { id: roadmapItemId },
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
      entityType: "RoadmapItem",
      entityId: roadmapItem.id,
      metadata: { 
        title: roadmapItem.title,
        status,
        action: "status_update",
      },
    });

    revalidatePath(`/orgs/${roadmapItem.product.organization.slug}/products/${roadmapItem.product.key}/roadmap`);
    return { success: true, data: roadmapItem };
  } catch (error) {
    console.error("Error updating roadmap item status:", error);
    return { success: false, error: "Failed to update roadmap item status" };
  }
}

export async function bulkUpdateRoadmapItems(
  roadmapItemIds: string[],
  organizationId: string,
  updates: {
    status?: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "ON_HOLD";
    lane?: "NOW" | "NEXT" | "LATER" | "PARKED";
    quarter?: string | null;
  }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const updateData: any = {};
    if (updates.status) updateData.status = updates.status;
    if (updates.lane) updateData.lane = updates.lane;
    if (updates.quarter !== undefined) updateData.quarter = updates.quarter;

    const roadmapItems = await db.roadmapItem.updateMany({
      where: { 
        id: { in: roadmapItemIds },
        deletedAt: null,
      },
      data: updateData,
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "BULK_UPDATE",
      entityType: "RoadmapItem",
      entityId: roadmapItemIds.join(","),
      metadata: { 
        itemCount: roadmapItemIds.length,
        updates,
      },
    });

    // Note: revalidatePath would need the specific product path, 
    // but for bulk operations we'll revalidate a general path
    revalidatePath(`/orgs/${organizationId}/products`);
    return { success: true, data: { count: roadmapItems.count } };
  } catch (error) {
    console.error("Error bulk updating roadmap items:", error);
    return { success: false, error: "Failed to bulk update roadmap items" };
  }
}