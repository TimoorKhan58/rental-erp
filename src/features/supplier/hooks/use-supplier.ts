import { useQuery } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import type { ListSuppliersParams } from "../types";
import {
  createSupplier,
  deleteSupplier,
  getSupplier,
  getSuppliers,
  updateSupplier,
} from "../services";
import { useAppMutation } from "@/lib/query";
import { useQueryClient } from "@tanstack/react-query";

export function useSupplierPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.suppliers.read),
    canCreate: permissions.includes(PERMISSIONS.suppliers.create),
    canUpdate: permissions.includes(PERMISSIONS.suppliers.update),
    canDelete: permissions.includes(PERMISSIONS.suppliers.delete),
  };
}

export function useSuppliers(params: ListSuppliersParams) {
  return useQuery({
    queryKey: queryKeys.suppliers.list(params),
    queryFn: () => getSuppliers(params),
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.detail(id),
    queryFn: () => getSupplier(id),
    enabled: Boolean(id),
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: createSupplier,
    showSuccessToast: true,
    successMessage: "Supplier created successfully.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.lists() });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateSupplier>[1] }) =>
      updateSupplier(id, payload),
    showSuccessToast: true,
    successMessage: "Supplier updated successfully.",
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.suppliers.detail(id) });

      const previous = queryClient.getQueryData(queryKeys.suppliers.detail(id));

      if (previous) {
        queryClient.setQueryData(queryKeys.suppliers.detail(id), {
          ...previous,
          ...payload,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.suppliers.detail(id), context.previous);
      }
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.detail(data.id) }),
      ]);
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: deleteSupplier,
    showSuccessToast: true,
    successMessage: "Supplier deleted successfully.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.lists() });
    },
  });
}

export function useToggleSupplierStatus() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateSupplier(id, { isActive }),
    showSuccessToast: true,
    successMessage: "Supplier status updated.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.detail(data.id) }),
      ]);
    },
  });
}
