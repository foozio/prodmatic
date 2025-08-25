"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, requireRole, logActivity } from "@/lib/auth-helpers";

// Schema validation for idea operations
const createIdeaSchema = z.object({
  productId: z.string().cuid(),
  creatorId: z.string().cuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  problem: z.string().optional(),
  hypothesis: z.string().optional(),
  source: z.string().optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  tags: z.string().optional(),
  reachScore: z.number().min(1).max(5).optional(),
  impactScore: z.number().min(1).max(5).optional(),
  confidenceScore: z.number().min(1).max(5).optional(),
  effortScore: z.number().min(1).max(5).optional(),
});

const updateIdeaSchema = z.object({
  ideaId: z.string().cuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  problem: z.string().optional(),
  hypothesis: z.string().optional(),
  source: z.string().optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  status: z.enum(["SUBMITTED", "REVIEWING", "APPROVED", "REJECTED", "CONVERTED"]).optional(),
  tags: z.string().optional(),
  reachScore: z.number().min(1).max(5).optional(),
  impactScore: z.number().min(1).max(5).optional(),
  confidenceScore: z.number().min(1).max(5).optional(),
  effortScore: z.number().min(1).max(5).optional(),
});

export async function createIdea(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    // Parse tags if provided
    const tagsString = formData.get("tags") as string;
    const tags = tagsString ? tagsString.split(",").map(tag => tag.trim()).filter(Boolean) : [];

    const data = createIdeaSchema.parse({
      productId: formData.get("productId"),
      creatorId: formData.get("creatorId"),
      title: formData.get("title"),
      description: formData.get("description"),
      problem: formData.get("problem") || undefined,
      hypothesis: formData.get("hypothesis") || undefined,
      source: formData.get("source") || undefined,
      priority: formData.get("priority") || "MEDIUM",
      tags: tagsString || undefined,
      reachScore: formData.get("reachScore") ? parseInt(formData.get("reachScore") as string) : undefined,
      impactScore: formData.get("impactScore") ? parseInt(formData.get("impactScore") as string) : undefined,
      confidenceScore: formData.get("confidenceScore") ? parseInt(formData.get("confidenceScore") as string) : undefined,
      effortScore: formData.get("effortScore") ? parseInt(formData.get("effortScore") as string) : undefined,
    });

    // Get product and check permissions
    const product = await db.product.findUnique({
      where: { id: data.productId },
      include: {
        organization: true,
      },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    // Check if user has access to submit ideas
    await requireRole(user.id, product.organizationId, ["ADMIN", "PRODUCT_MANAGER", "CONTRIBUTOR"]);

    // Create idea
    const idea = await db.idea.create({
      data: {
        title: data.title,
        description: data.description,
        problem: data.problem,
        hypothesis: data.hypothesis,
        source: data.source,
        tags: tags,
        priority: data.priority,
        status: "SUBMITTED",
        productId: data.productId,
        creatorId: data.creatorId,
        reachScore: data.reachScore,
        impactScore: data.impactScore,
        confidenceScore: data.confidenceScore,
        effortScore: data.effortScore,
        votes: 0,
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: product.organizationId,
      action: "IDEA_CREATED",
      entityType: "IDEA",
      entityId: idea.id,
      metadata: {
        ideaTitle: idea.title,
        productName: product.name,
        priority: idea.priority,
        hasScoring: !!(data.reachScore && data.impactScore && data.confidenceScore && data.effortScore),
      },
    });

    revalidatePath(`/orgs/${product.organization.slug}/ideas`);
    return { success: true, ideaId: idea.id, orgSlug: product.organization.slug };
  } catch (error) {
    console.error("Failed to create idea:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to create idea" };
  }
}

export async function updateIdea(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    // Parse tags if provided
    const tagsString = formData.get("tags") as string;
    const tags = tagsString ? tagsString.split(",").map(tag => tag.trim()).filter(Boolean) : undefined;

    const data = updateIdeaSchema.parse({
      ideaId: formData.get("ideaId"),
      title: formData.get("title") || undefined,
      description: formData.get("description") || undefined,
      problem: formData.get("problem") || undefined,
      hypothesis: formData.get("hypothesis") || undefined,
      source: formData.get("source") || undefined,
      priority: formData.get("priority") || undefined,
      status: formData.get("status") || undefined,
      tags: tagsString || undefined,
      reachScore: formData.get("reachScore") ? parseInt(formData.get("reachScore") as string) : undefined,
      impactScore: formData.get("impactScore") ? parseInt(formData.get("impactScore") as string) : undefined,
      confidenceScore: formData.get("confidenceScore") ? parseInt(formData.get("confidenceScore") as string) : undefined,
      effortScore: formData.get("effortScore") ? parseInt(formData.get("effortScore") as string) : undefined,
    });

    // Get idea with product and organization
    const idea = await db.idea.findUnique({
      where: { id: data.ideaId },
      include: {
        product: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!idea) {
      throw new Error("Idea not found");
    }

    // Check permissions - creators can edit their own ideas, PMs can edit any
    const canEdit = idea.creatorId === user.id || 
      await requireRole(user.id, idea.product.organizationId, ["ADMIN", "PRODUCT_MANAGER"]).then(() => true).catch(() => false);

    if (!canEdit) {
      throw new Error("Permission denied: Cannot edit this idea");
    }

    // Update idea
    const updatedIdea = await db.idea.update({
      where: { id: data.ideaId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description && { description: data.description }),
        ...(data.problem !== undefined && { problem: data.problem }),
        ...(data.hypothesis !== undefined && { hypothesis: data.hypothesis }),
        ...(data.source && { source: data.source }),
        ...(data.priority && { priority: data.priority }),
        ...(data.status && { status: data.status }),
        ...(tags !== undefined && { tags }),
        ...(data.reachScore !== undefined && { reachScore: data.reachScore }),
        ...(data.impactScore !== undefined && { impactScore: data.impactScore }),
        ...(data.confidenceScore !== undefined && { confidenceScore: data.confidenceScore }),
        ...(data.effortScore !== undefined && { effortScore: data.effortScore }),
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: idea.product.organizationId,
      action: "IDEA_UPDATED",
      entityType: "IDEA",
      entityId: idea.id,
      metadata: {
        ideaTitle: updatedIdea.title,
        changes: data,
      },
    });

    revalidatePath(`/orgs/${idea.product.organization.slug}/products/${idea.product.key}/ideas`);
    revalidatePath(`/orgs/${idea.product.organization.slug}/products/${idea.product.key}/ideas/${idea.id}`);
    return { success: true, idea: updatedIdea };
  } catch (error) {
    console.error("Failed to update idea:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to update idea");
  }
}

export async function voteOnIdea(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    const ideaId = formData.get("ideaId") as string;
    const voteType = formData.get("voteType") as string; // "up" or "down"

    if (!ideaId || !voteType) {
      throw new Error("Idea ID and vote type are required");
    }

    // Get idea with product and organization
    const idea = await db.idea.findUnique({
      where: { id: ideaId },
      include: {
        product: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!idea) {
      throw new Error("Idea not found");
    }

    // Check if user has access
    await requireRole(user.id, idea.product.organizationId, ["ADMIN", "PRODUCT_MANAGER", "CONTRIBUTOR"]);

    // Update vote count
    const voteChange = voteType === "up" ? 1 : -1;
    const updatedIdea = await db.idea.update({
      where: { id: ideaId },
      data: {
        votes: Math.max(0, idea.votes + voteChange), // Ensure votes don't go below 0
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: idea.product.organizationId,
      action: voteType === "up" ? "IDEA_UPVOTED" : "IDEA_DOWNVOTED",
      entityType: "IDEA",
      entityId: idea.id,
      metadata: {
        ideaTitle: idea.title,
        newVoteCount: updatedIdea.votes,
      },
    });

    revalidatePath(`/orgs/${idea.product.organization.slug}/products/${idea.product.key}/ideas`);
    return { success: true, votes: updatedIdea.votes };
  } catch (error) {
    console.error("Failed to vote on idea:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to vote on idea");
  }
}

export async function updateIdeaStatus(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    const ideaId = formData.get("ideaId") as string;
    const status = formData.get("status") as string;

    if (!ideaId || !status) {
      throw new Error("Idea ID and status are required");
    }

    // Validate status
    const validStatuses = ["SUBMITTED", "REVIEWING", "APPROVED", "REJECTED", "CONVERTED"];
    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status");
    }

    // Get idea with product and organization
    const idea = await db.idea.findUnique({
      where: { id: ideaId },
      include: {
        product: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!idea) {
      throw new Error("Idea not found");
    }

    // Check permissions - only PMs can change status
    await requireRole(user.id, idea.product.organizationId, ["ADMIN", "PRODUCT_MANAGER"]);

    const oldStatus = idea.status;

    // Update idea status
    const updatedIdea = await db.idea.update({
      where: { id: ideaId },
      data: {
        status: status as any,
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: idea.product.organizationId,
      action: "IDEA_STATUS_UPDATED",
      entityType: "IDEA",
      entityId: idea.id,
      metadata: {
        ideaTitle: idea.title,
        oldStatus,
        newStatus: status,
      },
    });

    revalidatePath(`/orgs/${idea.product.organization.slug}/products/${idea.product.key}/ideas`);
    revalidatePath(`/orgs/${idea.product.organization.slug}/products/${idea.product.key}/ideas/${idea.id}`);
    return { success: true, idea: updatedIdea };
  } catch (error) {
    console.error("Failed to update idea status:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to update idea status");
  }
}

export async function deleteIdea(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    const ideaId = formData.get("ideaId") as string;

    if (!ideaId) {
      throw new Error("Idea ID is required");
    }

    // Get idea with product and organization
    const idea = await db.idea.findUnique({
      where: { id: ideaId },
      include: {
        product: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!idea) {
      throw new Error("Idea not found");
    }

    // Check permissions - creators can delete their own ideas, admins can delete any
    const canDelete = idea.creatorId === user.id || 
      await requireRole(user.id, idea.product.organizationId, ["ADMIN"]).then(() => true).catch(() => false);

    if (!canDelete) {
      throw new Error("Permission denied: Cannot delete this idea");
    }

    // Soft delete idea
    await db.idea.update({
      where: { id: ideaId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: idea.product.organizationId,
      action: "IDEA_DELETED",
      entityType: "IDEA",
      entityId: idea.id,
      metadata: {
        ideaTitle: idea.title,
        productName: idea.product.name,
      },
    });

    revalidatePath(`/orgs/${idea.product.organization.slug}/products/${idea.product.key}/ideas`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete idea:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to delete idea");
  }
}