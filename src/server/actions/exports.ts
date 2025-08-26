"use server";

import { db } from "@/lib/db";
import { getCurrentUser, requireRole, logActivity } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
import { z } from "zod";

const exportRequestSchema = z.object({
  type: z.enum([
    "ideas", "features", "releases", "kpis", "experiments", 
    "flags", "customers", "feedback", "full", "dashboard"
  ]),
  format: z.enum(["CSV", "PDF", "ZIP"]).default("CSV"),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  filters: z.record(z.string(), z.any()).optional(),
});

export async function requestDataExport(
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
      type: formData.get("type") as string,
      format: formData.get("format") as string || "CSV",
      dateFrom: formData.get("dateFrom") ? new Date(formData.get("dateFrom") as string) : undefined,
      dateTo: formData.get("dateTo") ? new Date(formData.get("dateTo") as string) : undefined,
      filters: formData.get("filters") ? JSON.parse(formData.get("filters") as string) : undefined,
    };

    const validatedData = exportRequestSchema.parse(data);

    const product = await db.product.findFirst({
      where: {
        id: productId,
        organizationId,
        deletedAt: null,
      },
      include: {
        organization: true,
      },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    // Generate export ID for tracking
    const exportId = `export_${validatedData.type}_${Date.now()}`;

    // In a real implementation, this would queue a background job
    // For now, we'll simulate the export process
    const exportData = await generateExportData(productId, validatedData);

    await logActivity({
      userId: user.id,
      organizationId,
      action: "EXPORT",
      entityType: "Product",
      entityId: productId,
      metadata: { 
        productName: product.name,
        exportType: validatedData.type,
        exportFormat: validatedData.format,
        exportId,
        recordCount: exportData.recordCount,
      },
    });

    return { 
      success: true, 
      data: { 
        exportId,
        status: "completed",
        downloadUrl: `/api/exports/${exportId}/download`,
        recordCount: exportData.recordCount,
        fileSize: exportData.fileSize,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues[0].message };
    }
    console.error("Error requesting data export:", error);
    return { success: false, error: "Failed to request data export" };
  }
}

