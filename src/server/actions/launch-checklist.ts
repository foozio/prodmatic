"use server";

import { db } from "@/lib/db";
import { getCurrentUser, requireRole, logActivity } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { z } from "zod";

const createChecklistItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(["PREPARATION", "TESTING", "DEPLOYMENT", "MONITORING", "COMMUNICATION", "ROLLBACK"]).default("PREPARATION"),
  isRequired: z.boolean().default(false),
  assigneeId: z.string().optional(),
  dueDate: z.coerce.date().optional(),
});

const updateChecklistItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.enum(["PREPARATION", "TESTING", "DEPLOYMENT", "MONITORING", "COMMUNICATION", "ROLLBACK"]),
  isRequired: z.boolean(),
  isCompleted: z.boolean(),
  assigneeId: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
});

export async function createChecklistItem(
  releaseId: string,
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
      category: formData.get("category") as "PREPARATION" | "TESTING" | "DEPLOYMENT" | "MONITORING" | "COMMUNICATION" | "ROLLBACK" || "PREPARATION",
      isRequired: formData.get("isRequired") === "true",
      assigneeId: formData.get("assigneeId") as string || undefined,
      dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : undefined,
    };

    const validatedData = createChecklistItemSchema.parse(data);

    const checklistItem = await db.launchChecklistItem.create({
      data: {
        ...validatedData,
        releaseId,
        isCompleted: false,
      },
      include: {
        assignee: true,
        release: {
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

    await logActivity({
      userId: user.id,
      organizationId,
      action: "CREATE",
      entityType: "LaunchChecklistItem",
      entityId: checklistItem.id,
      metadata: { 
        title: checklistItem.title,
        category: checklistItem.category,
        releaseId,
        releaseName: checklistItem.release.name,
      },
    });

    revalidatePath(`/orgs/${checklistItem.release.product.organization.slug}/products/${checklistItem.release.product.key}/releases/${releaseId}/checklist`);
    return { success: true, data: checklistItem };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating checklist item:", error);
    return { success: false, error: "Failed to create checklist item" };
  }
}

export async function updateChecklistItem(
  checklistItemId: string,
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
      category: formData.get("category") as "PREPARATION" | "TESTING" | "DEPLOYMENT" | "MONITORING" | "COMMUNICATION" | "ROLLBACK",
      isRequired: formData.get("isRequired") === "true",
      isCompleted: formData.get("isCompleted") === "true",
      assigneeId: formData.get("assigneeId") as string || undefined,
      dueDate: formData.get("dueDate") ? new Date(formData.get("dueDate") as string) : undefined,
      completedAt: formData.get("isCompleted") === "true" ? new Date() : undefined,
    };

    const validatedData = updateChecklistItemSchema.parse(data);

    const checklistItem = await db.launchChecklistItem.update({
      where: { id: checklistItemId },
      data: validatedData,
      include: {
        assignee: true,
        release: {
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

    await logActivity({
      userId: user.id,
      organizationId,
      action: "UPDATE",
      entityType: "LaunchChecklistItem",
      entityId: checklistItem.id,
      metadata: { 
        title: checklistItem.title,
        isCompleted: checklistItem.isCompleted,
        category: checklistItem.category,
      },
    });

    revalidatePath(`/orgs/${checklistItem.release.product.organization.slug}/products/${checklistItem.release.product.key}/releases/${checklistItem.releaseId}/checklist`);
    return { success: true, data: checklistItem };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating checklist item:", error);
    return { success: false, error: "Failed to update checklist item" };
  }
}

export async function toggleChecklistItem(
  checklistItemId: string,
  organizationId: string,
  isCompleted: boolean
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER, Role.CONTRIBUTOR]);

    const updateData: any = { 
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
    };

    const checklistItem = await db.launchChecklistItem.update({
      where: { id: checklistItemId },
      data: updateData,
      include: {
        release: {
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

    await logActivity({
      userId: user.id,
      organizationId,
      action: "UPDATE",
      entityType: "LaunchChecklistItem",
      entityId: checklistItem.id,
      metadata: { 
        title: checklistItem.title,
        isCompleted,
        action: "toggle_completion",
      },
    });

    revalidatePath(`/orgs/${checklistItem.release.product.organization.slug}/products/${checklistItem.release.product.key}/releases/${checklistItem.releaseId}/checklist`);
    return { success: true, data: checklistItem };
  } catch (error) {
    console.error("Error toggling checklist item:", error);
    return { success: false, error: "Failed to update checklist item" };
  }
}

export async function deleteChecklistItem(
  checklistItemId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const checklistItem = await db.launchChecklistItem.update({
      where: { id: checklistItemId },
      data: { deletedAt: new Date() },
      include: {
        release: {
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

    await logActivity({
      userId: user.id,
      organizationId,
      action: "DELETE",
      entityType: "LaunchChecklistItem",
      entityId: checklistItem.id,
      metadata: { 
        title: checklistItem.title,
        category: checklistItem.category,
      },
    });

    revalidatePath(`/orgs/${checklistItem.release.product.organization.slug}/products/${checklistItem.release.product.key}/releases/${checklistItem.releaseId}/checklist`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting checklist item:", error);
    return { success: false, error: "Failed to delete checklist item" };
  }
}

export async function bulkCreateChecklistItems(
  releaseId: string,
  organizationId: string,
  templateType: "BASIC" | "COMPREHENSIVE" | "ENTERPRISE"
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const templates = {
      BASIC: [
        { title: "Code review completed", category: "PREPARATION", isRequired: true },
        { title: "Unit tests passing", category: "TESTING", isRequired: true },
        { title: "Integration tests passing", category: "TESTING", isRequired: true },
        { title: "Production deployment completed", category: "DEPLOYMENT", isRequired: true },
        { title: "Health checks passing", category: "MONITORING", isRequired: true },
        { title: "Release notes published", category: "COMMUNICATION", isRequired: false },
        { title: "Team notified of release", category: "COMMUNICATION", isRequired: false },
        { title: "Rollback plan prepared", category: "ROLLBACK", isRequired: true },
      ],
      COMPREHENSIVE: [
        { title: "Code review completed", category: "PREPARATION", isRequired: true },
        { title: "Security review completed", category: "PREPARATION", isRequired: true },
        { title: "Database migrations tested", category: "PREPARATION", isRequired: true },
        { title: "Feature flags configured", category: "PREPARATION", isRequired: false },
        { title: "Unit tests passing (95%+ coverage)", category: "TESTING", isRequired: true },
        { title: "Integration tests passing", category: "TESTING", isRequired: true },
        { title: "End-to-end tests passing", category: "TESTING", isRequired: true },
        { title: "Performance tests completed", category: "TESTING", isRequired: false },
        { title: "Staging deployment successful", category: "DEPLOYMENT", isRequired: true },
        { title: "Production deployment completed", category: "DEPLOYMENT", isRequired: true },
        { title: "Load balancer configuration updated", category: "DEPLOYMENT", isRequired: false },
        { title: "Application health checks passing", category: "MONITORING", isRequired: true },
        { title: "Error monitoring configured", category: "MONITORING", isRequired: true },
        { title: "Performance monitoring active", category: "MONITORING", isRequired: false },
        { title: "Release notes published", category: "COMMUNICATION", isRequired: true },
        { title: "Customer support team briefed", category: "COMMUNICATION", isRequired: true },
        { title: "Marketing team notified", category: "COMMUNICATION", isRequired: false },
        { title: "Rollback procedure documented", category: "ROLLBACK", isRequired: true },
        { title: "Database rollback tested", category: "ROLLBACK", isRequired: true },
      ],
      ENTERPRISE: [
        { title: "Code review completed by lead developer", category: "PREPARATION", isRequired: true },
        { title: "Security review by security team", category: "PREPARATION", isRequired: true },
        { title: "Architecture review completed", category: "PREPARATION", isRequired: true },
        { title: "Database migrations tested in staging", category: "PREPARATION", isRequired: true },
        { title: "Feature flags and toggles configured", category: "PREPARATION", isRequired: true },
        { title: "Dependency security scan completed", category: "PREPARATION", isRequired: true },
        { title: "Unit tests passing (98%+ coverage)", category: "TESTING", isRequired: true },
        { title: "Integration tests passing", category: "TESTING", isRequired: true },
        { title: "End-to-end tests passing", category: "TESTING", isRequired: true },
        { title: "Performance tests meet SLA requirements", category: "TESTING", isRequired: true },
        { title: "Security penetration testing completed", category: "TESTING", isRequired: true },
        { title: "Accessibility testing completed", category: "TESTING", isRequired: true },
        { title: "Staging deployment successful", category: "DEPLOYMENT", isRequired: true },
        { title: "Blue-green deployment strategy executed", category: "DEPLOYMENT", isRequired: true },
        { title: "Production deployment completed", category: "DEPLOYMENT", isRequired: true },
        { title: "CDN cache invalidation completed", category: "DEPLOYMENT", isRequired: false },
        { title: "Application health checks passing", category: "MONITORING", isRequired: true },
        { title: "Error monitoring and alerting active", category: "MONITORING", isRequired: true },
        { title: "Performance monitoring and dashboards active", category: "MONITORING", isRequired: true },
        { title: "Security monitoring configured", category: "MONITORING", isRequired: true },
        { title: "Business metrics tracking active", category: "MONITORING", isRequired: false },
        { title: "Release notes published", category: "COMMUNICATION", isRequired: true },
        { title: "Customer support team trained and briefed", category: "COMMUNICATION", isRequired: true },
        { title: "Sales team notified of new features", category: "COMMUNICATION", isRequired: true },
        { title: "Marketing team provided with launch materials", category: "COMMUNICATION", isRequired: true },
        { title: "Executive stakeholders informed", category: "COMMUNICATION", isRequired: true },
        { title: "Customer communication plan executed", category: "COMMUNICATION", isRequired: false },
        { title: "Comprehensive rollback procedure documented", category: "ROLLBACK", isRequired: true },
        { title: "Database rollback tested and verified", category: "ROLLBACK", isRequired: true },
        { title: "Infrastructure rollback plan prepared", category: "ROLLBACK", isRequired: true },
        { title: "Emergency contact list updated", category: "ROLLBACK", isRequired: true },
      ],
    };

    const items = templates[templateType] || templates.BASIC;

    const checklistItems = await Promise.all(
      items.map((item) =>
        db.launchChecklistItem.create({
          data: {
            ...item,
            releaseId,
            isCompleted: false,
          },
        })
      )
    );

    await logActivity({
      userId: user.id,
      organizationId,
      action: "BULK_CREATE",
      entityType: "LaunchChecklistItem",
      entityId: releaseId,
      metadata: { 
        templateType,
        itemCount: checklistItems.length,
        releaseId,
      },
    });

    // Get release info for revalidation
    const release = await db.release.findUnique({
      where: { id: releaseId },
      include: {
        product: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (release) {
      revalidatePath(`/orgs/${release.product.organization.slug}/products/${release.product.key}/releases/${releaseId}/checklist`);
    }

    return { success: true, data: { count: checklistItems.length } };
  } catch (error) {
    console.error("Error creating checklist items:", error);
    return { success: false, error: "Failed to create checklist items" };
  }
}