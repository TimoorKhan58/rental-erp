import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getProducts } from "@/features/product/services";
import { getReturns } from "@/features/return/services";
import { getWarehouses } from "@/features/warehouse/services";
import type { ListRepairsParams } from "../types";
import {
  cancelRepair,
  completeRepair,
  createRepair,
  getRepair,
  getRepairs,
  startRepair,
  updateRepair,
} from "../services";

type LookupOption = {
  id: string;
  label: string;
};

export function useRepairPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.repairs.read),
    canCreate: permissions.includes(PERMISSIONS.repairs.create),
    canUpdate: permissions.includes(PERMISSIONS.repairs.update),
    canStart: permissions.includes(PERMISSIONS.repairs.start),
    canComplete: permissions.includes(PERMISSIONS.repairs.complete),
    canCancel: permissions.includes(PERMISSIONS.repairs.cancel),
  };
}

export function useRepairFilterOptions() {
  const completedReturns = useQuery({
    queryKey: queryKeys.returns.list({ pageSize: 100, status: "COMPLETED" }),
    queryFn: () => getReturns({ pageSize: 100, status: "COMPLETED" }),
    staleTime: 5 * 60_000,
  });

  const products = useQuery({
    queryKey: queryKeys.products.list({ pageSize: 100, isActive: true }),
    queryFn: () => getProducts({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  const warehouses = useQuery({
    queryKey: queryKeys.warehouses.list({ pageSize: 100, isActive: true }),
    queryFn: () => getWarehouses({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  const returnOptions: LookupOption[] = (completedReturns.data?.items ?? []).map((item) => ({
    id: item.id,
    label: item.returnNumber,
  }));

  const productOptions: LookupOption[] = (products.data?.items ?? []).map((item) => ({
    id: item.id,
    label: `${item.productCode} — ${item.name}`,
  }));

  const warehouseOptions: LookupOption[] = (warehouses.data?.items ?? []).map((item) => ({
    id: item.id,
    label: `${item.warehouseCode} — ${item.name}`,
  }));

  const returnLabelById = new Map(returnOptions.map((item) => [item.id, item.label]));
  const productLabelById = new Map(productOptions.map((item) => [item.id, item.label]));
  const warehouseLabelById = new Map(warehouseOptions.map((item) => [item.id, item.label]));

  return {
    returnOptions,
    productOptions,
    warehouseOptions,
    returnLabelById,
    productLabelById,
    warehouseLabelById,
    isLoading: completedReturns.isLoading || products.isLoading || warehouses.isLoading,
  };
}

export function useRepairs(params: ListRepairsParams) {
  return useQuery({
    queryKey: queryKeys.repairs.list(params),
    queryFn: () => getRepairs(params),
  });
}

export function useRepair(id: string) {
  return useQuery({
    queryKey: queryKeys.repairs.detail(id),
    queryFn: () => getRepair(id),
    enabled: Boolean(id),
  });
}

export function useRepairsByReturn(returnId: string) {
  return useQuery({
    queryKey: queryKeys.repairs.list({ returnId, pageSize: 100 }),
    queryFn: () => getRepairs({ returnId, pageSize: 100 }),
    enabled: Boolean(returnId),
    staleTime: 60_000,
  });
}

export function useCreateRepair() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: createRepair,
    showSuccessToast: true,
    successMessage: "Repair created successfully.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.repairs.lists() });
    },
  });
}

export function useUpdateRepair() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof updateRepair>[1];
    }) => updateRepair(id, payload),
    showSuccessToast: true,
    successMessage: "Repair updated successfully.",
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.repairs.detail(id) });

      const previous = queryClient.getQueryData(queryKeys.repairs.detail(id));

      if (previous) {
        queryClient.setQueryData(queryKeys.repairs.detail(id), {
          ...previous,
          ...payload,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.repairs.detail(id), context.previous);
      }
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.repairs.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.repairs.detail(data.id) }),
      ]);
    },
  });
}

export function useStartRepair() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: startRepair,
    showSuccessToast: true,
    successMessage: "Repair started.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.repairs.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.repairs.detail(data.id) }),
      ]);
    },
  });
}

export function useCompleteRepair() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: completeRepair,
    showSuccessToast: true,
    successMessage: "Repair completed successfully.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.repairs.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.repairs.detail(data.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() }),
      ]);
    },
  });
}

export function useCancelRepair() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: cancelRepair,
    showSuccessToast: true,
    successMessage: "Repair cancelled.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.repairs.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.repairs.detail(data.id) }),
      ]);
    },
  });
}
