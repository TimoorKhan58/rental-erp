import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getProducts } from "@/features/product/services";
import { getSuppliers } from "@/features/supplier/services";
import { getWarehouses } from "@/features/warehouse/services";
import type { ListExternalRentalsParams } from "../types";
import {
  allocateExternalRental,
  cancelExternalRental,
  confirmExternalRental,
  createExternalRental,
  getExternalRental,
  getExternalRentals,
  receiveExternalRental,
  returnExternalRentalToSupplier,
  settleExternalRental,
} from "../services";

async function invalidateExternalRental(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.externalRentals.lists(),
  });
  if (id) {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.externalRentals.detail(id),
    });
  }
}

export function useExternalRentalPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.externalRentals.read),
    canCreate: permissions.includes(PERMISSIONS.externalRentals.create),
    canConfirm: permissions.includes(PERMISSIONS.externalRentals.confirm),
    canReceive: permissions.includes(PERMISSIONS.externalRentals.receive),
    canAllocate: permissions.includes(PERMISSIONS.externalRentals.allocate),
    canReturnToSupplier: permissions.includes(
      PERMISSIONS.externalRentals.returnToSupplier,
    ),
    canSettle: permissions.includes(PERMISSIONS.externalRentals.settle),
    canCancel: permissions.includes(PERMISSIONS.externalRentals.cancel),
  };
}

export function useExternalRentalFilterOptions() {
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

  const supplierOptions = (suppliers.data?.items ?? []).map((item) => ({
    id: item.id,
    label: `${item.supplierCode} — ${item.name}`,
  }));
  const warehouseOptions = (warehouses.data?.items ?? []).map((item) => ({
    id: item.id,
    label: `${item.warehouseCode} — ${item.name}`,
  }));
  const productOptions = (products.data?.items ?? []).map((item) => ({
    id: item.id,
    label: `${item.productCode} — ${item.name}`,
  }));

  return {
    supplierOptions,
    warehouseOptions,
    productOptions,
    supplierLabelById: new Map(supplierOptions.map((o) => [o.id, o.label])),
    warehouseLabelById: new Map(warehouseOptions.map((o) => [o.id, o.label])),
    productLabelById: new Map(productOptions.map((o) => [o.id, o.label])),
    isLoading: suppliers.isLoading || warehouses.isLoading || products.isLoading,
  };
}

export function useExternalRentals(params: ListExternalRentalsParams) {
  return useQuery({
    queryKey: queryKeys.externalRentals.list(params),
    queryFn: () => getExternalRentals(params),
  });
}

export function useExternalRental(id: string) {
  return useQuery({
    queryKey: queryKeys.externalRentals.detail(id),
    queryFn: () => getExternalRental(id),
    enabled: Boolean(id),
  });
}

export function useCreateExternalRental() {
  const queryClient = useQueryClient();
  return useAppMutation({
    mutationFn: createExternalRental,
    showSuccessToast: true,
    successMessage: "External rental agreement created.",
    onSuccess: async () => {
      await invalidateExternalRental(queryClient);
    },
  });
}

export function useConfirmExternalRental() {
  const queryClient = useQueryClient();
  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload?: Parameters<typeof confirmExternalRental>[1];
    }) => confirmExternalRental(id, payload),
    showSuccessToast: true,
    successMessage: "External rental confirmed.",
    onSuccess: async (_data, variables) => {
      await invalidateExternalRental(queryClient, variables.id);
    },
  });
}

export function useReceiveExternalRental() {
  const queryClient = useQueryClient();
  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof receiveExternalRental>[1];
    }) => receiveExternalRental(id, payload),
    showSuccessToast: true,
    successMessage: "External rental received.",
    onSuccess: async (_data, variables) => {
      await invalidateExternalRental(queryClient, variables.id);
    },
  });
}

export function useAllocateExternalRental() {
  const queryClient = useQueryClient();
  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof allocateExternalRental>[1];
    }) => allocateExternalRental(id, payload),
    showSuccessToast: true,
    successMessage: "External rental allocated.",
    onSuccess: async (_data, variables) => {
      await invalidateExternalRental(queryClient, variables.id);
    },
  });
}

export function useSupplierReturnExternalRental() {
  const queryClient = useQueryClient();
  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof returnExternalRentalToSupplier>[1];
    }) => returnExternalRentalToSupplier(id, payload),
    showSuccessToast: true,
    successMessage: "Returned to supplier.",
    onSuccess: async (_data, variables) => {
      await invalidateExternalRental(queryClient, variables.id);
    },
  });
}

export function useSettleExternalRental() {
  const queryClient = useQueryClient();
  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof settleExternalRental>[1];
    }) => settleExternalRental(id, payload),
    showSuccessToast: true,
    successMessage: "Settlement recorded.",
    onSuccess: async (_data, variables) => {
      await invalidateExternalRental(queryClient, variables.id);
    },
  });
}

export function useCancelExternalRental() {
  const queryClient = useQueryClient();
  return useAppMutation({
    mutationFn: (id: string) => cancelExternalRental(id),
    showSuccessToast: true,
    successMessage: "External rental cancelled.",
    onSuccess: async (_data, id) => {
      await invalidateExternalRental(queryClient, id);
    },
  });
}
