"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query/mutations";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { toSecuritySettingsView, toUserPreferencesView } from "../mappers";
import type {
  UpdateProfilePayload,
  UpdateSettingsPayload,
} from "../types";
import {
  getProfile,
  getSettings,
  updateProfile,
  updateSettings,
} from "../services";

export function useSettingsPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canReadSettings: permissions.includes(PERMISSIONS.settings.read),
    canUpdateSettings: permissions.includes(PERMISSIONS.settings.update),
    canReadProfile: permissions.includes(PERMISSIONS.identity.read),
    canUpdateProfile: permissions.includes(PERMISSIONS.identity.update),
  };
}

export function useSettings(enabled = true) {
  return useQuery({
    queryKey: queryKeys.settings.detail(),
    queryFn: getSettings,
    enabled,
  });
}

export function useCompanySettings(enabled = true) {
  const query = useSettings(enabled);

  return {
    ...query,
    data: query.data?.company,
  };
}

export function useUserPreferences(enabled = true) {
  const query = useSettings(enabled);

  return {
    ...query,
    data: query.data
      ? toUserPreferencesView(query.data.company, query.data.system)
      : undefined,
  };
}

export function useSecuritySettings(enabled = true) {
  const query = useSettings(enabled);

  return {
    ...query,
    data: query.data ? toSecuritySettingsView(query.data.system) : undefined,
  };
}

export function useProfile(enabled = true) {
  return useQuery({
    queryKey: queryKeys.settings.profile(),
    queryFn: getProfile,
    enabled,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: updateSettings,
    showSuccessToast: true,
    successMessage: "Settings saved successfully.",
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.settings.detail(), data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: UpdateProfilePayload;
    }) => updateProfile(userId, payload),
    showSuccessToast: true,
    successMessage: "Profile updated successfully.",
    onMutate: async ({ userId, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settings.profile() });
      const previous = queryClient.getQueryData(queryKeys.settings.profile());

      if (previous && typeof previous === "object") {
        queryClient.setQueryData(queryKeys.settings.profile(), {
          ...previous,
          ...payload,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previous, userId };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.settings.profile(), context.previous);
      }
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(queryKeys.settings.profile(), data);
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings.profile() });
    },
  });
}

export type { UpdateSettingsPayload };
