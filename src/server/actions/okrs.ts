"use server";

import { db } from "@/lib/db";
import { getCurrentUser, requireRole, logActivity } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { z } from "zod";

const createOKRSchema = z.object({
  objective: z.string().min(1, "Objective is required"),
  description: z.string().optional(),
  quarter: z.string().min(1, "Quarter is required"),
  year: z.number().min(2020).max(2030),
  ownerId: z.string().min(1, "Owner is required"),
  keyResults: z.array(z.object({
    description: z.string().min(1, "Key result description is required"),
    target: z.number().min(0, "Target must be positive"),
    unit: z.string().optional(),
    type: z.enum(["INCREASE", "DECREASE", "MAINTAIN", "BINARY"]).default("INCREASE"),
  })).min(1, "At least one key result is required"),
});

const updateOKRSchema = z.object({
  objective: z.string().min(1, "Objective is required"),
  description: z.string().optional(),
  quarter: z.string().min(1, "Quarter is required"),
  year: z.number().min(2020).max(2030),
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED", "ARCHIVED"]),
  progress: z.number().min(0).max(1),
  ownerId: z.string().min(1, "Owner is required"),
});

const updateKeyResultSchema = z.object({
  description: z.string().min(1, "Description is required"),
  target: z.number().min(0, "Target must be positive"),
  current: z.number().min(0, "Current value must be positive"),
  unit: z.string().optional(),
  type: z.enum(["INCREASE", "DECREASE", "MAINTAIN", "BINARY"]),
  status: z.enum(["ACTIVE", "COMPLETED", "AT_RISK", "CANCELLED"]),
});

export async function createOKR(
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
      objective: formData.get("objective") as string,
      description: formData.get("description") as string,
      quarter: formData.get("quarter") as string,
      year: parseInt(formData.get("year") as string),
      ownerId: formData.get("ownerId") as string,
      keyResults: formData.get("keyResults") ? JSON.parse(formData.get("keyResults") as string) : [],
    };

    const validatedData = createOKRSchema.parse(data);

    // Create OKR with key results in a transaction
    const okr = await db.$transaction(async (tx) => {
      const newOKR = await tx.oKR.create({
        data: {
          objective: validatedData.objective,
          description: validatedData.description,
          quarter: validatedData.quarter,
          year: validatedData.year,
          status: "ACTIVE",
          progress: 0.0,
          productId,
          ownerId: validatedData.ownerId,
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

      // Create key results
      const keyResults = await Promise.all(
        validatedData.keyResults.map(kr =>
          tx.keyResult.create({
            data: {
              description: kr.description,
              target: kr.target,
              current: 0,
              unit: kr.unit,
              type: kr.type,
              status: "ACTIVE",
              okrId: newOKR.id,
            },
          })
        )
      );

      return { ...newOKR, keyResults };
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "CREATE",
      entityType: "OKR",
      entityId: okr.id,
      metadata: { 
        objective: okr.objective,
        quarter: okr.quarter,
        year: okr.year,
        keyResultsCount: validatedData.keyResults.length,
      },
    });

    revalidatePath(`/orgs/${okr.product.organization.slug}/products/${okr.product.key}/okrs`);
    return { success: true, data: okr };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating OKR:", error);
    return { success: false, error: "Failed to create OKR" };
  }
}

export async function updateOKR(
  okrId: string,
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
      objective: formData.get("objective") as string,
      description: formData.get("description") as string,
      quarter: formData.get("quarter") as string,
      year: parseInt(formData.get("year") as string),
      status: formData.get("status") as "ACTIVE" | "COMPLETED" | "CANCELLED" | "ARCHIVED",
      progress: parseFloat(formData.get("progress") as string),
      ownerId: formData.get("ownerId") as string,
    };

    const validatedData = updateOKRSchema.parse(data);

    const okr = await db.oKR.update({
      where: { id: okrId },
      data: validatedData,
      include: {
        owner: true,
        keyResults: true,
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
      entityType: "OKR",
      entityId: okr.id,
      metadata: { 
        objective: okr.objective,
        status: okr.status,
        progress: okr.progress,
      },
    });

    revalidatePath(`/orgs/${okr.product.organization.slug}/products/${okr.product.key}/okrs`);
    return { success: true, data: okr };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating OKR:", error);
    return { success: false, error: "Failed to update OKR" };
  }
}

