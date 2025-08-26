"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, requireRole, logActivity } from "@/lib/auth-helpers";
import { Role } from "@prisma/client";

// Schema validation for team operations
const createTeamSchema = z.object({
  organizationId: z.string().cuid(),
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"),
  description: z.string().optional(),
});

const updateTeamSchema = z.object({
  teamId: z.string().cuid(),
  name: z.string().min(1).max(100).optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format").optional(),
  description: z.string().optional(),
});

export async function createTeam(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    const data = createTeamSchema.parse({
      organizationId: formData.get("organizationId"),
      name: formData.get("name"),
      slug: formData.get("slug"),
      description: formData.get("description") || undefined,
    });

    // Check permissions
    await requireRole(user.id, data.organizationId, ["ADMIN", "PRODUCT_MANAGER"]);

    // Check if slug is unique within organization
    const existingTeam = await db.team.findFirst({
      where: {
        organizationId: data.organizationId,
        slug: data.slug,
      },
    });

    if (existingTeam) {
      throw new Error("Team slug already exists in this organization");
    }

    // Create team
    const team = await db.team.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        organizationId: data.organizationId,
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: data.organizationId,
      action: "TEAM_CREATED",
      entityType: "TEAM",
      entityId: team.id,
      metadata: {
        teamName: team.name,
        teamSlug: team.slug,
      },
    });

    // Get organization slug for redirect
    const organization = await db.organization.findUnique({
      where: { id: data.organizationId },
      select: { slug: true },
    });

    revalidatePath(`/orgs/${organization?.slug}/teams`);
    return { success: true, team };
  } catch (error) {
    console.error("Failed to create team:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to create team");
  }
}

export async function updateTeam(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    const data = updateTeamSchema.parse({
      teamId: formData.get("teamId"),
      name: formData.get("name") || undefined,
      slug: formData.get("slug") || undefined,
      description: formData.get("description") || undefined,
    });

    // Get team with organization
    const team = await db.team.findUnique({
      where: { id: data.teamId },
      include: {
        organization: true,
      },
    });

    if (!team) {
      throw new Error("Team not found");
    }

    // Check permissions
    await requireRole(user.id, team.organizationId, ["ADMIN", "PRODUCT_MANAGER"]);

    // Check if new slug is unique (if provided)
    if (data.slug && data.slug !== team.slug) {
      const existingTeam = await db.team.findFirst({
        where: {
          organizationId: team.organizationId,
          slug: data.slug,
          id: { not: team.id },
        },
      });

      if (existingTeam) {
        throw new Error("Team slug already exists in this organization");
      }
    }

    // Update team
    const updatedTeam = await db.team.update({
      where: { id: data.teamId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: team.organizationId,
      action: "TEAM_UPDATED",
      entityType: "TEAM",
      entityId: team.id,
      metadata: {
        teamName: updatedTeam.name,
        changes: data,
      },
    });

    revalidatePath(`/orgs/${team.organization.slug}/teams`);
    revalidatePath(`/orgs/${team.organization.slug}/teams/${updatedTeam.slug}`);
    return { success: true, team: updatedTeam };
  } catch (error) {
    console.error("Failed to update team:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to update team");
  }
}

export async function deleteTeam(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    const teamId = formData.get("teamId") as string;

    if (!teamId) {
      throw new Error("Team ID is required");
    }

    // Get team with organization
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: {
        organization: true,
        products: true,
        members: true,
      },
    });

    if (!team) {
      throw new Error("Team not found");
    }

    // Check permissions
    await requireRole(user.id, team.organizationId, ["ADMIN"]);

    // Check if team has products
    if (team.products.length > 0) {
      throw new Error("Cannot delete team with active products. Please reassign or delete products first.");
    }

    // Delete team members first
    await db.membership.deleteMany({
      where: { teamId: team.id },
    });

    // Delete team
    await db.team.delete({
      where: { id: team.id },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: team.organizationId,
      action: "TEAM_DELETED",
      entityType: "TEAM",
      entityId: team.id,
      metadata: {
        teamName: team.name,
        teamSlug: team.slug,
      },
    });

    revalidatePath(`/orgs/${team.organization.slug}/teams`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete team:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to delete team");
  }
}

