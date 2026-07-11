import type {
  SettingsProfileResponse,
  UpdateSettingsPayload,
  UpdateProfilePayload,
  UserProfileResponse,
} from "../types";
import { apiGet, apiPatch } from "@/lib/api";

const SETTINGS_BASE = "/settings";
const USERS_BASE = "/users";

export async function getSettings(): Promise<SettingsProfileResponse> {
  return apiGet<SettingsProfileResponse>(SETTINGS_BASE);
}

export async function updateSettings(
  payload: UpdateSettingsPayload,
): Promise<SettingsProfileResponse> {
  return apiPatch<SettingsProfileResponse>(SETTINGS_BASE, payload);
}

export async function getProfile(): Promise<UserProfileResponse> {
  return apiGet<UserProfileResponse>(`${USERS_BASE}/me`);
}

export async function updateProfile(
  userId: string,
  payload: UpdateProfilePayload,
): Promise<UserProfileResponse> {
  return apiPatch<UserProfileResponse>(`${USERS_BASE}/${userId}`, payload);
}
