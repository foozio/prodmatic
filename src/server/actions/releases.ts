"use server";

import { db } from "@/lib/db";
import { getCurrentUser, requireRole, logActivity } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { z } from "zod";

const createReleaseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  version: z.string().min(1, "Version is required"),
  description: z.string().optional(),
  notes: z.string().optional(),
  type: z.enum(["MAJOR", "MINOR", "PATCH", "HOTFIX"]).default("MINOR"),
  releaseDate: z.coerce.date().optional(),
  featureIds: z.array(z.string()).default([]),
});

const updateReleaseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  version: z.string().min(1, "Version is required"),
  description: z.string().optional(),
  notes: z.string().optional(),
  type: z.enum(["MAJOR", "MINOR", "PATCH", "HOTFIX"]),
  status: z.enum(["PLANNED", "IN_PROGRESS", "RELEASED", "CANCELLED"]),
  releaseDate: z.coerce.date().optional(),
  artifacts: z.array(z.string()).default([]),
});

const createChangelogSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["FEATURE", "IMPROVEMENT", "BUG_FIX", "BREAKING_CHANGE", "SECURITY", "DEPRECATED"]).default("FEATURE"),
  visibility: z.enum(["PUBLIC", "PRIVATE", "INTERNAL"]).default("PUBLIC"),
  releaseId: z.string().optional(),
});

export async function createRelease(
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
      version: formData.get("version") as string,
      description: formData.get("description") as string,
      notes: formData.get("notes") as string,
      type: formData.get("type") as "MAJOR" | "MINOR" | "PATCH" | "HOTFIX" || "MINOR",
      releaseDate: formData.get("releaseDate") ? new Date(formData.get("releaseDate") as string) : undefined,
      featureIds: formData.get("featureIds") ? JSON.parse(formData.get("featureIds") as string) : [],
    };

    const validatedData = createReleaseSchema.parse(data);

    // Create release and link features in a transaction
    const release = await db.$transaction(async (tx) => {
      const newRelease = await tx.release.create({
        data: {
          name: validatedData.name,
          version: validatedData.version,
          description: validatedData.description,
          notes: validatedData.notes,
          type: validatedData.type,
          status: "PLANNED",
          releaseDate: validatedData.releaseDate,
          artifacts: [],
          productId,
        },
        include: {
          product: {
            include: {
              organization: true,
            },
          },
        },
      });

      // Link features to the release
      if (validatedData.featureIds.length > 0) {
        await tx.feature.updateMany({
          where: { 
            id: { in: validatedData.featureIds },
            productId,
          },
          data: { releaseId: newRelease.id },
        });
      }

      return newRelease;
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "CREATE",
      entityType: "Release",
      entityId: release.id,
      metadata: { 
        name: release.name,
        version: release.version,
        type: release.type,
        featureCount: validatedData.featureIds.length,
      },
    });

    revalidatePath(`/orgs/${release.product.organization.slug}/products/${release.product.key}/releases`);
    return { success: true, data: release };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating release:", error);
    return { success: false, error: "Failed to create release" };
  }
}

export async function updateRelease(
  releaseId: string,
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
      version: formData.get("version") as string,
      description: formData.get("description") as string,
      notes: formData.get("notes") as string,
      type: formData.get("type") as "MAJOR" | "MINOR" | "PATCH" | "HOTFIX",
      status: formData.get("status") as "PLANNED" | "IN_PROGRESS" | "RELEASED" | "CANCELLED",
      releaseDate: formData.get("releaseDate") ? new Date(formData.get("releaseDate") as string) : undefined,
      artifacts: formData.get("artifacts") ? JSON.parse(formData.get("artifacts") as string) : [],
    };

    const validatedData = updateReleaseSchema.parse(data);

    const release = await db.release.update({
      where: { id: releaseId },
      data: validatedData,
      include: {
        features: true,
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
      entityType: "Release",
      entityId: release.id,
      metadata: { 
        name: release.name,
        version: release.version,
        status: release.status,
      },
    });

    revalidatePath(`/orgs/${release.product.organization.slug}/products/${release.product.key}/releases`);
    return { success: true, data: release };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating release:", error);
    return { success: false, error: "Failed to update release" };
  }
}

