"use server";

import { db } from "@/lib/db";
import { getCurrentUser, requireRole, logActivity } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { z } from "zod";

const createSprintSchema = z.object({
  name: z.string().min(1, "Sprint name is required"),
  goal: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  capacity: z.number().min(0).optional(),
});

const updateSprintSchema = z.object({
  name: z.string().min(1, "Sprint name is required"),
  goal: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  capacity: z.number().min(0).optional(),
  status: z.enum(["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  velocity: z.number().min(0).optional(),
});

export async function createSprint(
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
      goal: formData.get("goal") as string,
      startDate: new Date(formData.get("startDate") as string),
      endDate: new Date(formData.get("endDate") as string),
      capacity: parseInt(formData.get("capacity") as string) || undefined,
    };

    const validatedData = createSprintSchema.parse(data);

    // Validate date range
    if (validatedData.endDate <= validatedData.startDate) {
      return { success: false, error: "End date must be after start date" };
    }

    // Check for overlapping active sprints
    const activeSprint = await db.sprint.findFirst({
      where: {
        productId,
        status: "ACTIVE",
        deletedAt: null,
      },
    });

    if (activeSprint) {
      return { success: false, error: "There is already an active sprint. Complete or cancel it before creating a new one." };
    }

    const sprint = await db.sprint.create({
      data: {
        ...validatedData,
        productId,
        status: "PLANNED",
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
      action: "CREATE",
      entityType: "Sprint",
      entityId: sprint.id,
      metadata: { 
        name: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        capacity: sprint.capacity,
      },
    });

    revalidatePath(`/orgs/${sprint.product.organization.slug}/products/${sprint.product.key}/sprints`);
    return { success: true, data: sprint };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating sprint:", error);
    return { success: false, error: "Failed to create sprint" };
  }
}

export async function updateSprint(
  sprintId: string,
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
      goal: formData.get("goal") as string,
      startDate: new Date(formData.get("startDate") as string),
      endDate: new Date(formData.get("endDate") as string),
      capacity: parseInt(formData.get("capacity") as string) || undefined,
      status: formData.get("status") as any,
      velocity: parseInt(formData.get("velocity") as string) || undefined,
    };

    const validatedData = updateSprintSchema.parse(data);

    // Validate date range
    if (validatedData.endDate <= validatedData.startDate) {
      return { success: false, error: "End date must be after start date" };
    }

    const sprint = await db.sprint.update({
      where: { id: sprintId },
      data: validatedData,
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
      entityType: "Sprint",
      entityId: sprint.id,
      metadata: { 
        name: sprint.name,
        status: sprint.status,
        velocity: sprint.velocity,
      },
    });

    revalidatePath(`/orgs/${sprint.product.organization.slug}/products/${sprint.product.key}/sprints`);
    return { success: true, data: sprint };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating sprint:", error);
    return { success: false, error: "Failed to update sprint" };
  }
}

export async function startSprint(
  sprintId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const sprint = await db.sprint.findUnique({
      where: { id: sprintId },
      include: {
        product: {
          include: {
            organization: true,
          },
        },
        tasks: true,
      },
    });

    if (!sprint) {
      return { success: false, error: "Sprint not found" };
    }

    if (sprint.status !== "PLANNED") {
      return { success: false, error: "Only planned sprints can be started" };
    }

    // Check for existing active sprint
    const activeSprint = await db.sprint.findFirst({
      where: {
        productId: sprint.productId,
        status: "ACTIVE",
        deletedAt: null,
        id: { not: sprintId },
      },
    });

    if (activeSprint) {
      return { success: false, error: "There is already an active sprint. Complete or cancel it first." };
    }

    if (sprint.tasks.length === 0) {
      return { success: false, error: "Cannot start sprint without tasks. Add tasks to the sprint first." };
    }

    const updatedSprint = await db.sprint.update({
      where: { id: sprintId },
      data: { status: "ACTIVE" },
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
      action: "START",
      entityType: "Sprint",
      entityId: sprint.id,
      metadata: { 
        name: sprint.name,
        taskCount: sprint.tasks.length,
      },
    });

    revalidatePath(`/orgs/${updatedSprint.product.organization.slug}/products/${updatedSprint.product.key}/sprints`);
    return { success: true, data: updatedSprint };
  } catch (error) {
    console.error("Error starting sprint:", error);
    return { success: false, error: "Failed to start sprint" };
  }
}

