import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: true,
      memberships: {
        include: {
          organization: true,
          team: true,
        },
      },
    },
  });

  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/auth/signin");
  }
  
  return user;
}

export async function requireOrganization(organizationId: string) {
  const user = await requireAuth();
  
  const membership = user.memberships.find(
    (m) => m.organizationId === organizationId
  );
  
  if (!membership) {
    throw new Error("Access denied: Not a member of this organization");
  }
  
  return { user, membership };
}

// Updated requireRole function with correct signature for FormData actions
export async function requireRole(
  userId: string,
  organizationId: string,
  allowedRoles: Role[]
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: { organizationId },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const membership = user.memberships[0];
  if (!membership) {
    throw new Error("Access denied: Not a member of this organization");
  }

  if (!allowedRoles.includes(membership.role)) {
    throw new Error("Access denied: Insufficient permissions");
  }

  return { user, membership };
}

export function hasRole(
  memberships: any[],
  organizationId: string,
  minimumRole: Role
): boolean {
  const membership = memberships.find(
    (m) => m.organizationId === organizationId
  );
  
  if (!membership) return false;
  
  const roleHierarchy: Record<Role, number> = {
    STAKEHOLDER: 0,
    CONTRIBUTOR: 1,
    PRODUCT_MANAGER: 2,
    ADMIN: 3,
  };
  
  const userRoleLevel = roleHierarchy[membership.role as Role];
  const requiredRoleLevel = roleHierarchy[minimumRole];
  
  return userRoleLevel >= requiredRoleLevel;
}

export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hashedPassword);
}

// Audit logging helper
export async function createAuditLog({
  action,
  entity,
  entityId,
  changes,
  metadata,
  userId,
  organizationId,
  ipAddress,
  userAgent,
}: {
  action: string;
  entity: string;
  entityId: string;
  changes?: any;
  metadata?: any;
  userId?: string;
  organizationId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  await db.auditLog.create({
    data: {
      action,
      entity,
      entityId,
      changes,
      metadata,
      userId,
      organizationId,
      ipAddress,
      userAgent,
    },
  });
}

// Activity logging function for new actions
export async function logActivity({
  userId,
  organizationId,
  action,
  entityType,
  entityId,
  metadata,
}: {
  userId: string;
  organizationId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: any;
}) {
  await db.auditLog.create({
    data: {
      action,
      entity: entityType,
      entityId,
      metadata,
      userId,
      organizationId,
    },
  });
}