async function generateExportData(productId: string, params: any) {
  // This would contain the actual export logic
  switch (params.type) {
    case "ideas":
      const ideas = await db.idea.findMany({
        where: {
          productId,
          deletedAt: null,
          ...(params.dateFrom && { createdAt: { gte: params.dateFrom } }),
          ...(params.dateTo && { createdAt: { lte: params.dateTo } }),
        },
        include: {
          creator: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return {
        data: ideas,
        recordCount: ideas.length,
        fileSize: `${Math.round((ideas.length * 0.5))}KB`,
      };

    case "features":
      const features = await db.feature.findMany({
        where: {
          productId,
          deletedAt: null,
          ...(params.dateFrom && { createdAt: { gte: params.dateFrom } }),
          ...(params.dateTo && { createdAt: { lte: params.dateTo } }),
        },
        include: {
          epic: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return {
        data: features,
        recordCount: features.length,
        fileSize: `${Math.round((features.length * 0.8))}KB`,
      };

    case "releases":
      const releases = await db.release.findMany({
        where: {
          productId,
          deletedAt: null,
          ...(params.dateFrom && { createdAt: { gte: params.dateFrom } }),
          ...(params.dateTo && { createdAt: { lte: params.dateTo } }),
        },
        include: {
          features: { select: { title: true, status: true } },
          changelog: { select: { title: true, type: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return {
        data: releases,
        recordCount: releases.length,
        fileSize: `${Math.round((releases.length * 1.2))}KB`,
      };

    case "kpis":
      const kpis = await db.kPI.findMany({
        where: {
          productId,
          deletedAt: null,
          ...(params.dateFrom && { createdAt: { gte: params.dateFrom } }),
          ...(params.dateTo && { createdAt: { lte: params.dateTo } }),
        },
        include: {
          owner: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return {
        data: kpis,
        recordCount: kpis.length,
        fileSize: `${Math.round((kpis.length * 0.6))}KB`,
      };

    case "experiments":
      const experiments = await db.experiment.findMany({
        where: {
          productId,
          deletedAt: null,
          ...(params.dateFrom && { createdAt: { gte: params.dateFrom } }),
          ...(params.dateTo && { createdAt: { lte: params.dateTo } }),
        },
        include: {
          owner: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return {
        data: experiments,
        recordCount: experiments.length,
        fileSize: `${Math.round((experiments.length * 1.0))}KB`,
      };

    case "flags":
      const flags = await db.featureFlag.findMany({
        where: {
          productId,
          deletedAt: null,
          ...(params.dateFrom && { createdAt: { gte: params.dateFrom } }),
          ...(params.dateTo && { createdAt: { lte: params.dateTo } }),
        },
        include: {
          feature: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return {
        data: flags,
        recordCount: flags.length,
        fileSize: `${Math.round((flags.length * 0.4))}KB`,
      };

    case "customers":
      const customers = await db.customer.findMany({
        where: {
          productId,
          deletedAt: null,
          ...(params.dateFrom && { createdAt: { gte: params.dateFrom } }),
          ...(params.dateTo && { createdAt: { lte: params.dateTo } }),
        },
        orderBy: { createdAt: "desc" },
      });
      return {
        data: customers.map(customer => ({
          ...customer,
          // Mask PII for privacy
          email: customer.email ? customer.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null,
        })),
        recordCount: customers.length,
        fileSize: `${Math.round((customers.length * 0.3))}KB`,
      };

    case "feedback":
      const feedback = await db.feedback.findMany({
        where: {
          productId,
          deletedAt: null,
          ...(params.dateFrom && { createdAt: { gte: params.dateFrom } }),
          ...(params.dateTo && { createdAt: { lte: params.dateTo } }),
        },
        include: {
          customer: { select: { name: true, tier: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return {
        data: feedback,
        recordCount: feedback.length,
        fileSize: `${Math.round((feedback.length * 0.7))}KB`,
      };

    case "full":
      // This would create a comprehensive export of all product data
      const allData = await Promise.all([
        db.idea.count({ where: { productId, deletedAt: null } }),
        db.feature.count({ where: { productId, deletedAt: null } }),
        db.release.count({ where: { productId, deletedAt: null } }),
        db.kPI.count({ where: { productId, deletedAt: null } }),
        db.experiment.count({ where: { productId, deletedAt: null } }),
        db.featureFlag.count({ where: { productId, deletedAt: null } }),
        db.customer.count({ where: { productId, deletedAt: null } }),
        db.feedback.count({ where: { productId, deletedAt: null } }),
      ]);
      const totalRecords = allData.reduce((sum, count) => sum + count, 0);
      return {
        data: { tables: allData.length, totalRecords },
        recordCount: totalRecords,
        fileSize: `${Math.round((totalRecords * 2.5))}KB`,
      };

    case "dashboard":
      // This would generate an executive dashboard/summary
      const dashboardData = {
        summary: "Executive Dashboard Report",
        generatedAt: new Date(),
        sections: ["Product Overview", "Key Metrics", "Recent Activity"],
      };
      return {
        data: dashboardData,
        recordCount: 1,
        fileSize: "45KB",
      };

    default:
      throw new Error("Unknown export type");
  }
}

export async function getExportStatus(exportId: string, organizationId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER, Role.CONTRIBUTOR]);

    // In a real implementation, this would check the status of a background job
    // For now, we'll simulate the status check
    return {
      success: true,
      data: {
        exportId,
        status: "completed",
        progress: 100,
        downloadUrl: `/api/exports/${exportId}/download`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    };
  } catch (error) {
    console.error("Error getting export status:", error);
    return { success: false, error: "Failed to get export status" };
  }
}

export async function deleteExport(exportId: string, organizationId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER, Role.CONTRIBUTOR]);

    await logActivity({
      userId: user.id,
      organizationId,
      action: "DELETE",
      entityType: "Export",
      entityId: exportId,
      metadata: { 
        exportId,
        action: "export_cleanup",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting export:", error);
    return { success: false, error: "Failed to delete export" };
  }
}

export async function generateProductReport(
  productId: string,
  organizationId: string,
  reportType: "summary" | "detailed" | "analytics"
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    await requireRole(user.id, organizationId, [Role.ADMIN, Role.PRODUCT_MANAGER, Role.CONTRIBUTOR, Role.STAKEHOLDER]);

    const product = await db.product.findFirst({
      where: {
        id: productId,
        organizationId,
        deletedAt: null,
      },
      include: {
        organization: true,
        ideas: { where: { deletedAt: null } },
        features: { where: { deletedAt: null } },
        releases: { where: { deletedAt: null } },
        kpis: { where: { deletedAt: null } },
        experiments: { where: { deletedAt: null } },
        flags: { where: { deletedAt: null } },
        customers: { where: { deletedAt: null } },
        feedback: { where: { deletedAt: null } },
      },
    });

    if (!product) {
      return { success: false, error: "Product not found" };
    }

    const reportId = `report_${reportType}_${Date.now()}`;

    // Generate report data based on type
    const reportData = {
      summary: {
        productName: product.name,
        lifecycle: product.lifecycle,
        totalIdeas: product.ideas.length,
        totalFeatures: product.features.length,
        totalReleases: product.releases.length,
        totalCustomers: product.customers.length,
        generatedAt: new Date(),
        generatedBy: user.name,
      },
      detailed: reportType === "detailed" ? {
        ideas: product.ideas.slice(0, 10), // Limit for demo
        features: product.features.slice(0, 10),
        releases: product.releases.slice(0, 5),
      } : undefined,
      analytics: reportType === "analytics" ? {
        kpis: product.kpis,
        experiments: product.experiments,
        flags: product.flags,
      } : undefined,
    };

    await logActivity({
      userId: user.id,
      organizationId,
      action: "GENERATE",
      entityType: "Report",
      entityId: reportId,
      metadata: { 
        productName: product.name,
        reportType,
        reportId,
      },
    });

    return { 
      success: true, 
      data: { 
        reportId,
        downloadUrl: `/api/reports/${reportId}/download`,
        reportData,
      }
    };
  } catch (error) {
    console.error("Error generating product report:", error);
    return { success: false, error: "Failed to generate product report" };
  }
}