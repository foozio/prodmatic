"use server";

import { db } from "@/lib/db";
import { getCurrentUser, requireRole, logActivity } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { z } from "zod";

const createInterviewSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  scheduledAt: z.coerce.date().min(new Date(), "Interview must be scheduled in the future"),
  duration: z.number().min(15).max(180).default(60),
  location: z.string().optional(),
  objectives: z.array(z.string()).default([]),
  questions: z.array(z.string()).default([]),
});

const updateInterviewSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  scheduledAt: z.coerce.date(),
  duration: z.number().min(15).max(180),
  location: z.string().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
  objectives: z.array(z.string()).default([]),
  questions: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

const createInsightSchema = z.object({
  interviewId: z.string().min(1, "Interview is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  source: z.enum(["INTERVIEW", "SURVEY", "ANALYTICS", "EXPERIMENT", "FEEDBACK", "OBSERVATION"]).default("INTERVIEW"),
  impact: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  confidence: z.number().min(1).max(5).default(3),
  tags: z.array(z.string()).default([]),
});

export async function createInterview(
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
      customerId: formData.get("customerId") as string,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      scheduledAt: new Date(formData.get("scheduledAt") as string),
      duration: parseInt(formData.get("duration") as string) || 60,
      location: formData.get("location") as string,
      objectives: formData.get("objectives") ? JSON.parse(formData.get("objectives") as string) : [],
      questions: formData.get("questions") ? JSON.parse(formData.get("questions") as string) : [],
    };

    const validatedData = createInterviewSchema.parse(data);

    const interview = await db.interview.create({
      data: {
        ...validatedData,
        productId,
        status: "SCHEDULED",
        conductorId: user.id,
      },
      include: {
        customer: true,
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
      entityType: "Interview",
      entityId: interview.id,
      metadata: { 
        title: interview.title,
        customerId: interview.customerId,
        scheduledAt: interview.scheduledAt,
      },
    });

    revalidatePath(`/orgs/${interview.product.organizationId}/products/${interview.product.key}/interviews`);
    return { success: true, data: interview };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating interview:", error);
    return { success: false, error: "Failed to create interview" };
  }
}

export async function updateInterview(
  interviewId: string,
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
      scheduledAt: new Date(formData.get("scheduledAt") as string),
      duration: parseInt(formData.get("duration") as string),
      location: formData.get("location") as string,
      status: formData.get("status") as any, // Cast to any to avoid enum issues
      objectives: formData.get("objectives") ? JSON.parse(formData.get("objectives") as string) : [],
      questions: formData.get("questions") ? JSON.parse(formData.get("questions") as string) : [],
      notes: formData.get("notes") as string,
    };

    const validatedData = updateInterviewSchema.parse(data);

    const interview = await db.interview.update({
      where: { id: interviewId },
      data: validatedData,
      include: {
        customer: true,
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
      entityType: "Interview",
      entityId: interview.id,
      metadata: { 
        title: interview.title,
        status: interview.status,
      },
    });

    revalidatePath(`/orgs/${interview.product.organization.slug}/products/${interview.product.key}/interviews`);
    return { success: true, data: interview };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating interview:", error);
    return { success: false, error: "Failed to update interview" };
  }
}

export async function deleteInterview(
  interviewId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const interview = await db.interview.update({
      where: { id: interviewId },
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
      entityType: "Interview",
      entityId: interview.id,
      metadata: { title: interview.title },
    });

    revalidatePath(`/orgs/${interview.product.organization.slug}/products/${interview.product.key}/interviews`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting interview:", error);
    return { success: false, error: "Failed to delete interview" };
  }
}

export async function createInsight(
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
      interviewId: formData.get("interviewId") as string,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      source: formData.get("source") as "INTERVIEW" | "SURVEY" | "ANALYTICS" | "EXPERIMENT" | "FEEDBACK" | "OBSERVATION" || "INTERVIEW",
      impact: formData.get("impact") as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" || "MEDIUM",
      confidence: parseInt(formData.get("confidence") as string) || 3,
      tags: formData.get("tags") ? JSON.parse(formData.get("tags") as string) : [],
    };

    const validatedData = createInsightSchema.parse(data);

    const insight = await db.insight.create({
      data: {
        ...validatedData,
        productId: (await db.interview.findUnique({ where: { id: validatedData.interviewId }, select: { productId: true } }))!.productId,
      },
      include: {
        interview: {
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
      entityType: "Insight",
      entityId: insight.id,
      metadata: { 
        title: insight.title,
        source: insight.source,
        impact: insight.impact,
        interviewId: insight.interviewId,
      },
    });

    revalidatePath(`/orgs/${insight.interview!.product.organization.slug}/products/${insight.interview!.product.key}/interviews`);
    return { success: true, data: insight };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating insight:", error);
    return { success: false, error: "Failed to create insight" };
  }
}

export async function createCustomer(
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

    const customerData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      company: formData.get("company") as string,
      segment: formData.get("segment") as string,
      attributes: formData.get("attributes") ? JSON.parse(formData.get("attributes") as string) : {},
    };

    if (!customerData.name) {
      return { success: false, error: "Customer name is required" };
    }

    const customer = await db.customer.create({
      data: {
        ...customerData,
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

    await logActivity({
      userId: user.id,
      organizationId,
      action: "CREATE",
      entityType: "Customer",
      entityId: customer.id,
      metadata: { 
        name: customer.name,
        email: customer.email,
        company: customer.company,
      },
    });

    revalidatePath(`/orgs/${customer.product.organization.slug}/products/${customer.product.key}/interviews`);
    return { success: true, data: customer };
  } catch (error) {
    console.error("Error creating customer:", error);
    return { success: false, error: "Failed to create customer" };
  }
}