export async function deleteOKR(
  okrId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const okr = await db.oKR.update({
      where: { id: okrId },
      data: { deletedAt: new Date() },
      include: {
        product: {
          include: {
            organization: true,
          },
        },
      },
    });

    // Also soft delete associated key results
    await db.keyResult.updateMany({
      where: { okrId: okrId },
      data: { deletedAt: new Date() },
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "DELETE",
      entityType: "OKR",
      entityId: okr.id,
      metadata: { objective: okr.objective },
    });

    revalidatePath(`/orgs/${okr.product.organization.slug}/products/${okr.product.key}/okrs`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting OKR:", error);
    return { success: false, error: "Failed to delete OKR" };
  }
}

export async function updateKeyResult(
  keyResultId: string,
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
      description: formData.get("description") as string,
      target: parseFloat(formData.get("target") as string),
      current: parseFloat(formData.get("current") as string),
      unit: formData.get("unit") as string,
      type: formData.get("type") as "INCREASE" | "DECREASE" | "MAINTAIN" | "BINARY",
      status: formData.get("status") as "ACTIVE" | "COMPLETED" | "AT_RISK" | "CANCELLED",
    };

    const validatedData = updateKeyResultSchema.parse(data);

    const keyResult = await db.keyResult.update({
      where: { id: keyResultId },
      data: validatedData,
      include: {
        okr: {
          include: {
            product: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });

    // Recalculate OKR progress based on key results
    const allKeyResults = await db.keyResult.findMany({
      where: { 
        okrId: keyResult.okrId,
        deletedAt: null,
      },
    });

    const totalProgress = allKeyResults.reduce((sum, kr) => {
      const progress = kr.target > 0 ? Math.min(kr.current / kr.target, 1) : 0;
      return sum + progress;
    }, 0);

    const avgProgress = allKeyResults.length > 0 ? totalProgress / allKeyResults.length : 0;

    await db.oKR.update({
      where: { id: keyResult.okrId },
      data: { progress: avgProgress },
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "UPDATE",
      entityType: "KeyResult",
      entityId: keyResult.id,
      metadata: { 
        description: keyResult.description,
        current: keyResult.current,
        target: keyResult.target,
        status: keyResult.status,
      },
    });

    revalidatePath(`/orgs/${keyResult.okr.product.organization.slug}/products/${keyResult.okr.product.key}/okrs`);
    return { success: true, data: keyResult };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating key result:", error);
    return { success: false, error: "Failed to update key result" };
  }
}

export async function updateOKRProgress(
  okrId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER, Role.CONTRIBUTOR]);

    // Recalculate progress based on key results
    const keyResults = await db.keyResult.findMany({
      where: { 
        okrId,
        deletedAt: null,
      },
    });

    const totalProgress = keyResults.reduce((sum, kr) => {
      const progress = kr.target > 0 ? Math.min(kr.current / kr.target, 1) : 0;
      return sum + progress;
    }, 0);

    const avgProgress = keyResults.length > 0 ? totalProgress / keyResults.length : 0;

    const okr = await db.oKR.update({
      where: { id: okrId },
      data: { progress: avgProgress },
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
      entityType: "OKR",
      entityId: okr.id,
      metadata: { 
        objective: okr.objective,
        progress: okr.progress,
        action: "progress_update",
      },
    });

    revalidatePath(`/orgs/${okr.product.organization.slug}/products/${okr.product.key}/okrs`);
    return { success: true, data: okr };
  } catch (error) {
    console.error("Error updating OKR progress:", error);
    return { success: false, error: "Failed to update OKR progress" };
  }
}