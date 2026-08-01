import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys, useAppMutation } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import type {
  CreateUserPayload,
  ListUsersParams,
  ResetUserPasswordPayload,
  UpdateUserPayload,
} from "../types";
import {
  createUser,
  deactivateUser,
  getCurrentUserProfile,
  getRoles,
  getUser,
  getUserPermissions,
  getUsers,
  resetUserPassword,
  updateUser,
} from "../services";

export function useIdentityPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.identity.read),
    canCreate: permissions.includes(PERMISSIONS.identity.create),
    canUpdate: permissions.includes(PERMISSIONS.identity.update),
    canDelete: permissions.includes(PERMISSIONS.identity.delete),
  };
}

export function useCurrentIdentityProfile(enabled = true) {
  return useQuery({
    queryKey: queryKeys.settings.profile(),
    queryFn: getCurrentUserProfile,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useUsers(params: ListUsersParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => getUsers(params),
    enabled,
  });
}

export function useUser(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => getUser(id),
    enabled: enabled && Boolean(id),
  });
}

export function useUserPermissionsDetail(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.permissions(id),
    queryFn: () => getUserPermissions(id),
    enabled: enabled && Boolean(id),
  });
}

export function useRoles(enabled = true) {
  return useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: getRoles,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    showSuccessToast: false,
    onSuccess: async (data) => {
      if (data.invitationDelivered === false) {
        toast.warning(
          "User created successfully, but the invitation email could not be delivered. The user can use Forgot Password or an administrator can reset the password later.",
        );
      } else {
        toast.success("User created successfully.");
      }

      await queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateUserPayload;
    }) => updateUser(id, payload),
    showSuccessToast: true,
    successMessage: "User updated successfully.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.detail(data.id),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.permissions(data.id),
        }),
      ]);
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: deactivateUser,
    showSuccessToast: true,
    successMessage: "User disabled successfully.",
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) }),
      ]);
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({
      id,
      isActive,
    }: {
      id: string;
      isActive: boolean;
    }) => updateUser(id, { isActive }),
    showSuccessToast: true,
    successMessage: "User status updated.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.detail(data.id),
        }),
      ]);
    },
  });
}

export function useResetUserPassword() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: ResetUserPasswordPayload;
    }) => resetUserPassword(id, payload),
    showSuccessToast: true,
    successMessage: "Password reset successfully. Active sessions were revoked.",
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.users.detail(data.id),
      });
    },
  });
}
