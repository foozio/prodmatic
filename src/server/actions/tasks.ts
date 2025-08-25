"use server";

import { db } from "@/lib/db";
import { getCurrentUser, requireRole, logActivity } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["STORY", "BUG", "TASK", "EPIC", "SPIKE"]).default("STORY"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  effort: z.number().min(0).max(100).optional(),
  timeEstimate: z.number().min(0).optional(),
  featureId: z.string().optional(),
  assigneeId: z.string().optional(),
  sprintId: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["STORY", "BUG", "TASK", "EPIC", "SPIKE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  status: z.enum(["NEW", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"]),
  effort: z.number().min(0).max(100).optional(),
  timeEstimate: z.number().min(0).optional(),
  timeSpent: z.number().min(0).optional(),
  featureId: z.string().optional(),
  assigneeId: z.string().optional(),
  sprintId: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
});

export async function createTask(
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
      type: formData.get("type") as "STORY" | "BUG" | "TASK" | "EPIC" | "SPIKE" || "STORY",
      priority: formData.get("priority") as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" || "MEDIUM",
      effort: formData.get("effort") ? parseInt(formData.get("effort") as string) : undefined,
      timeEstimate: formData.get("timeEstimate") ? parseInt(formData.get("timeEstimate") as string) : undefined,
      featureId: formData.get("featureId") as string || undefined,
      assigneeId: formData.get("assigneeId") as string || undefined,
      sprintId: formData.get("sprintId") as string || undefined,
      acceptanceCriteria: formData.get("acceptanceCriteria") as string,
    };

    const validatedData = createTaskSchema.parse(data);

    const task = await db.task.create({
      data: {
        ...validatedData,
        productId,
        status: "NEW",
      },
      include: {
        assignee: true,
        feature: true,
        sprint: true,
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
      entityType: "Task",
      entityId: task.id,
      metadata: { 
        title: task.title,
        type: task.type,
        priority: task.priority,
        sprintId: task.sprintId,
      },
    });

    revalidatePath(`/orgs/${task.product.organization.slug}/products/${task.product.key}/sprints`);
    return { success: true, data: task };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating task:", error);
    return { success: false, error: "Failed to create task" };
  }
}

export async function updateTask(
  taskId: string,
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
      type: formData.get("type") as "STORY" | "BUG" | "TASK" | "EPIC" | "SPIKE",
      priority: formData.get("priority") as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      status: formData.get("status") as "NEW" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED",
      effort: formData.get("effort") ? parseInt(formData.get("effort") as string) : undefined,
      timeEstimate: formData.get("timeEstimate") ? parseInt(formData.get("timeEstimate") as string) : undefined,
      timeSpent: formData.get("timeSpent") ? parseInt(formData.get("timeSpent") as string) : undefined,
      featureId: formData.get("featureId") as string || undefined,
      assigneeId: formData.get("assigneeId") as string || undefined,
      sprintId: formData.get("sprintId") as string || undefined,
      acceptanceCriteria: formData.get("acceptanceCriteria") as string,
    };

    const validatedData = updateTaskSchema.parse(data);

    const task = await db.task.update({
      where: { id: taskId },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        priority: validatedData.priority,
        status: validatedData.status,
        effort: validatedData.effort,
        timeEstimate: validatedData.timeEstimate,
        timeSpent: validatedData.timeSpent,
        featureId: validatedData.featureId,
        assigneeId: validatedData.assigneeId,
        sprintId: validatedData.sprintId,
      },
      include: {
        assignee: true,
        feature: true,
        sprint: true,
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
      entityType: "Task",
      entityId: task.id,
      metadata: { 
        title: task.title,
        status: task.status,
        priority: task.priority,
      },
    });

    revalidatePath(`/orgs/${task.product.organization.slug}/products/${task.product.key}/sprints`);
    return { success: true, data: task };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating task:", error);
    return { success: false, error: "Failed to update task" };
  }
}

