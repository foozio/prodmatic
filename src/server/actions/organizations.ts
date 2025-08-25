"use server";

import { db } from "@/lib/db";
import { getCurrentUser, createAuditLog, requireRole, logActivity } from "@/lib/auth-helpers";
import { generateSlug } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { z } from "zod";

const createOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  description: z.string().optional(),
});

const updateOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  description: z.string().optional(),
  domain: z.string().optional(),
  logo: z.string().optional(),
});

export async function createOrganization(data: {
  name: string;
  description?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const validatedData = createOrganizationSchema.parse(data);
    const slug = generateSlug(validatedData.name);

    // Check if slug already exists
    const existingOrg = await db.organization.findUnique({
      where: { slug },
    });

    if (existingOrg) {
      return { success: false, error: "Organization name already taken" };
    }

    const organization = await db.$transaction(async (tx) => {
      // Create organization
      const org = await tx.organization.create({
        data: {
          name: validatedData.name,
          slug,
          description: validatedData.description,
        },
      });

      // Add user as admin
      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: Role.ADMIN,
        },
      });

      // Create default team
      await tx.team.create({
        data: {
          name: "General",
          description: "Default team for all organization members",
          organizationId: org.id,
        },
      });

      return org;
    });

    await createAuditLog({
      action: "CREATE",
      entity: "Organization",
      entityId: organization.id,
      metadata: { name: organization.name },
      userId: user.id,
      organizationId: organization.id,
    });

    revalidatePath("/");
    return { success: true, data: organization };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Error creating organization:", error);
    return { success: false, error: "Failed to create organization" };
  }
}

export async function updateOrganizationLegacy(
  organizationId: string,
  data: {
    name: string;
    description?: string;
    domain?: string;
    logo?: string;
  }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const membership = user.memberships.find(
      (m) => m.organizationId === organizationId
    );

    if (!membership || membership.role !== Role.ADMIN) {
      return { success: false, error: "Admin access required" };
    }

    const validatedData = updateOrganizationSchema.parse(data);

    const organization = await db.organization.update({
      where: { id: organizationId },
      data: validatedData,
    });

    await createAuditLog({
      action: "UPDATE",
      entity: "Organization",
      entityId: organization.id,
      changes: validatedData,
      userId: user.id,
      organizationId: organization.id,
    });

    revalidatePath(`/orgs/${organization.slug}`);
    return { success: true, data: organization };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error("Error updating organization:", error);
    return { success: false, error: "Failed to update organization" };
  }
}

export async function inviteUserToOrganization(
  organizationId: string,
  data: {
    email: string;
    role: Role;
    teamId?: string;
  }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const membership = user.memberships.find(
      (m) => m.organizationId === organizationId
    );

    if (!membership || !["ADMIN", "PRODUCT_MANAGER"].includes(membership.role)) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Check if user is already a member
    const existingMembership = await db.membership.findFirst({
      where: {
        organizationId,
        user: { email: data.email },
      },
    });

    if (existingMembership) {
      return { success: false, error: "User is already a member" };
    }

    // Check for existing invitation
    const existingInvitation = await db.invitation.findFirst({
      where: {
        organizationId,
        email: data.email,
        status: "PENDING",
      },
    });

    if (existingInvitation) {
      return { success: false, error: "Invitation already sent" };
    }

    const invitation = await db.invitation.create({
      data: {
        email: data.email,
        organizationId,
        teamId: data.teamId,
        role: data.role,
        token: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    await createAuditLog({
      action: "INVITE",
      entity: "User",
      entityId: data.email,
      metadata: { role: data.role, teamId: data.teamId },
      userId: user.id,
      organizationId,
    });

    // TODO: Send invitation email
    
    revalidatePath(`/orgs/${membership.organization.slug}/settings/members`);
    return { success: true, data: invitation };
  } catch (error) {
    console.error("Error inviting user:", error);
    return { success: false, error: "Failed to send invitation" };
  }
}

export async function removeUserFromOrganization(
  organizationId: string,
  userId: string
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Authentication required" };
    }

    const membership = currentUser.memberships.find(
      (m) => m.organizationId === organizationId
    );

    if (!membership || membership.role !== Role.ADMIN) {
      return { success: false, error: "Admin access required" };
    }

    if (currentUser.id === userId) {
      return { success: false, error: "Cannot remove yourself" };
    }

    await db.membership.deleteMany({
      where: {
        organizationId,
        userId,
      },
    });

    await createAuditLog({
      action: "REMOVE",
      entity: "User",
      entityId: userId,
      userId: currentUser.id,
      organizationId,
    });

    revalidatePath(`/orgs/${membership.organization.slug}/settings/members`);
    return { success: true };
  } catch (error) {
    console.error("Error removing user:", error);
    return { success: false, error: "Failed to remove user" };
  }
}

