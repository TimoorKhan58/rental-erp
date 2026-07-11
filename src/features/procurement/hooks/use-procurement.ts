import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getProducts } from "@/features/product/services";
import { getSuppliers } from "@/features/supplier/services";
import { getWarehouses } from "@/features/warehouse/services";
import type { ListProcurementsParams } from "../types";
import {
  approveProcurement,
  cancelProcurement,
  createProcurement,
  getProcurement,
  getProcurements,
  receiveProcurement,
  updateProcurement,
} from "../services";

type LookupOption = {
  id: string;
  label: string;
};

export function useProcurementPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.purchaseOrders.read),
    canCreate: permissions.includes(PERMISSIONS.purchaseOrders.create),
    canUpdate: permissions.includes(PERMISSIONS.purchaseOrders.update),
    canApprove: permissions.includes(PERMISSIONS.purchaseOrders.approve),
    canReceive: permissions.includes(PERMISSIONS.purchaseOrders.receive),
    canCancel: permissions.includes(PERMISSIONS.purchaseOrders.cancel),
  };
}

export function useProcurementFilterOptions() {
  const suppliers = useQuery({
    queryKey: queryKeys.suppliers.list({ pageSize: 100, isActive: true }),
    queryFn: () => getSuppliers({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  const warehouses = useQuery({
    queryKey: queryKeys.warehouses.list({ pageSize: 100, isActive: true }),
    queryFn: () => getWarehouses({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  const products = useQuery({
    queryKey: queryKeys.products.list({ pageSize: 100, isActive: true }),
    queryFn: () => getProducts({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  const supplierOptions: LookupOption[] = (suppliers.data?.items ?? []).map((item) => ({
    id: item.id,
    label: `${item.supplierCode} — ${item.name}`,
  }));

  const warehouseOptions: LookupOption[] = (warehouses.data?.items ?? []).map((item) => ({
    id: item.id,
    label: `${item.warehouseCode} — ${item.name}`,
  }));

  const productOptions: LookupOption[] = (products.data?.items ?? []).map((item) => ({
    id: item.id,
    label: `${item.productCode} — ${item.name}`,
  }));

  const supplierLabelById = new Map(supplierOptions.map((item) => [item.id, item.label]));
  const warehouseLabelById = new Map(warehouseOptions.map((item) => [item.id, item.label]));
  const productLabelById = new Map(productOptions.map((item) => [item.id, item.label]));

  return {
    supplierOptions,
    warehouseOptions,
    productOptions,
    supplierLabelById,
    warehouseLabelById,
    productLabelById,
    isLoading: suppliers.isLoading || warehouses.isLoading || products.isLoading,
  };
}

export function useProcurements(params: ListProcurementsParams) {
  return useQuery({
    queryKey: queryKeys.procurement.list(params),
    queryFn: () => getProcurements(params),
  });
}

export function useProcurement(id: string) {
  return useQuery({
    queryKey: queryKeys.procurement.detail(id),
    queryFn: () => getProcurement(id),
    enabled: Boolean(id),
  });
}

export function useCreateProcurement() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: createProcurement,
    showSuccessToast: true,
    successMessage: "Purchase order created successfully.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.procurement.lists() });
    },
  });
}

export function useUpdateProcurement() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof updateProcurement>[1];
    }) => updateProcurement(id, payload),
    showSuccessToast: true,
    successMessage: "Purchase order updated successfully.",
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.procurement.detail(id) });

      const previous = queryClient.getQueryData(queryKeys.procurement.detail(id));

      if (previous) {
        queryClient.setQueryData(queryKeys.procurement.detail(id), {
          ...previous,
          ...payload,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.procurement.detail(id), context.previous);
      }
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.procurement.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.procurement.detail(data.id) }),
      ]);
    },
  });
}

export function useApproveProcurement() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: approveProcurement,
    showSuccessToast: true,
    successMessage: "Purchase order approved.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.procurement.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.procurement.detail(data.id) }),
      ]);
    },
  });
}

export function useReceiveProcurement() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof receiveProcurement>[1];
    }) => receiveProcurement(id, payload),
    showSuccessToast: true,
    successMessage: "Goods received successfully.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.procurement.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.procurement.detail(data.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() }),
      ]);
    },
  });
}

export function useCancelProcurement() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: cancelProcurement,
    showSuccessToast: true,
    successMessage: "Purchase order cancelled.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.procurement.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.procurement.detail(data.id) }),
      ]);
    },
  });
}
