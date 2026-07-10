import type { RoleId, UserId } from "@/shared/domain/ids";
import type { UserRole } from "@/constants/roles";

export interface CreateIdentityUserData {
  name: string;
  email: string;
  roleId: RoleId;
  roleName: UserRole;
  isActive?: boolean;
}

export interface UpdateIdentityUserData {
  name?: string;
  email?: string;
  roleId?: RoleId;
  roleName?: UserRole;
  authUserId?: string | null;
  isActive?: boolean;
}

export interface LinkAuthUserData {
  userId: UserId;
  authUserId: string;
}
