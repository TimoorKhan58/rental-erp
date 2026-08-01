import type { UserRole } from "@/constants/roles";
import type { PaginationMeta } from "@/types/api";

export type IdentityUserResponse = {
  id: string;
  name: string;
  email: string;
  roleId: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type IdentityUserCreateResponse = IdentityUserResponse & {
  invitationDelivered: boolean;
};

export type IdentityUserListResponse = {
  items: IdentityUserResponse[];
  meta: PaginationMeta;
};

export type IdentityUserProfileResponse = IdentityUserResponse & {
  permissions: string[];
};

export type IdentityUserPermissionsResponse = {
  userId: string;
  role: UserRole;
  permissions: string[];
};

export type RoleResponse = {
  id: string;
  name: UserRole;
  label: string;
};

export type UserSortField = "name" | "email" | "createdAt" | "isActive";

export type ListUsersParams = {
  page?: number;
  pageSize?: number;
  sortBy?: UserSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  isActive?: boolean;
  role?: UserRole;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
};

export type UpdateUserPayload = {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
};

export type ResetUserPasswordPayload = {
  password: string;
};
