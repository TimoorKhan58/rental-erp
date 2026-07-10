import type { Prisma } from "@/generated/prisma/client";
import { IdentityUser } from "@/modules/identity/domain/identity-user.entity";
import { Role } from "@/modules/identity/domain/role.entity";
import type {
  CreateIdentityUserData,
  UpdateIdentityUserData,
} from "@/modules/identity/domain/identity-user.types";
import type { RoleId, UserId } from "@/shared/domain/ids";
import { isUserRole } from "@/shared/application/authorization/types";

type IdentityUserRecord = Prisma.UserGetPayload<{
  include: { role: true };
}>;

export function toIdentityUserDomain(record: IdentityUserRecord): IdentityUser {
  const roleName = record.role.name;

  if (!isUserRole(roleName)) {
    throw new Error(`Unsupported role name: ${roleName}`);
  }

  return IdentityUser.reconstitute({
    id: record.id as UserId,
    name: record.name,
    email: record.email,
    roleId: record.roleId as RoleId,
    roleName,
    authUserId: record.authUserId,
    isActive: record.isActive,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toRoleDomain(record: { id: string; name: string }): Role {
  const roleName = record.name;

  if (!isUserRole(roleName)) {
    throw new Error(`Unsupported role name: ${roleName}`);
  }

  return Role.reconstitute({
    id: record.id as RoleId,
    name: roleName,
  });
}

export function toIdentityUserCreateInput(
  data: CreateIdentityUserData,
): Prisma.UserCreateInput {
  return {
    name: data.name,
    email: data.email,
    isActive: data.isActive ?? true,
    role: {
      connect: { id: data.roleId },
    },
  };
}

export function toIdentityUserUpdateInput(
  data: UpdateIdentityUserData,
): Prisma.UserUpdateInput {
  const input: Prisma.UserUpdateInput = {};

  if (data.name !== undefined) {
    input.name = data.name;
  }

  if (data.email !== undefined) {
    input.email = data.email;
  }

  if (data.isActive !== undefined) {
    input.isActive = data.isActive;
  }

  if (data.authUserId !== undefined) {
    input.authUser =
      data.authUserId === null
        ? { disconnect: true }
        : { connect: { id: data.authUserId } };
  }

  if (data.roleId !== undefined) {
    input.role = {
      connect: { id: data.roleId },
    };
  }

  return input;
}