export async function completeSprint(
  sprintId: string,
  organizationId: string,
  formData: FormData
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const sprint = await db.sprint.findUnique({
      where: { id: sprintId },
      include: {
        product: {
          include: {
            organization: true,
          },
        },
        tasks: true,
      },
    });

    if (!sprint) {
      return { success: false, error: "Sprint not found" };
    }

    if (sprint.status !== "ACTIVE") {
      return { success: false, error: "Only active sprints can be completed" };
    }

    // Calculate velocity based on completed tasks
    const completedTasks = sprint.tasks.filter(t => t.status === "DONE");
    const velocity = completedTasks.reduce((acc, task) => acc + (task.effort || 0), 0);

    // Handle incomplete tasks
    const incompleteTaskAction = formData.get("incompleteTaskAction") as string;
    const incompleTasks = sprint.tasks.filter(t => t.status !== "DONE");

    if (incompleteTaskAction === "move_to_backlog" && incompleTasks.length > 0) {
      // Move incomplete tasks back to backlog
      await db.task.updateMany({
        where: {
          id: { in: incompleTasks.map(t => t.id) },
        },
        data: {
          sprintId: null,
        },
      });
    }

    const updatedSprint = await db.sprint.update({
      where: { id: sprintId },
      data: { 
        status: "COMPLETED",
        velocity,
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
      action: "COMPLETE",
      entityType: "Sprint",
      entityId: sprint.id,
      metadata: { 
        name: sprint.name,
        velocity,
        completedTasks: completedTasks.length,
        totalTasks: sprint.tasks.length,
        incompleteTaskAction,
      },
    });

    revalidatePath(`/orgs/${updatedSprint.product.organization.slug}/products/${updatedSprint.product.key}/sprints`);
    return { success: true, data: updatedSprint };
  } catch (error) {
    console.error("Error completing sprint:", error);
    return { success: false, error: "Failed to complete sprint" };
  }
}

export async function addTasksToSprint(
  sprintId: string,
  organizationId: string,
  taskIds: string[]
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER, Role.CONTRIBUTOR]);

    const sprint = await db.sprint.findUnique({
      where: { id: sprintId },
      include: {
        product: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!sprint) {
      return { success: false, error: "Sprint not found" };
    }

    if (sprint.status === "COMPLETED" || sprint.status === "CANCELLED") {
      return { success: false, error: "Cannot add tasks to completed or cancelled sprint" };
    }

    // Validate all tasks exist and belong to the same product
    const tasks = await db.task.findMany({
      where: {
        id: { in: taskIds },
        productId: sprint.productId,
        deletedAt: null,
      },
    });

    if (tasks.length !== taskIds.length) {
      return { success: false, error: "Some tasks not found or don't belong to this product" };
    }

    // Add tasks to sprint
    await db.task.updateMany({
      where: {
        id: { in: taskIds },
      },
      data: {
        sprintId,
      },
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "ADD_TASKS",
      entityType: "Sprint",
      entityId: sprint.id,
      metadata: { 
        name: sprint.name,
        taskCount: taskIds.length,
        taskIds,
      },
    });

    revalidatePath(`/orgs/${sprint.product.organization.slug}/products/${sprint.product.key}/sprints`);
    return { success: true, data: { sprint, addedTasks: tasks } };
  } catch (error) {
    console.error("Error adding tasks to sprint:", error);
    return { success: false, error: "Failed to add tasks to sprint" };
  }
}

export async function removeTaskFromSprint(
  taskId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER, Role.CONTRIBUTOR]);

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        sprint: {
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

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    if (!task.sprint) {
      return { success: false, error: "Task is not assigned to any sprint" };
    }

    if (task.sprint.status === "COMPLETED") {
      return { success: false, error: "Cannot remove tasks from completed sprint" };
    }

    await db.task.update({
      where: { id: taskId },
      data: { sprintId: null },
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "REMOVE_TASK",
      entityType: "Sprint",
      entityId: task.sprint.id,
      metadata: { 
        sprintName: task.sprint.name,
        taskTitle: task.title,
        taskId,
      },
    });

    revalidatePath(`/orgs/${task.sprint.product.organization.slug}/products/${task.sprint.product.key}/sprints`);
    return { success: true };
  } catch (error) {
    console.error("Error removing task from sprint:", error);
    return { success: false, error: "Failed to remove task from sprint" };
  }
}

export async function deleteSprint(
  sprintId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const sprint = await db.sprint.findUnique({
      where: { id: sprintId },
      include: {
        product: {
          include: {
            organization: true,
          },
        },
        tasks: true,
      },
    });

    if (!sprint) {
      return { success: false, error: "Sprint not found" };
    }

    if (sprint.status === "ACTIVE") {
      return { success: false, error: "Cannot delete active sprint. Complete or cancel it first." };
    }

    // Move all tasks back to backlog
    if (sprint.tasks.length > 0) {
      await db.task.updateMany({
        where: {
          sprintId,
        },
        data: {
          sprintId: null,
        },
      });
    }

    await db.sprint.update({
      where: { id: sprintId },
      data: { deletedAt: new Date() },
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "DELETE",
      entityType: "Sprint",
      entityId: sprint.id,
      metadata: { 
        name: sprint.name,
        taskCount: sprint.tasks.length,
      },
    });

    revalidatePath(`/orgs/${sprint.product.organization.slug}/products/${sprint.product.key}/sprints`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting sprint:", error);
    return { success: false, error: "Failed to delete sprint" };
  }
}