export async function addTeamMember(prevState: any, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    const teamId = formData.get("teamId") as string;
    const userId = formData.get("userId") as string;
    const role = formData.get("role") as string || "CONTRIBUTOR"; // Default to CONTRIBUTOR if not provided

    if (!teamId || !userId) {
      return { success: false, error: "Team ID and User ID are required" };
    }

    // Get team with organization
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: {
        organization: true,
      },
    });

    if (!team) {
      return { success: false, error: "Team not found" };
    }

    // Check permissions
    await requireRole(user.id, team.organizationId, ["ADMIN", "PRODUCT_MANAGER"]);

    // Check if user is already a team member
    const existingMembership = await db.membership.findFirst({
      where: {
        teamId: teamId,
        userId: userId,
      },
    });

    if (existingMembership) {
      return { success: false, error: "User is already a team member" };
    }

    // Check if user is an organization member
    const orgMembership = await db.membership.findFirst({
      where: {
        organizationId: team.organizationId,
        userId: userId,
      },
    });

    if (!orgMembership) {
      return { success: false, error: "User is not a member of this organization" };
    }

    // Add team member with role
    const teamMembership = await db.membership.create({
      data: {
        teamId: teamId,
        userId: userId,
        organizationId: team.organizationId,
        role: role as Role, // Set the team-specific role
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: team.organizationId,
      action: "TEAM_MEMBER_ADDED",
      entityType: "TEAM",
      entityId: team.id,
      metadata: {
        teamName: team.name,
        addedUserId: userId,
        role: role,
      },
    });

    revalidatePath(`/orgs/${team.organization.slug}/teams`);
    revalidatePath(`/orgs/${team.organization.slug}/teams/${team.slug}`);
    return { success: true, membership: teamMembership };
  } catch (error) {
    console.error("Failed to add team member:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to add team member" };
  }
}

export async function updateTeamMemberRole(prevState: any, formData: FormData) {
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

    // Get team membership with team and organization
    const teamMembership = await db.membership.findUnique({
      where: { id: membershipId },
      include: {
        team: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!teamMembership || !teamMembership.team) {
      return { success: false, error: "Team membership not found" };
    }

    // Check permissions
    await requireRole(user.id, teamMembership.team.organizationId, ["ADMIN", "PRODUCT_MANAGER"]);

    // Update team member role
    const updatedMembership = await db.membership.update({
      where: { id: membershipId },
      data: {
        role: role as Role,
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: teamMembership.team.organizationId,
      action: "TEAM_MEMBER_ROLE_UPDATED",
      entityType: "TEAM",
      entityId: teamMembership.team.id,
      metadata: {
        teamName: teamMembership.team.name,
        updatedUserId: teamMembership.userId,
        oldRole: teamMembership.role,
        newRole: role,
      },
    });

    revalidatePath(`/orgs/${teamMembership.team.organization.slug}/teams`);
    revalidatePath(`/orgs/${teamMembership.team.organization.slug}/teams/${teamMembership.team.slug}`);
    return { success: true, membership: updatedMembership };
  } catch (error) {
    console.error("Failed to update team member role:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update team member role" };
  }
}

export async function updateTeamMemberRoleForm(formData: FormData) {
  const result = await updateTeamMemberRole(null, formData);
  return result;
}

export async function removeTeamMember(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/signin");
  }

  try {
    const membershipId = formData.get("membershipId") as string;

    if (!membershipId) {
      throw new Error("Membership ID is required");
    }

    // Get team membership with team and organization
    const teamMembership = await db.membership.findUnique({
      where: { id: membershipId },
      include: {
        team: {
          include: {
            organization: true,
          },
        },
        user: true,
      },
    });

    if (!teamMembership || !teamMembership.team) {
      throw new Error("Team membership not found");
    }

    // Check permissions
    await requireRole(user.id, teamMembership.team.organizationId, ["ADMIN", "PRODUCT_MANAGER"]);

    // Delete team membership
    await db.membership.delete({
      where: { id: membershipId },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      organizationId: teamMembership.team.organizationId,
      action: "TEAM_MEMBER_REMOVED",
      entityType: "TEAM",
      entityId: teamMembership.team.id,
      metadata: {
        teamName: teamMembership.team.name,
        removedUserId: teamMembership.userId,
        removedUserEmail: teamMembership.user.email,
      },
    });

    revalidatePath(`/orgs/${teamMembership.team.organization.slug}/teams`);
    revalidatePath(`/orgs/${teamMembership.team.organization.slug}/teams/${teamMembership.team.slug}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to remove team member:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to remove team member");
  }
}