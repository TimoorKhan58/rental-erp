import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getProducts } from "@/features/product/services";
import { getRentalOrders } from "@/features/rental-order/services";
import { getWarehouses } from "@/features/warehouse/services";
import type { ListDispatchesParams } from "../types";
import {
  computeDispatchStatusCounts,
  computeDispatchSummary,
} from "../mappers/dispatch-summary.mapper";
import {
  cancelDispatch,
  completeDispatch,
  createDispatch,
  getDispatch,
  getDispatches,
  updateDispatch,
} from "../services";

type LookupOption = {
  id: string;
  label: string;
};

export function useDispatchPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.dispatches.read),
    canCreate: permissions.includes(PERMISSIONS.dispatches.create),
    canUpdate: permissions.includes(PERMISSIONS.dispatches.update),
    canComplete: permissions.includes(PERMISSIONS.dispatches.complete),
    canCancel: permissions.includes(PERMISSIONS.dispatches.cancel),
  };
}

export function useDispatchFilterOptions() {
  const rentalOrders = useQuery({
    queryKey: queryKeys.rentalOrders.list({ pageSize: 100, status: "CONFIRMED" }),
    queryFn: () => getRentalOrders({ pageSize: 100, status: "CONFIRMED" }),
    staleTime: 5 * 60_000,
  });

  const reservedOrders = useQuery({
    queryKey: queryKeys.rentalOrders.list({ pageSize: 100, status: "RESERVED" }),
    queryFn: () => getRentalOrders({ pageSize: 100, status: "RESERVED" }),
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

  const allRentalOrders = [
    ...(rentalOrders.data?.items ?? []),
    ...(reservedOrders.data?.items ?? []),
  ];

  const rentalOrderOptions: LookupOption[] = allRentalOrders.map((order) => ({
    id: order.id,
    label: order.orderNumber,
  }));

  const warehouseOptions: LookupOption[] = (warehouses.data?.items ?? []).map((item) => ({
    id: item.id,
    label: `${item.warehouseCode} — ${item.name}`,
  }));

  const productOptions: LookupOption[] = (products.data?.items ?? []).map((item) => ({
    id: item.id,
    label: `${item.productCode} — ${item.name}`,
  }));

  const rentalOrderLabelById = new Map(rentalOrderOptions.map((item) => [item.id, item.label]));
  const rentalOrderWarehouseById = new Map(
    allRentalOrders.map((order) => [order.id, order.warehouseId]),
  );
  const warehouseLabelById = new Map(warehouseOptions.map((item) => [item.id, item.label]));
  const productLabelById = new Map(productOptions.map((item) => [item.id, item.label]));
  const warehouseNameById = new Map(
    (warehouses.data?.items ?? []).map((item) => [item.id, item.name]),
  );
  const productNameById = new Map(
    (products.data?.items ?? []).map((item) => [item.id, item.name]),
  );

  return {
    rentalOrderOptions,
    warehouseOptions,
    productOptions,
    rentalOrderLabelById,
    rentalOrderWarehouseById,
    warehouseLabelById,
    productLabelById,
    warehouseNameById,
    productNameById,
    isLoading:
      rentalOrders.isLoading ||
      reservedOrders.isLoading ||
      warehouses.isLoading ||
      products.isLoading,
  };
}

export function useDispatches(params: ListDispatchesParams) {
  return useQuery({
    queryKey: queryKeys.dispatches.list(params),
    queryFn: () => getDispatches(params),
  });
}

export function useDispatchSummaryStats() {
  const listQuery = useQuery({
    queryKey: queryKeys.dispatches.list({ pageSize: 100 }),
    queryFn: () => getDispatches({ pageSize: 100 }),
    staleTime: 60_000,
  });

  const stats = useMemo(() => {
    if (!listQuery.data) {
      return undefined;
    }

    return computeDispatchSummary(listQuery.data.items);
  }, [listQuery.data]);

  const statusCounts = useMemo(() => {
    if (!listQuery.data) {
      return undefined;
    }

    return computeDispatchStatusCounts(listQuery.data.items);
  }, [listQuery.data]);

  return {
    stats,
    statusCounts,
    isLoading: listQuery.isLoading,
  };
}

export function useDispatch(id: string) {
  return useQuery({
    queryKey: queryKeys.dispatches.detail(id),
    queryFn: () => getDispatch(id),
    enabled: Boolean(id),
  });
}

export function useCreateDispatch() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: createDispatch,
    showSuccessToast: true,
    successMessage: "Dispatch created successfully.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.lists() });
    },
  });
}

export function useUpdateDispatch() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof updateDispatch>[1];
    }) => updateDispatch(id, payload),
    showSuccessToast: true,
    successMessage: "Dispatch updated successfully.",
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.dispatches.detail(id) });

      const previous = queryClient.getQueryData(queryKeys.dispatches.detail(id));

      if (previous) {
        queryClient.setQueryData(queryKeys.dispatches.detail(id), {
          ...previous,
          ...payload,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.dispatches.detail(id), context.previous);
      }
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.detail(data.id) }),
      ]);
    },
  });
}

export function useMarkDispatchReady() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: (id: string) => updateDispatch(id, { markReady: true }),
    showSuccessToast: true,
    successMessage: "Dispatch marked as ready.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.detail(data.id) }),
      ]);
    },
  });
}

export function useCompleteDispatch() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: completeDispatch,
    showSuccessToast: true,
    successMessage: "Dispatch completed successfully.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.detail(data.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() }),
      ]);
    },
  });
}

export function useCancelDispatch() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: cancelDispatch,
    showSuccessToast: true,
    successMessage: "Dispatch cancelled.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.detail(data.id) }),
      ]);
    },
  });
}
