import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type {
  CreateUserPayload,
  IdentityUserCreateResponse,
  IdentityUserListResponse,
  IdentityUserPermissionsResponse,
  IdentityUserProfileResponse,
  IdentityUserResponse,
  ListUsersParams,
  ResetUserPasswordPayload,
  RoleResponse,
  UpdateUserPayload,
} from "../types";

const USERS_BASE = "/users";
const ROLES_BASE = "/roles";

export async function getUsers(
  params: ListUsersParams = {},
): Promise<IdentityUserListResponse> {
  return apiGet<IdentityUserListResponse>(USERS_BASE, { params });
}

export async function getUser(id: string): Promise<IdentityUserResponse> {
  return apiGet<IdentityUserResponse>(`${USERS_BASE}/${id}`);
}

export async function getCurrentUserProfile(): Promise<IdentityUserProfileResponse> {
  return apiGet<IdentityUserProfileResponse>(`${USERS_BASE}/me`);
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<IdentityUserCreateResponse> {
  return apiPost<IdentityUserCreateResponse>(USERS_BASE, payload);
}

export async function updateUser(
  id: string,
  payload: UpdateUserPayload,
): Promise<IdentityUserResponse> {
  return apiPatch<IdentityUserResponse>(`${USERS_BASE}/${id}`, payload);
}

export async function deactivateUser(id: string): Promise<null> {
  return apiDelete<null>(`${USERS_BASE}/${id}`);
}

export async function resetUserPassword(
  id: string,
  payload: ResetUserPasswordPayload,
): Promise<IdentityUserResponse> {
  return apiPost<IdentityUserResponse>(
    `${USERS_BASE}/${id}/reset-password`,
    payload,
  );
}

export async function getUserPermissions(
  id: string,
): Promise<IdentityUserPermissionsResponse> {
  return apiGet<IdentityUserPermissionsResponse>(
    `${USERS_BASE}/${id}/permissions`,
  );
}

export async function getRoles(): Promise<RoleResponse[]> {
  return apiGet<RoleResponse[]>(ROLES_BASE);
}
