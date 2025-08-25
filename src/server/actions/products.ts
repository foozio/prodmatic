"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, requireRole, logActivity } from "@/lib/auth-helpers";
import { generateSlug } from "@/lib/utils";

// Schema validation for product operations
const createProductSchema = z.object({
  organizationId: z.string().cuid(),
  name: z.string().min(1).max(100),
  key: z.string().regex(/^[A-Z0-9]+$/, "Product key must be uppercase letters and numbers only"),
  description: z.string().optional(),
  vision: z.string().optional(),
  lifecycle: z.enum(["IDEATION", "DISCOVERY", "DEFINITION", "DELIVERY", "LAUNCH", "GROWTH", "MATURITY", "SUNSET"]),
  teamId: z.string().optional(),
});

const updateProductSchema = z.object({
  productId: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  key: z.string().regex(/^[A-Z0-9]+$/, "Product key must be uppercase letters and numbers only").optional(),
  description: z.string().optional(),
  vision: z.string().optional(),
  lifecycle: z.enum(["IDEATION", "DISCOVERY", "DEFINITION", "DELIVERY", "LAUNCH", "GROWTH", "MATURITY", "SUNSET"]).optional(),
});

export async function createProduct(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    const data = createProductSchema.parse({
      organizationId: formData.get("organizationId"),
      name: formData.get("name"),
      key: formData.get("key"),
      description: formData.get("description") || undefined,
      vision: formData.get("vision") || undefined,
      lifecycle: formData.get("lifecycle"),
      teamId: formData.get("teamId") || undefined,
    });

    // Check permissions
    await requireRole(user.id, data.organizationId, ["ADMIN", "PRODUCT_MANAGER"]);

    // Check if product key is unique
    const existingProduct = await db.product.findUnique({
      where: { key: data.key },
    });

    if (existingProduct) {
      throw new Error("Product key already exists");
    }

    // Get organization for redirect
    const organization = await db.organization.findUnique({
      where: { id: data.organizationId },
      select: { slug: true },
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    // Create product
    const product = await db.product.create({
      data: {
        name: data.name,
        key: data.key,
        description: data.description,
        vision: data.vision,
        lifecycle: data.lifecycle,
        organizationId: data.organizationId,
        settings: {},
        metrics: {},
      },
    });

    // Assign to team if specified
    if (data.teamId) {
      await db.team.update({
        where: { id: data.teamId },
        data: {
          products: {
            connect: { id: product.id },
          },
        },
      });
    }

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: data.organizationId,
      action: "PRODUCT_CREATED",
      entityType: "PRODUCT",
      entityId: product.id,
      metadata: {
        productName: product.name,
        productKey: product.key,
        lifecycle: product.lifecycle,
        teamId: data.teamId,
      },
    });

    revalidatePath(`/orgs/${organization.slug}/products`);
    redirect(`/orgs/${organization.slug}/products/${product.key}`);
  } catch (error) {
    console.error("Failed to create product:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to create product");
  }
}

export async function updateProduct(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    const data = updateProductSchema.parse({
      productId: formData.get("productId"),
      name: formData.get("name") || undefined,
      key: formData.get("key") || undefined,
      description: formData.get("description") || undefined,
      vision: formData.get("vision") || undefined,
      lifecycle: formData.get("lifecycle") || undefined,
    });

    // Get product with organization
    const product = await db.product.findUnique({
      where: { id: data.productId },
      include: {
        organization: true,
      },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    // Check permissions
    await requireRole(user.id, product.organizationId, ["ADMIN", "PRODUCT_MANAGER"]);

    // Check if new key is unique (if provided and different)
    if (data.key && data.key !== product.key) {
      const existingProduct = await db.product.findUnique({
        where: { key: data.key },
      });

      if (existingProduct) {
        throw new Error("Product key already exists");
      }
    }

    // Update product
    const updatedProduct = await db.product.update({
      where: { id: data.productId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.key && { key: data.key }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.vision !== undefined && { vision: data.vision }),
        ...(data.lifecycle && { lifecycle: data.lifecycle }),
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: product.organizationId,
      action: "PRODUCT_UPDATED",
      entityType: "PRODUCT",
      entityId: product.id,
      metadata: {
        productName: updatedProduct.name,
        productKey: updatedProduct.key,
        changes: data,
      },
    });

    revalidatePath(`/orgs/${product.organization.slug}/products`);
    revalidatePath(`/orgs/${product.organization.slug}/products/${updatedProduct.key}`);
    return { success: true, product: updatedProduct };
  } catch (error) {
    console.error("Failed to update product:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to update product");
  }
}

export async function deleteProduct(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    const productId = formData.get("productId") as string;

    if (!productId) {
      throw new Error("Product ID is required");
    }

    // Get product with organization
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        organization: true,
        _count: {
          select: {
            features: true,
            ideas: true,
            experiments: true,
            releases: true,
          },
        },
      },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    // Check permissions
    await requireRole(user.id, product.organizationId, ["ADMIN"]);

    // Check if product has dependencies
    const totalItems = Object.values(product._count).reduce((sum, count) => sum + count, 0);
    if (totalItems > 0) {
      throw new Error(
        `Cannot delete product with ${totalItems} associated items. Please clean up features, ideas, experiments, and releases first.`
      );
    }

    // Soft delete product
    await db.product.update({
      where: { id: productId },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: product.organizationId,
      action: "PRODUCT_DELETED",
      entityType: "PRODUCT",
      entityId: product.id,
      metadata: {
        productName: product.name,
        productKey: product.key,
        lifecycle: product.lifecycle,
      },
    });

    revalidatePath(`/orgs/${product.organization.slug}/products`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete product:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to delete product");
  }
}

export async function updateProductLifecycle(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    const productId = formData.get("productId") as string;
    const lifecycle = formData.get("lifecycle") as string;

    if (!productId || !lifecycle) {
      throw new Error("Product ID and lifecycle stage are required");
    }

    // Validate lifecycle
    const validLifecycles = ["IDEATION", "DISCOVERY", "DEFINITION", "DELIVERY", "LAUNCH", "GROWTH", "MATURITY", "SUNSET"];
    if (!validLifecycles.includes(lifecycle)) {
      throw new Error("Invalid lifecycle stage");
    }

    // Get product with organization
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        organization: true,
      },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    // Check permissions
    await requireRole(user.id, product.organizationId, ["ADMIN", "PRODUCT_MANAGER"]);

    const oldLifecycle = product.lifecycle;

    // Update product lifecycle
    const updatedProduct = await db.product.update({
      where: { id: productId },
      data: {
        lifecycle: lifecycle as any,
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: product.organizationId,
      action: "PRODUCT_LIFECYCLE_UPDATED",
      entityType: "PRODUCT",
      entityId: product.id,
      metadata: {
        productName: product.name,
        productKey: product.key,
        oldLifecycle,
        newLifecycle: lifecycle,
      },
    });

    revalidatePath(`/orgs/${product.organization.slug}/products`);
    revalidatePath(`/orgs/${product.organization.slug}/products/${product.key}`);
    return { success: true, product: updatedProduct };
  } catch (error) {
    console.error("Failed to update product lifecycle:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to update product lifecycle");
  }
}