export async function updateTaskStatus(
  taskId: string,
  organizationId: string,
  status: "NEW" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED"
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER, Role.CONTRIBUTOR]);

    const task = await db.task.update({
      where: { id: taskId },
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
      entityType: "Task",
      entityId: task.id,
      metadata: { 
        title: task.title,
        status,
        action: "status_update",
      },
    });

    revalidatePath(`/orgs/${task.product.organization.slug}/products/${task.product.key}/sprints`);
    return { success: true, data: task };
  } catch (error) {
    console.error("Error updating task status:", error);
    return { success: false, error: "Failed to update task status" };
  }
}

export async function updateTaskAssignee(
  taskId: string,
  organizationId: string,
  assigneeId: string | null
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER, Role.CONTRIBUTOR]);

    const task = await db.task.update({
      where: { id: taskId },
      data: { assigneeId },
      include: {
        assignee: true,
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
      entityType: "Task",
      entityId: task.id,
      metadata: { 
        title: task.title,
        assigneeId,
        assigneeName: task.assignee?.name,
        action: "assignee_update",
      },
    });

    revalidatePath(`/orgs/${task.product.organization.slug}/products/${task.product.key}/sprints`);
    return { success: true, data: task };
  } catch (error) {
    console.error("Error updating task assignee:", error);
    return { success: false, error: "Failed to update task assignee" };
  }
}

export async function deleteTask(
  taskId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const task = await db.task.update({
      where: { id: taskId },
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
      entityType: "Task",
      entityId: task.id,
      metadata: { title: task.title },
    });

    revalidatePath(`/orgs/${task.product.organization.slug}/products/${task.product.key}/sprints`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting task:", error);
    return { success: false, error: "Failed to delete task" };
  }
}

export async function moveTaskToSprint(
  taskId: string,
  organizationId: string,
  sprintId: string | null
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER, Role.CONTRIBUTOR]);

    const task = await db.task.update({
      where: { id: taskId },
      data: { sprintId },
      include: {
        sprint: true,
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
      entityType: "Task",
      entityId: task.id,
      metadata: { 
        title: task.title,
        sprintId,
        sprintName: task.sprint?.name,
        action: "sprint_assignment",
      },
    });

    revalidatePath(`/orgs/${task.product.organization.slug}/products/${task.product.key}/sprints`);
    return { success: true, data: task };
  } catch (error) {
    console.error("Error moving task to sprint:", error);
    return { success: false, error: "Failed to move task to sprint" };
  }
}

export async function updateTaskTime(
  taskId: string,
  organizationId: string,
  timeSpent: number
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER, Role.CONTRIBUTOR]);

    const task = await db.task.update({
      where: { id: taskId },
      data: { timeSpent },
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
      entityType: "Task",
      entityId: task.id,
      metadata: { 
        title: task.title,
        timeSpent,
        action: "time_tracking",
      },
    });

    revalidatePath(`/orgs/${task.product.organization.slug}/products/${task.product.key}/sprints`);
    return { success: true, data: task };
  } catch (error) {
    console.error("Error updating task time:", error);
    return { success: false, error: "Failed to update task time" };
  }
}

export async function bulkUpdateTasks(
  taskIds: string[],
  organizationId: string,
  updates: {
    status?: "NEW" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "CANCELLED";
    assigneeId?: string | null;
    sprintId?: string | null;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
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
    if (updates.priority) updateData.priority = updates.priority;
    if (updates.assigneeId !== undefined) updateData.assigneeId = updates.assigneeId;
    if (updates.sprintId !== undefined) updateData.sprintId = updates.sprintId;

    const tasks = await db.task.updateMany({
      where: { 
        id: { in: taskIds },
        deletedAt: null,
      },
      data: updateData,
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "BULK_UPDATE",
      entityType: "Task",
      entityId: taskIds.join(","),
      metadata: { 
        taskCount: taskIds.length,
        updates,
      },
    });

    // Note: revalidatePath would need the specific product path, 
    // but for bulk operations we'll revalidate a general path
    revalidatePath(`/orgs/${organizationId}/products`);
    return { success: true, data: { count: tasks.count } };
  } catch (error) {
    console.error("Error bulk updating tasks:", error);
    return { success: false, error: "Failed to bulk update tasks" };
  }
}