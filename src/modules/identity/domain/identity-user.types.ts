import type { RoleId, UserId } from "@/shared/domain/ids";
import type { UserRole } from "@/constants/roles";

export interface CreateIdentityUserData {
  name: string;
  email: string;
  roleId: RoleId;
  roleName: UserRole;
  isActive?: boolean;
  /** Password chosen by someone else; must be changed at sign-in (SaaS phase 3d). */
  mustChangePassword?: boolean;
}

export interface UpdateIdentityUserData {
  name?: string;
  email?: string;
  roleId?: RoleId;
  roleName?: UserRole;
  authUserId?: string | null;
  isActive?: boolean;
  mustChangePassword?: boolean;
}

export interface LinkAuthUserData {
  userId: UserId;
  authUserId: string;
}
