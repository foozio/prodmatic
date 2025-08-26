import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, requireRole, logActivity, createAuditLog } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";
// createAuditLog is now imported from auth-helpers
// import { createAuditLog } from "@/lib/audit";

// Schema validation
const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),
  description: z.string().optional(),
});

const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format").optional(),
  description: z.string().optional(),
});

export async function createOrganization(data: {
  name: string;
  slug: string;
  description?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const validatedData = createOrganizationSchema.parse(data);

    const organization = await db.organization.create({
      data: {
        ...validatedData,
        settings: {},
      },
    });

    // Create membership for the creator
    await db.membership.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: "ADMIN",
      },
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
      return { success: false, error: error.issues[0].message };
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
      return { success: false, error: error.issues[0].message };
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
    return { success: false, error: error instanceof Error ? error.message : "Failed to update organization" };
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

export async function updateMembershipRole(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    const membershipId = formData.get("membershipId") as string;
    const role = formData.get("role") as string;

    if (!membershipId || !role) {
      return { success: false, error: "Membership ID and role are required" };
    }

    // Get membership with organization
    const membership = await db.membership.findUnique({
      where: { id: membershipId },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      return { success: false, error: "Membership not found" };
    }

    // Check permissions
    await requireRole(user.id, membership.organizationId, ["ADMIN"]);

    // Update member role
    const updatedMembership = await db.membership.update({
      where: { id: membershipId },
      data: {
        role: role as Role,
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: membership.organizationId,
      action: "MEMBER_ROLE_UPDATED",
      entityType: "USER",
      entityId: membership.userId,
      metadata: {
        organizationName: membership.organization.name,
        updatedUserId: membership.userId,
        oldRole: membership.role,
        newRole: role,
      },
    });

    revalidatePath(`/orgs/${membership.organization.slug}/members`);
    return { success: true, membership: updatedMembership };
  } catch (error) {
    console.error("Failed to update member role:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update member role" };
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

    // Prevent removing yourself
    if (user.id === membership.userId) {
      throw new Error("Cannot remove yourself");
    }

    // Delete membership
    await db.membership.delete({
      where: { id: membershipId },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: membership.organizationId,
      action: "MEMBER_REMOVED",
      entityType: "USER",
      entityId: membership.userId,
      metadata: {
        organizationName: membership.organization.name,
        removedUserId: membership.userId,
        removedUserEmail: membership.user.email,
      },
    });

    revalidatePath(`/orgs/${membership.organization.slug}/members`);
    return { success: true };
  } catch (error) {
    console.error("Failed to remove member:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to remove member");
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
      entityType: "USER",
      entityId: email,
      metadata: {
        organizationName: organization?.name,
        invitedEmail: email,
        role: role,
      },
    });

    revalidatePath(`/orgs/${organization?.slug}/members`);
    return { success: true, invitation };
  } catch (error) {
    console.error("Failed to invite user:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to invite user" };
  }
}