export async function deleteRelease(
  releaseId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const release = await db.release.update({
      where: { id: releaseId },
      data: { deletedAt: new Date() },
      include: {
        product: {
          include: {
            organization: true,
          },
        },
      },
    });

    // Unlink features from the deleted release
    await db.feature.updateMany({
      where: { releaseId: releaseId },
      data: { releaseId: null },
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "DELETE",
      entityType: "Release",
      entityId: release.id,
      metadata: { 
        name: release.name,
        version: release.version,
      },
    });

    revalidatePath(`/orgs/${release.product.organization.slug}/products/${release.product.key}/releases`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting release:", error);
    return { success: false, error: "Failed to delete release" };
  }
}

export async function deployRelease(
  releaseId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const release = await db.release.update({
      where: { id: releaseId },
      data: { 
        status: "RELEASED",
        releaseDate: new Date(),
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
      entityType: "Release",
      entityId: release.id,
      metadata: { 
        name: release.name,
        version: release.version,
        action: "deploy",
        status: "RELEASED",
      },
    });

    revalidatePath(`/orgs/${release.product.organization.slug}/products/${release.product.key}/releases`);
    return { success: true, data: release };
  } catch (error) {
    console.error("Error deploying release:", error);
    return { success: false, error: "Failed to deploy release" };
  }
}

export async function createChangelog(
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
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      type: formData.get("type") as "FEATURE" | "IMPROVEMENT" | "BUG_FIX" | "BREAKING_CHANGE" | "SECURITY" | "DEPRECATED" || "FEATURE",
      visibility: formData.get("visibility") as "PUBLIC" | "PRIVATE" | "INTERNAL" || "PUBLIC",
      releaseId: formData.get("releaseId") as string || undefined,
    };

    const validatedData = createChangelogSchema.parse(data);

    const changelog = await db.changelog.create({
      data: {
        ...validatedData,
        productId,
      },
      include: {
        release: true,
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
      entityType: "Changelog",
      entityId: changelog.id,
      metadata: { 
        title: changelog.title,
        type: changelog.type,
        visibility: changelog.visibility,
        releaseId: changelog.releaseId,
      },
    });

    revalidatePath(`/orgs/${changelog.product.organization.slug}/products/${changelog.product.key}/releases`);
    return { success: true, data: changelog };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating changelog:", error);
    return { success: false, error: "Failed to create changelog" };
  }
}

export async function updateReleaseStatus(
  releaseId: string,
  organizationId: string,
  status: "PLANNED" | "IN_PROGRESS" | "RELEASED" | "CANCELLED"
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const updateData: any = { status };
    if (status === "RELEASED") {
      updateData.releaseDate = new Date();
    }

    const release = await db.release.update({
      where: { id: releaseId },
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
      entityType: "Release",
      entityId: release.id,
      metadata: { 
        name: release.name,
        version: release.version,
        status,
        action: "status_update",
      },
    });

    revalidatePath(`/orgs/${release.product.organization.slug}/products/${release.product.key}/releases`);
    return { success: true, data: release };
  } catch (error) {
    console.error("Error updating release status:", error);
    return { success: false, error: "Failed to update release status" };
  }
}

export async function addFeatureToRelease(
  releaseId: string,
  featureId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const feature = await db.feature.update({
      where: { id: featureId },
      data: { releaseId },
      include: {
        release: true,
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
      entityType: "Feature",
      entityId: feature.id,
      metadata: { 
        title: feature.title,
        releaseId,
        releaseName: feature.release?.name,
        action: "add_to_release",
      },
    });

    revalidatePath(`/orgs/${feature.product.organization.slug}/products/${feature.product.key}/releases`);
    return { success: true, data: feature };
  } catch (error) {
    console.error("Error adding feature to release:", error);
    return { success: false, error: "Failed to add feature to release" };
  }
}