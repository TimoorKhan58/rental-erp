import type { RequestContext } from "@/shared/application/context";
import { ForbiddenError } from "@/shared/infrastructure/errors";

import type { Permission } from "./permissions";
import { ROLE_PERMISSIONS } from "./role-permissions";
import { isUserRole } from "./types";

function getPermissionsForRole(role: string | undefined): readonly Permission[] {
  if (role === undefined || !isUserRole(role)) {
    return [];
  }

  return ROLE_PERMISSIONS[role];
}

export function can(ctx: RequestContext, permission: Permission): boolean {
  const rolePermissions = getPermissionsForRole(ctx.role);
  return rolePermissions.includes(permission);
}

export function assertPermission(
  ctx: RequestContext,
  permission: Permission,
): void {
  if (can(ctx, permission)) {
    return;
  }

  throw new ForbiddenError({
    details: {
      permission,
      role: ctx.role,
    },
  });
}

export function assertAny(
  ctx: RequestContext,
  permissions: readonly Permission[],
): void {
  const hasAnyPermission = permissions.some((permission) =>
    can(ctx, permission),
  );

  if (hasAnyPermission) {
    return;
  }

  throw new ForbiddenError({
    details: {
      permissions,
      role: ctx.role,
    },
  });
}

export function assertAll(
  ctx: RequestContext,
  permissions: readonly Permission[],
): void {
  const missingPermissions = permissions.filter(
    (permission) => !can(ctx, permission),
  );

  if (missingPermissions.length === 0) {
    return;
  }

  throw new ForbiddenError({
    details: {
      permissions,
      missingPermissions,
      role: ctx.role,
    },
  });
}

export const permissionChecker = {
  can,
  assertPermission,
  assertAny,
  assertAll,
} as const;