// FormData-based actions for UI forms
export async function updateOrganization(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    const organizationId = formData.get("organizationId") as string;
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const description = formData.get("description") as string;
    const website = formData.get("website") as string;

    if (!organizationId || !name || !slug) {
      throw new Error("Organization ID, name, and slug are required");
    }

    // Check permissions
    await requireRole(user.id, organizationId, ["ADMIN"]);

    // Check if new slug is unique (if changed)
    const currentOrg = await db.organization.findUnique({
      where: { id: organizationId },
    });

    if (!currentOrg) {
      throw new Error("Organization not found");
    }

    if (slug !== currentOrg.slug) {
      const existingOrg = await db.organization.findUnique({
        where: { slug },
      });

      if (existingOrg) {
        throw new Error("Organization slug already taken");
      }
    }

    // Update organization
    const organization = await db.organization.update({
      where: { id: organizationId },
      data: {
        name,
        slug,
        description: description || null,
        website: website || null,
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId,
      action: "ORGANIZATION_UPDATED",
      entityType: "ORGANIZATION",
      entityId: organizationId,
      metadata: {
        organizationName: name,
        changes: { name, slug, description, website },
      },
    });

    revalidatePath(`/orgs/${organization.slug}/settings`);
    return { success: true, organization };
  } catch (error) {
    console.error("Failed to update organization:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to update organization"
    );
  }
}

export async function deleteOrganization(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    const organizationId = formData.get("organizationId") as string;

    if (!organizationId) {
      throw new Error("Organization ID is required");
    }

    // Check if user is admin
    await requireRole(user.id, organizationId, ["ADMIN"]);

    // Check if organization has other admins
    const adminCount = await db.membership.count({
      where: {
        organizationId: organizationId,
        role: "ADMIN",
      },
    });

    if (adminCount <= 1) {
      throw new Error(
        "Cannot delete organization. At least one admin must remain."
      );
    }

    // Get organization for logging
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    // Delete organization (cascade will handle related records)
    await db.organization.delete({
      where: { id: organizationId },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: organizationId,
      action: "ORGANIZATION_DELETED",
      entityType: "ORGANIZATION",
      entityId: organizationId,
      metadata: {
        organizationName: organization.name,
        organizationSlug: organization.slug,
      },
    });

    redirect("/onboarding");
  } catch (error) {
    console.error("Failed to delete organization:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to delete organization"
    );
  }
}

export async function inviteUser(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    const organizationId = formData.get("organizationId") as string;
    const email = formData.get("email") as string;
    const role = formData.get("role") as string;

    if (!organizationId || !email || !role) {
      throw new Error("Organization ID, email, and role are required");
    }

    // Validate role
    const validRoles = ["ADMIN", "PRODUCT_MANAGER", "CONTRIBUTOR", "STAKEHOLDER"];
    if (!validRoles.includes(role)) {
      throw new Error("Invalid role");
    }

    // Check permissions
    await requireRole(user.id, organizationId, ["ADMIN"]);

    // Check if user already exists and is a member
    const existingUser = await db.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { organizationId },
        },
      },
    });

    if (existingUser && existingUser.memberships.length > 0) {
      throw new Error("User is already a member of this organization");
    }

    // Check if invitation already exists
    const existingInvitation = await db.invitation.findFirst({
      where: {
        organizationId,
        email,
        status: "PENDING",
      },
    });

    if (existingInvitation) {
      throw new Error("Invitation already sent to this email");
    }

    // Create invitation
    const invitation = await db.invitation.create({
      data: {
        organizationId,
        email,
        role: role as Role,
        invitedById: user.id,
        token: crypto.randomUUID(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Get organization for logging
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId,
      action: "USER_INVITED",
      entityType: "INVITATION",
      entityId: invitation.id,
      metadata: {
        invitedEmail: email,
        role,
        organizationName: organization?.name,
      },
    });

    // TODO: Send invitation email
    console.log(`Invitation created for ${email} to join ${organization?.name}`);

    revalidatePath(`/orgs/${organization?.slug}/members`);
    return { success: true, invitation };
  } catch (error) {
    console.error("Failed to invite user:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to invite user"
    );
  }
}

