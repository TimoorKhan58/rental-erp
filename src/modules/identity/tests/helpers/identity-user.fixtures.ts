import { IdentityUser } from "@/modules/identity/domain/identity-user.entity";
import type { IdentityUserProps } from "@/modules/identity/domain/identity-user.entity";
import { USER_ROLES } from "@/constants/roles";
import type { RoleId, UserId } from "@/shared/domain/ids";

export const USER_ID = "10000000-0000-4000-8000-000000000001" as UserId;
export const OTHER_USER_ID = "10000000-0000-4000-8000-000000000002" as UserId;
export const OWNER_ROLE_ID = "00000000-0000-4000-8000-000000000001" as RoleId;
export const MANAGER_ROLE_ID = "00000000-0000-4000-8000-000000000002" as RoleId;
export const VIEWER_ROLE_ID = "00000000-0000-4000-8000-000000000005" as RoleId;

export const VALID_CREATE_INPUT = {
  name: "Jane Admin",
  email: "jane.admin@example.com",
  password: "password123",
  role: USER_ROLES.MANAGER,
  isActive: true,
} as const;

export function buildIdentityUserProps(
  overrides: Partial<IdentityUserProps> = {},
): IdentityUserProps {
  const now = new Date("2026-07-10T10:00:00.000Z");

  return {
    id: USER_ID,
    name: "Owner User",
    email: "owner@example.com",
    roleId: OWNER_ROLE_ID,
    roleName: USER_ROLES.OWNER,
    authUserId: "auth-owner-1",
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function buildIdentityUserEntity(
  overrides: Partial<IdentityUserProps> = {},
): IdentityUser {
  return IdentityUser.reconstitute(buildIdentityUserProps(overrides));
}
