import type { UserRole } from "@/constants/roles";
import type { Permission } from "@/shared/application/authorization";

export interface RoleDto {
  id: string;
  name: UserRole;
  label: string;
}

export interface IdentityUserDto {
  id: string;
  name: string;
  email: string;
  roleId: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Create-user result: identity fields plus invite delivery visibility. */
export interface CreateIdentityUserResultDto extends IdentityUserDto {
  invitationDelivered: boolean;
}

export interface IdentityUserPermissionsDto {
  userId: string;
  role: UserRole;
  permissions: Permission[];
}

export interface IdentityUserProfileDto extends IdentityUserDto {
  permissions: Permission[];
}
