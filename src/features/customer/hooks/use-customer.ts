import { useQuery } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { getCurrentUserPermissions } from "../services";
import type { ListCustomersParams } from "../types";
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  getCustomers,
  updateCustomer,
} from "../services";
import { useAppMutation } from "@/lib/query";
import { useQueryClient } from "@tanstack/react-query";

export function useUserPermissions() {
  return useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });
}

export function useCustomerPermissions() {
  const { data, isLoading } = useUserPermissions();

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.customers.read),
    canCreate: permissions.includes(PERMISSIONS.customers.create),
    canUpdate: permissions.includes(PERMISSIONS.customers.update),
    canDelete: permissions.includes(PERMISSIONS.customers.delete),
  };
}

export function useCustomerStats() {
  const totalQuery = useQuery({
    queryKey: queryKeys.customers.list({ pageSize: 1 }),
    queryFn: () => getCustomers({ pageSize: 1 }),
    staleTime: 60_000,
  });

  const activeQuery = useQuery({
    queryKey: queryKeys.customers.list({ pageSize: 1, isActive: true }),
    queryFn: () => getCustomers({ pageSize: 1, isActive: true }),
    staleTime: 60_000,
  });

  const inactiveQuery = useQuery({
    queryKey: queryKeys.customers.list({ pageSize: 1, isActive: false }),
    queryFn: () => getCustomers({ pageSize: 1, isActive: false }),
    staleTime: 60_000,
  });

  return {
    total: totalQuery.data?.meta.total ?? 0,
    active: activeQuery.data?.meta.total ?? 0,
    inactive: inactiveQuery.data?.meta.total ?? 0,
    isLoading: totalQuery.isLoading || activeQuery.isLoading || inactiveQuery.isLoading,
  };
}

export function useCustomers(params: ListCustomersParams) {
  return useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: () => getCustomers(params),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => getCustomer(id),
    enabled: Boolean(id),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: createCustomer,
    showSuccessToast: true,
    successMessage: "Customer created successfully.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateCustomer>[1] }) =>
      updateCustomer(id, payload),
    showSuccessToast: true,
    successMessage: "Customer updated successfully.",
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.customers.detail(id) });

      const previous = queryClient.getQueryData(queryKeys.customers.detail(id));

      if (previous) {
        queryClient.setQueryData(queryKeys.customers.detail(id), {
          ...previous,
          ...payload,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.customers.detail(id), context.previous);
      }
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(data.id) }),
      ]);
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: deleteCustomer,
    showSuccessToast: true,
    successMessage: "Customer deleted successfully.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() });
    },
  });
}

export function useToggleCustomerStatus() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateCustomer(id, { isActive }),
    showSuccessToast: true,
    successMessage: "Customer status updated.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(data.id) }),
      ]);
    },
  });
}
