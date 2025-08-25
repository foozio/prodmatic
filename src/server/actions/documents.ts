"use server";

import { db } from "@/lib/db";
import { getCurrentUser, requireRole, logActivity } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { z } from "zod";

const createDocumentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  type: z.enum(["PRD", "RFC", "SPEC", "DESIGN", "ANALYSIS", "PROPOSAL", "GUIDE", "OTHER"]),
  template: z.string().optional(),
});

const updateDocumentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  type: z.enum(["PRD", "RFC", "SPEC", "DESIGN", "ANALYSIS", "PROPOSAL", "GUIDE", "OTHER"]),
  status: z.enum(["DRAFT", "REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]).optional(),
});

const approvalSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  comment: z.string().optional(),
});

export async function createDocument(
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
      content: formData.get("content") as string,
      type: formData.get("type") as "PRD" | "RFC" | "SPEC" | "DESIGN" | "ANALYSIS" | "PROPOSAL" | "GUIDE" | "OTHER",
      template: formData.get("template") as string,
    };

    const validatedData = createDocumentSchema.parse(data);

    const document = await db.document.create({
      data: {
        ...validatedData,
        productId,
        authorId: user.id,
        status: "DRAFT",
        version: 1,
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
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
      entityType: "Document",
      entityId: document.id,
      metadata: { 
        title: document.title,
        type: document.type,
        version: document.version,
      },
    });

    revalidatePath(`/orgs/${document.product.organization.slug}/products/${document.product.key}/documents`);
    return { success: true, data: document };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating document:", error);
    return { success: false, error: "Failed to create document" };
  }
}

export async function updateDocument(
  documentId: string,
  organizationId: string,
  formData: FormData
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const existingDocument = await db.document.findUnique({
      where: { id: documentId },
      include: {
        product: true,
      },
    });

    if (!existingDocument) {
      return { success: false, error: "Document not found" };
    }

    // Check permissions - author or admin/PM can edit
    const membership = user.memberships.find(m => m.organizationId === organizationId);
    const canEdit = existingDocument.authorId === user.id || 
                    membership?.role === "ADMIN" || 
                    membership?.role === "PRODUCT_MANAGER";

    if (!canEdit) {
      return { success: false, error: "Permission denied" };
    }

    const data = {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      type: formData.get("type") as "PRD" | "RFC" | "SPEC" | "DESIGN" | "ANALYSIS" | "PROPOSAL" | "GUIDE" | "OTHER",
      status: formData.get("status") as "DRAFT" | "REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED",
    };

    const validatedData = updateDocumentSchema.parse(data);

    // If content changed, increment version
    const shouldIncrementVersion = validatedData.content !== existingDocument.content;

    const document = await db.document.update({
      where: { id: documentId },
      data: {
        ...validatedData,
        version: shouldIncrementVersion ? existingDocument.version + 1 : existingDocument.version,
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
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
      entityType: "Document",
      entityId: document.id,
      metadata: { 
        title: document.title,
        type: document.type,
        version: document.version,
        versionIncremented: shouldIncrementVersion,
      },
    });

    revalidatePath(`/orgs/${document.product.organization.slug}/products/${document.product.key}/documents`);
    return { success: true, data: document };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating document:", error);
    return { success: false, error: "Failed to update document" };
  }
}

export async function submitForReview(
  documentId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const existingDocument = await db.document.findUnique({
      where: { id: documentId },
      include: {
        product: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!existingDocument) {
      return { success: false, error: "Document not found" };
    }

    // Only author or admin/PM can submit for review
    const membership = user.memberships.find(m => m.organizationId === organizationId);
    const canSubmit = existingDocument.authorId === user.id || 
                      membership?.role === "ADMIN" || 
                      membership?.role === "PRODUCT_MANAGER";

    if (!canSubmit) {
      return { success: false, error: "Permission denied" };
    }

    if (existingDocument.status !== "DRAFT") {
      return { success: false, error: "Only draft documents can be submitted for review" };
    }

    const document = await db.document.update({
      where: { id: documentId },
      data: { status: "REVIEW" },
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
      action: "SUBMIT_REVIEW",
      entityType: "Document",
      entityId: document.id,
      metadata: { 
        title: document.title,
        previousStatus: "DRAFT",
        newStatus: "REVIEW",
      },
    });

    revalidatePath(`/orgs/${document.product.organization.slug}/products/${document.product.key}/documents`);
    return { success: true, data: document };
  } catch (error) {
    console.error("Error submitting document for review:", error);
    return { success: false, error: "Failed to submit document for review" };
  }
}

export async function processApproval(
  documentId: string,
  organizationId: string,
  formData: FormData
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const existingDocument = await db.document.findUnique({
      where: { id: documentId },
      include: {
        product: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!existingDocument) {
      return { success: false, error: "Document not found" };
    }

    if (existingDocument.status !== "REVIEW") {
      return { success: false, error: "Only documents in review can be approved or rejected" };
    }

    const data = {
      action: formData.get("action") as "APPROVE" | "REJECT",
      comment: formData.get("comment") as string,
    };

    const validatedData = approvalSchema.parse(data);

    const newStatus = validatedData.action === "APPROVE" ? "APPROVED" : "REJECTED";

    const document = await db.document.update({
      where: { id: documentId },
      data: { status: newStatus },
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
      action: validatedData.action,
      entityType: "Document",
      entityId: document.id,
      metadata: { 
        title: document.title,
        previousStatus: "REVIEW",
        newStatus,
        comment: validatedData.comment,
      },
    });

    revalidatePath(`/orgs/${document.product.organization.slug}/products/${document.product.key}/documents`);
    return { success: true, data: document };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error processing approval:", error);
    return { success: false, error: "Failed to process approval" };
  }
}

export async function deleteDocument(
  documentId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const existingDocument = await db.document.findUnique({
      where: { id: documentId },
      include: {
        product: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!existingDocument) {
      return { success: false, error: "Document not found" };
    }

    // Only author or admin can delete
    const membership = user.memberships.find(m => m.organizationId === organizationId);
    const canDelete = existingDocument.authorId === user.id || 
                      membership?.role === "ADMIN";

    if (!canDelete) {
      return { success: false, error: "Permission denied" };
    }

    const document = await db.document.update({
      where: { id: documentId },
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
      entityType: "Document",
      entityId: document.id,
      metadata: { 
        title: document.title,
        type: document.type,
      },
    });

    revalidatePath(`/orgs/${document.product.organization.slug}/products/${document.product.key}/documents`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting document:", error);
    return { success: false, error: "Failed to delete document" };
  }
}

export async function duplicateDocument(
  documentId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER, Role.CONTRIBUTOR]);

    const originalDocument = await db.document.findUnique({
      where: { id: documentId },
      include: {
        product: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!originalDocument) {
      return { success: false, error: "Document not found" };
    }

    const document = await db.document.create({
      data: {
        title: `${originalDocument.title} (Copy)`,
        content: originalDocument.content,
        type: originalDocument.type,
        template: originalDocument.template,
        productId: originalDocument.productId,
        authorId: user.id,
        status: "DRAFT",
        version: 1,
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
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
      action: "DUPLICATE",
      entityType: "Document",
      entityId: document.id,
      metadata: { 
        title: document.title,
        originalDocumentId: documentId,
        originalTitle: originalDocument.title,
      },
    });

    revalidatePath(`/orgs/${document.product.organization.slug}/products/${document.product.key}/documents`);
    return { success: true, data: document };
  } catch (error) {
    console.error("Error duplicating document:", error);
    return { success: false, error: "Failed to duplicate document" };
  }
}