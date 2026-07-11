import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getCustomers } from "@/features/customer/services";
import { getProducts } from "@/features/product/services";
import { getWarehouses } from "@/features/warehouse/services";
import type { ListRentalOrdersParams } from "../types";
import {
  cancelRentalOrder,
  confirmRentalOrder,
  createRentalOrder,
  getRentalOrder,
  getRentalOrders,
  reserveRentalOrder,
  updateRentalOrder,
} from "../services";

type LookupOption = {
  id: string;
  label: string;
};

export function useRentalOrderPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.rentalOrders.read),
    canCreate: permissions.includes(PERMISSIONS.rentalOrders.create),
    canUpdate: permissions.includes(PERMISSIONS.rentalOrders.update),
    canConfirm: permissions.includes(PERMISSIONS.rentalOrders.confirm),
    canReserve: permissions.includes(PERMISSIONS.rentalOrders.reserve),
    canCancel: permissions.includes(PERMISSIONS.rentalOrders.cancel),
  };
}

export function useRentalOrderFilterOptions() {
  const customers = useQuery({
    queryKey: queryKeys.customers.list({ pageSize: 100, isActive: true }),
    queryFn: () => getCustomers({ pageSize: 100, isActive: true }),
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

  const customerOptions: LookupOption[] = (customers.data?.items ?? []).map((item) => ({
    id: item.id,
    label: `${item.customerCode} — ${item.name}`,
  }));

  const warehouseOptions: LookupOption[] = (warehouses.data?.items ?? []).map((item) => ({
    id: item.id,
    label: `${item.warehouseCode} — ${item.name}`,
  }));

  const productOptions: LookupOption[] = (products.data?.items ?? []).map((item) => ({
    id: item.id,
    label: `${item.productCode} — ${item.name}`,
  }));

  const customerLabelById = new Map(customerOptions.map((item) => [item.id, item.label]));
  const warehouseLabelById = new Map(warehouseOptions.map((item) => [item.id, item.label]));
  const productLabelById = new Map(productOptions.map((item) => [item.id, item.label]));

  return {
    customerOptions,
    warehouseOptions,
    productOptions,
    customerLabelById,
    warehouseLabelById,
    productLabelById,
    isLoading: customers.isLoading || warehouses.isLoading || products.isLoading,
  };
}

export function useRentalOrders(params: ListRentalOrdersParams) {
  return useQuery({
    queryKey: queryKeys.rentalOrders.list(params),
    queryFn: () => getRentalOrders(params),
  });
}

export function useRentalOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.rentalOrders.detail(id),
    queryFn: () => getRentalOrder(id),
    enabled: Boolean(id),
  });
}

export function useCreateRentalOrder() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: createRentalOrder,
    showSuccessToast: true,
    successMessage: "Rental order created successfully.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.rentalOrders.lists() });
    },
  });
}

export function useUpdateRentalOrder() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof updateRentalOrder>[1];
    }) => updateRentalOrder(id, payload),
    showSuccessToast: true,
    successMessage: "Rental order updated successfully.",
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.rentalOrders.detail(id) });

      const previous = queryClient.getQueryData(queryKeys.rentalOrders.detail(id));

      if (previous) {
        queryClient.setQueryData(queryKeys.rentalOrders.detail(id), {
          ...previous,
          ...payload,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.rentalOrders.detail(id), context.previous);
      }
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalOrders.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalOrders.detail(data.id) }),
      ]);
    },
  });
}

export function useConfirmRentalOrder() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: confirmRentalOrder,
    showSuccessToast: true,
    successMessage: "Rental order confirmed.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalOrders.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalOrders.detail(data.id) }),
      ]);
    },
  });
}

export function useReserveRentalOrder() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof reserveRentalOrder>[1];
    }) => reserveRentalOrder(id, payload),
    showSuccessToast: true,
    successMessage: "Inventory reserved successfully.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalOrders.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalOrders.detail(data.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() }),
      ]);
    },
  });
}

export function useCancelRentalOrder() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: cancelRentalOrder,
    showSuccessToast: true,
    successMessage: "Rental order cancelled.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalOrders.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalOrders.detail(data.id) }),
      ]);
    },
  });
}