export async function removeMember(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    const membershipId = formData.get("membershipId") as string;

    if (!membershipId) {
      throw new Error("Membership ID is required");
    }

    // Get membership with organization
    const membership = await db.membership.findUnique({
      where: { id: membershipId },
      include: {
        organization: true,
        user: true,
      },
    });

    if (!membership) {
      throw new Error("Membership not found");
    }

    // Check permissions
    await requireRole(user.id, membership.organizationId, ["ADMIN"]);

    // Don't allow removing self
    if (membership.userId === user.id) {
      throw new Error("Cannot remove yourself from the organization");
    }

    // Check if this is the last admin
    if (membership.role === "ADMIN") {
      const adminCount = await db.membership.count({
        where: {
          organizationId: membership.organizationId,
          role: "ADMIN",
        },
      });

      if (adminCount <= 1) {
        throw new Error(
          "Cannot remove the last admin from the organization"
        );
      }
    }

    // Remove from all teams in the organization
    await db.membership.deleteMany({
      where: {
        userId: membership.userId,
        organizationId: membership.organizationId,
        teamId: { not: null },
      },
    });

    // Delete membership
    await db.membership.delete({
      where: { id: membershipId },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: membership.organizationId,
      action: "MEMBER_REMOVED",
      entityType: "MEMBERSHIP",
      entityId: membershipId,
      metadata: {
        removedUserEmail: membership.user.email,
        removedUserRole: membership.role,
        organizationName: membership.organization.name,
      },
    });

    revalidatePath(`/orgs/${membership.organization.slug}/members`);
    return { success: true };
  } catch (error) {
    console.error("Failed to remove member:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to remove member"
    );
  }
}

export async function updateMemberRole(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    const membershipId = formData.get("membershipId") as string;
    const newRole = formData.get("role") as string;

    if (!membershipId || !newRole) {
      throw new Error("Membership ID and role are required");
    }

    // Validate role
    const validRoles = ["ADMIN", "PRODUCT_MANAGER", "CONTRIBUTOR", "STAKEHOLDER"];
    if (!validRoles.includes(newRole)) {
      throw new Error("Invalid role");
    }

    // Get membership with organization
    const membership = await db.membership.findUnique({
      where: { id: membershipId },
      include: {
        organization: true,
        user: true,
      },
    });

    if (!membership) {
      throw new Error("Membership not found");
    }

    // Check permissions
    await requireRole(user.id, membership.organizationId, ["ADMIN"]);

    // Don't allow changing own role
    if (membership.userId === user.id) {
      throw new Error("Cannot change your own role");
    }

    // If removing admin role, check if this is the last admin
    if (membership.role === "ADMIN" && newRole !== "ADMIN") {
      const adminCount = await db.membership.count({
        where: {
          organizationId: membership.organizationId,
          role: "ADMIN",
        },
      });

      if (adminCount <= 1) {
        throw new Error(
          "Cannot remove admin role from the last admin in the organization"
        );
      }
    }

    const oldRole = membership.role;

    // Update membership role
    const updatedMembership = await db.membership.update({
      where: { id: membershipId },
      data: { role: newRole as Role },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: membership.organizationId,
      action: "MEMBER_ROLE_UPDATED",
      entityType: "MEMBERSHIP",
      entityId: membershipId,
      metadata: {
        userEmail: membership.user.email,
        oldRole,
        newRole,
        organizationName: membership.organization.name,
      },
    });

    revalidatePath(`/orgs/${membership.organization.slug}/members`);
    return { success: true, membership: updatedMembership };
  } catch (error) {
    console.error("Failed to update member role:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to update member role"
    );
  }
}