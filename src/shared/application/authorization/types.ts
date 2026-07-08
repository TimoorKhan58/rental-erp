import type { UserRole } from "@/constants/roles";
import { USER_ROLE_LIST } from "@/constants/roles";
import type { RequestContext } from "@/shared/application/context";

import type { Permission } from "./permissions";
import type { ROLE_PERMISSIONS } from "./role-permissions";

export type { Permission };

export type RolePermissions = typeof ROLE_PERMISSIONS;

export interface PermissionChecker {
  can(ctx: RequestContext, permission: Permission): boolean;
  assertPermission(ctx: RequestContext, permission: Permission): void;
  assertAny(ctx: RequestContext, permissions: readonly Permission[]): void;
  assertAll(ctx: RequestContext, permissions: readonly Permission[]): void;
}

export function isUserRole(role: string): role is UserRole {
  return USER_ROLE_LIST.includes(role as UserRole);
}
