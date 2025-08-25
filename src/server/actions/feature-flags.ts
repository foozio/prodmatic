"use server";

import { db } from "@/lib/db";
import { getCurrentUser, requireRole, logActivity } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { z } from "zod";

const createFeatureFlagSchema = z.object({
  name: z.string().min(1, "Name is required"),
  key: z.string().min(1, "Key is required").regex(/^[a-zA-Z0-9_-]+$/, "Key must contain only alphanumeric characters, hyphens, and underscores"),
  description: z.string().optional(),
  enabled: z.boolean().default(false),
  rollout: z.number().min(0).max(1).default(0),
  targeting: z.string().optional(),
  variants: z.string().optional(),
  featureId: z.string().optional(),
});

const updateFeatureFlagSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  enabled: z.boolean(),
  rollout: z.number().min(0).max(1),
  targeting: z.string().optional(),
  variants: z.string().optional(),
  featureId: z.string().optional(),
});

export async function createFeatureFlag(
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
      key: formData.get("key") as string,
      description: formData.get("description") as string,
      enabled: formData.get("enabled") === "true",
      rollout: parseFloat(formData.get("rollout") as string) || 0,
      targeting: formData.get("targeting") as string,
      variants: formData.get("variants") as string,
      featureId: formData.get("featureId") as string || undefined,
    };

    const validatedData = createFeatureFlagSchema.parse(data);

    // Check if key already exists
    const existingFlag = await db.featureFlag.findFirst({
      where: {
        key: validatedData.key,
        deletedAt: null,
      },
    });

    if (existingFlag) {
      return { success: false, error: "A feature flag with this key already exists" };
    }

    const featureFlag = await db.featureFlag.create({
      data: {
        ...validatedData,
        productId,
        targeting: validatedData.targeting ? JSON.parse(validatedData.targeting) : {},
        variants: validatedData.variants ? JSON.parse(validatedData.variants) : {},
      },
      include: {
        feature: true,
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
      entityType: "FeatureFlag",
      entityId: featureFlag.id,
      metadata: { 
        name: featureFlag.name,
        key: featureFlag.key,
        enabled: featureFlag.enabled,
        rollout: featureFlag.rollout,
      },
    });

    revalidatePath(`/orgs/${featureFlag.product.organization.slug}/products/${featureFlag.product.key}/analytics/flags`);
    return { success: true, data: featureFlag };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating feature flag:", error);
    return { success: false, error: "Failed to create feature flag" };
  }
}

export async function updateFeatureFlag(
  flagId: string,
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
      enabled: formData.get("enabled") === "true",
      rollout: parseFloat(formData.get("rollout") as string),
      targeting: formData.get("targeting") as string,
      variants: formData.get("variants") as string,
      featureId: formData.get("featureId") as string || undefined,
    };

    const validatedData = updateFeatureFlagSchema.parse(data);

    const featureFlag = await db.featureFlag.update({
      where: { id: flagId },
      data: {
        ...validatedData,
        targeting: validatedData.targeting ? JSON.parse(validatedData.targeting) : {},
        variants: validatedData.variants ? JSON.parse(validatedData.variants) : {},
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
      entityType: "FeatureFlag",
      entityId: featureFlag.id,
      metadata: { 
        name: featureFlag.name,
        enabled: featureFlag.enabled,
        rollout: featureFlag.rollout,
      },
    });

    revalidatePath(`/orgs/${featureFlag.product.organization.slug}/products/${featureFlag.product.key}/analytics/flags`);
    return { success: true, data: featureFlag };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating feature flag:", error);
    return { success: false, error: "Failed to update feature flag" };
  }
}

export async function toggleFeatureFlag(
  flagId: string,
  organizationId: string,
  enabled: boolean
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER, Role.CONTRIBUTOR]);

    const featureFlag = await db.featureFlag.update({
      where: { id: flagId },
      data: { enabled },
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
      entityType: "FeatureFlag",
      entityId: featureFlag.id,
      metadata: { 
        name: featureFlag.name,
        enabled,
        action: "toggle",
      },
    });

    revalidatePath(`/orgs/${featureFlag.product.organization.slug}/products/${featureFlag.product.key}/analytics/flags`);
    return { success: true, data: featureFlag };
  } catch (error) {
    console.error("Error toggling feature flag:", error);
    return { success: false, error: "Failed to toggle feature flag" };
  }
}

export async function updateFeatureFlagRollout(
  flagId: string,
  organizationId: string,
  rollout: number
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER, Role.CONTRIBUTOR]);

    if (rollout < 0 || rollout > 1) {
      return { success: false, error: "Rollout must be between 0 and 1" };
    }

    const featureFlag = await db.featureFlag.update({
      where: { id: flagId },
      data: { rollout },
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
      entityType: "FeatureFlag",
      entityId: featureFlag.id,
      metadata: { 
        name: featureFlag.name,
        rollout,
        action: "rollout_update",
      },
    });

    revalidatePath(`/orgs/${featureFlag.product.organization.slug}/products/${featureFlag.product.key}/analytics/flags`);
    return { success: true, data: featureFlag };
  } catch (error) {
    console.error("Error updating feature flag rollout:", error);
    return { success: false, error: "Failed to update rollout" };
  }
}

export async function deleteFeatureFlag(
  flagId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const featureFlag = await db.featureFlag.update({
      where: { id: flagId },
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
      entityType: "FeatureFlag",
      entityId: featureFlag.id,
      metadata: { 
        name: featureFlag.name,
        key: featureFlag.key,
      },
    });

    revalidatePath(`/orgs/${featureFlag.product.organization.slug}/products/${featureFlag.product.key}/analytics/flags`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting feature flag:", error);
    return { success: false, error: "Failed to delete feature flag" };
  }
}