import type {
  CreateUserPayload,
  ListUsersParams,
  ResetUserPasswordPayload,
  RoleResponse,
  UpdateUserPayload,
  UserListResponse,
  UserResponse,
} from "../types";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

const BASE = "/users";

export async function getUsers(params: ListUsersParams = {}): Promise<UserListResponse> {
  return apiGet<UserListResponse>(BASE, { params });
}

export async function getUser(id: string): Promise<UserResponse> {
  return apiGet<UserResponse>(`${BASE}/${id}`);
}

export async function getRoles(): Promise<RoleResponse[]> {
  return apiGet<RoleResponse[]>("/roles");
}

export async function createUser(payload: CreateUserPayload): Promise<UserResponse> {
  return apiPost<UserResponse>(BASE, payload);
}

export async function updateUser(
  id: string,
  payload: UpdateUserPayload,
): Promise<UserResponse> {
  return apiPatch<UserResponse>(`${BASE}/${id}`, payload);
}

export async function activateUser(id: string): Promise<UserResponse> {
  return updateUser(id, { isActive: true });
}

export async function deactivateUser(id: string): Promise<null> {
  return apiDelete<null>(`${BASE}/${id}`);
}

export async function resetUserPassword(
  id: string,
  payload: ResetUserPasswordPayload,
): Promise<UserResponse> {
  return apiPost<UserResponse>(`${BASE}/${id}/reset-password`, payload);
}
