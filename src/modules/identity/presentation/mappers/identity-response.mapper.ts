import type {
  IdentityUserDto,
  IdentityUserPermissionsDto,
  IdentityUserProfileDto,
  RoleDto,
} from "@/modules/identity/application/dtos/identity-user.dto";
import type { PaginatedResult } from "@/shared/domain/pagination";

export interface IdentityUserResponse {
  id: string;
  name: string;
  email: string;
  roleId: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityUserProfileResponse extends IdentityUserResponse {
  permissions: string[];
}

export interface IdentityUserPermissionsResponse {
  userId: string;
  role: string;
  permissions: string[];
}

export interface RoleResponse {
  id: string;
  name: string;
  label: string;
}

export interface IdentityUserListResponse {
  items: IdentityUserResponse[];
  meta: PaginatedResult<IdentityUserDto>["meta"];
}

export function toIdentityUserResponse(dto: IdentityUserDto): IdentityUserResponse {
  return {
    id: dto.id,
    name: dto.name,
    email: dto.email,
    roleId: dto.roleId,
    role: dto.role,
    isActive: dto.isActive,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toIdentityUserProfileResponse(
  dto: IdentityUserProfileDto,
): IdentityUserProfileResponse {
  return {
    ...toIdentityUserResponse(dto),
    permissions: [...dto.permissions],
  };
}

export function toIdentityUserPermissionsResponse(
  dto: IdentityUserPermissionsDto,
): IdentityUserPermissionsResponse {
  return {
    userId: dto.userId,
    role: dto.role,
    permissions: [...dto.permissions],
  };
}

export function toRoleResponse(dto: RoleDto): RoleResponse {
  return {
    id: dto.id,
    name: dto.name,
    label: dto.label,
  };
}

export function toIdentityUserListResponse(
  paginated: PaginatedResult<IdentityUserDto>,
): IdentityUserListResponse {
  return {
    items: paginated.items.map(toIdentityUserResponse),
    meta: paginated.meta,
  };
}

export function toRoleListResponse(dtos: RoleDto[]): RoleResponse[] {
  return dtos.map(toRoleResponse);
}
