import { useQuery } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import type { ListWarehousesParams } from "../types";
import {
  createWarehouse,
  deleteWarehouse,
  getWarehouse,
  getWarehouses,
  updateWarehouse,
} from "../services";
import { useAppMutation } from "@/lib/query";
import { useQueryClient } from "@tanstack/react-query";

export function useWarehousePermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.warehouses.read),
    canCreate: permissions.includes(PERMISSIONS.warehouses.create),
    canUpdate: permissions.includes(PERMISSIONS.warehouses.update),
    canDelete: permissions.includes(PERMISSIONS.warehouses.delete),
  };
}

export function useWarehouses(params: ListWarehousesParams) {
  return useQuery({
    queryKey: queryKeys.warehouses.list(params),
    queryFn: () => getWarehouses(params),
  });
}

export function useWarehouse(id: string) {
  return useQuery({
    queryKey: queryKeys.warehouses.detail(id),
    queryFn: () => getWarehouse(id),
    enabled: Boolean(id),
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: createWarehouse,
    showSuccessToast: true,
    successMessage: "Warehouse created successfully.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.lists() });
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateWarehouse>[1] }) =>
      updateWarehouse(id, payload),
    showSuccessToast: true,
    successMessage: "Warehouse updated successfully.",
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.warehouses.detail(id) });

      const previous = queryClient.getQueryData(queryKeys.warehouses.detail(id));

      if (previous) {
        queryClient.setQueryData(queryKeys.warehouses.detail(id), {
          ...previous,
          ...payload,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.warehouses.detail(id), context.previous);
      }
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.detail(data.id) }),
      ]);
    },
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: deleteWarehouse,
    showSuccessToast: true,
    successMessage: "Warehouse deleted successfully.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.lists() });
    },
  });
}

export function useToggleWarehouseStatus() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateWarehouse(id, { isActive }),
    showSuccessToast: true,
    successMessage: "Warehouse status updated.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.warehouses.detail(data.id) }),
      ]);
    },
  });
}
