"use server";

import { db } from "@/lib/db";
import { getCurrentUser, requireRole, logActivity } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { z } from "zod";

const createPersonaSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  demographics: z.object({
    age: z.string().optional(),
    location: z.string().optional(),
    occupation: z.string().optional(),
    income: z.string().optional(),
    education: z.string().optional(),
    familyStatus: z.string().optional(),
    techSavviness: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    isPrimary: z.boolean().default(false),
  }).optional(),
  goals: z.array(z.string()).default([]),
  pains: z.array(z.string()).default([]),
  gains: z.array(z.string()).default([]),
  behaviors: z.array(z.string()).default([]),
  motivations: z.array(z.string()).default([]),
  channels: z.array(z.string()).default([]),
});

const updatePersonaSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  demographics: z.object({
    age: z.string().optional(),
    location: z.string().optional(),
    occupation: z.string().optional(),
    income: z.string().optional(),
    education: z.string().optional(),
    familyStatus: z.string().optional(),
    techSavviness: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    isPrimary: z.boolean().default(false),
  }).optional(),
  goals: z.array(z.string()).default([]),
  pains: z.array(z.string()).default([]),
  gains: z.array(z.string()).default([]),
  behaviors: z.array(z.string()).default([]),
  motivations: z.array(z.string()).default([]),
  channels: z.array(z.string()).default([]),
});

export async function createPersona(
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
      description: formData.get("description") as string,
      demographics: formData.get("demographics") ? JSON.parse(formData.get("demographics") as string) : {},
      goals: formData.get("goals") ? JSON.parse(formData.get("goals") as string) : [],
      pains: formData.get("pains") ? JSON.parse(formData.get("pains") as string) : [],
      gains: formData.get("gains") ? JSON.parse(formData.get("gains") as string) : [],
      behaviors: formData.get("behaviors") ? JSON.parse(formData.get("behaviors") as string) : [],
      motivations: formData.get("motivations") ? JSON.parse(formData.get("motivations") as string) : [],
      channels: formData.get("channels") ? JSON.parse(formData.get("channels") as string) : [],
    };

    const validatedData = createPersonaSchema.parse(data);

    const persona = await db.persona.create({
      data: {
        ...validatedData,
        productId,
      },
      include: {
        product: true,
      },
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "CREATE",
      entityType: "Persona",
      entityId: persona.id,
      metadata: { 
        name: persona.name,
        isPrimary: validatedData.demographics?.isPrimary || false,
      },
    });

    revalidatePath(`/orgs/${persona.product.organizationId}/products/${persona.product.key}/personas`);
    return { success: true, data: persona };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error creating persona:", error);
    return { success: false, error: "Failed to create persona" };
  }
}

export async function updatePersona(
  personaId: string,
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
      description: formData.get("description") as string,
      demographics: formData.get("demographics") ? JSON.parse(formData.get("demographics") as string) : {},
      goals: formData.get("goals") ? JSON.parse(formData.get("goals") as string) : [],
      pains: formData.get("pains") ? JSON.parse(formData.get("pains") as string) : [],
      gains: formData.get("gains") ? JSON.parse(formData.get("gains") as string) : [],
      behaviors: formData.get("behaviors") ? JSON.parse(formData.get("behaviors") as string) : [],
      motivations: formData.get("motivations") ? JSON.parse(formData.get("motivations") as string) : [],
      channels: formData.get("channels") ? JSON.parse(formData.get("channels") as string) : [],
    };

    const validatedData = updatePersonaSchema.parse(data);

    const persona = await db.persona.update({
      where: { id: personaId },
      data: validatedData,
      include: {
        product: true,
      },
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "UPDATE",
      entityType: "Persona",
      entityId: persona.id,
      metadata: { 
        name: persona.name,
        isPrimary: validatedData.demographics?.isPrimary || false,
      },
    });

    revalidatePath(`/orgs/${persona.product.organizationId}/products/${persona.product.key}/personas`);
    return { success: true, data: persona };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error updating persona:", error);
    return { success: false, error: "Failed to update persona" };
  }
}

export async function deletePersona(
  personaId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const persona = await db.persona.update({
      where: { id: personaId },
      data: { deletedAt: new Date() },
      include: {
        product: true,
      },
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "DELETE",
      entityType: "Persona",
      entityId: persona.id,
      metadata: { name: persona.name },
    });

    revalidatePath(`/orgs/${persona.product.organizationId}/products/${persona.product.key}/personas`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting persona:", error);
    return { success: false, error: "Failed to delete persona" };
  }
}

export async function duplicatePersona(
  personaId: string,
  organizationId: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const originalPersona = await db.persona.findUnique({
      where: { id: personaId },
    });

    if (!originalPersona) {
      return { success: false, error: "Persona not found" };
    }

    const duplicatedPersona = await db.persona.create({
      data: {
        name: `${originalPersona.name} (Copy)`,
        description: originalPersona.description,
        demographics: originalPersona.demographics as any,
        goals: originalPersona.goals,
        pains: originalPersona.pains,
        gains: originalPersona.gains,
        behaviors: originalPersona.behaviors as any,
        productId: originalPersona.productId,
      },
      include: {
        product: true,
      },
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "DUPLICATE",
      entityType: "Persona",
      entityId: duplicatedPersona.id,
      metadata: { 
        name: duplicatedPersona.name,
        originalPersonaId: personaId,
      },
    });

    revalidatePath(`/orgs/${duplicatedPersona.product!.organizationId}/products/${duplicatedPersona.product!.key}/personas`);
    return { success: true, data: duplicatedPersona };
  } catch (error) {
    console.error("Error duplicating persona:", error);
    return { success: false, error: "Failed to duplicate persona" };
  }
}

export async function updatePersonaPriority(
  personaId: string,
  organizationId: string,
  isPrimary: boolean
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER]);

    const persona = await db.persona.findUnique({
      where: { id: personaId },
    });

    if (!persona) {
      return { success: false, error: "Persona not found" };
    }

    const demographics = (persona.demographics as any) || {};
    demographics.isPrimary = isPrimary;

    const updatedPersona = await db.persona.update({
      where: { id: personaId },
      data: { demographics },
      include: {
        product: true,
      },
    });

    await logActivity({
      userId: user.id,
      organizationId,
      action: "UPDATE",
      entityType: "Persona",
      entityId: persona.id,
      metadata: { 
        name: persona.name,
        isPrimary,
        action: "priority_update",
      },
    });

    revalidatePath(`/orgs/${updatedPersona.product.organizationId}/products/${updatedPersona.product.key}/personas`);
    return { success: true, data: updatedPersona };
  } catch (error) {
    console.error("Error updating persona priority:", error);
    return { success: false, error: "Failed to update persona priority" };
  }
}