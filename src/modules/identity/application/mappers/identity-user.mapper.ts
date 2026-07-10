import type { IdentityUser } from "@/modules/identity/domain/identity-user.entity";
import type { Role } from "@/modules/identity/domain/role.entity";
import type { CreateIdentityUserData } from "@/modules/identity/domain/identity-user.types";
import type { CreateIdentityUserInput } from "../schemas/identity-user.schemas";
import type {
  IdentityUserDto,
  IdentityUserProfileDto,
  RoleDto,
} from "../dtos/identity-user.dto";
import { USER_ROLE_LABELS } from "@/constants/roles";
import { ROLE_PERMISSIONS } from "@/shared/application/authorization/role-permissions";

export function toCreateIdentityUserData(
  input: CreateIdentityUserInput,
  role: Role,
): CreateIdentityUserData {
  return {
    name: input.name,
    email: input.email,
    roleId: role.id,
    roleName: role.name,
    isActive: input.isActive,
  };
}

export function toIdentityUserDto(user: IdentityUser): IdentityUserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleId: user.roleId,
    role: user.roleName,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function toIdentityUserProfileDto(user: IdentityUser): IdentityUserProfileDto {
  const dto = toIdentityUserDto(user);

  return {
    ...dto,
    permissions: [...ROLE_PERMISSIONS[user.roleName]],
  };
}

export function toRoleDto(role: Role): RoleDto {
  return {
    id: role.id,
    name: role.name,
    label: USER_ROLE_LABELS[role.name],
  };
}
