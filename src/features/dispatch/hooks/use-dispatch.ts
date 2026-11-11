import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query";
import { getCurrentUserPermissions, getCustomers } from "@/features/customer/services";
import { getProducts } from "@/features/product/services";
import { getRentalOrders } from "@/features/rental-order/services";
import { getWarehouses } from "@/features/warehouse/services";
import type { ListDispatchesParams } from "../types";
import { toRentalOrderSelectorOption } from "../mappers/rental-order-option.mapper";
import {
  cancelDispatch,
  completeDispatch,
  createDispatch,
  getDispatch,
  getDispatchSummary,
  getDispatches,
  updateDispatch,
} from "../services";

type LookupOption = {
  id: string;
  label: string;
  description?: string;
  keywords?: string;
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

const ELIGIBLE_DISPATCH_ORDER_STATUSES = new Set(["CONFIRMED", "RESERVED", "ON_RENT"]);

export function useDispatchFilterOptions() {
  const rentalOrders = useQuery({
    queryKey: queryKeys.rentalOrders.list({ pageSize: 100 }),
    queryFn: () => getRentalOrders({ pageSize: 100 }),
    staleTime: 5 * 60_000,
  });

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

  const allRentalOrders = rentalOrders.data?.items ?? [];
  const customerNameById = new Map(
    (customers.data?.items ?? []).map((item) => [item.id, item.name]),
  );
  const customerPhoneById = new Map(
    (customers.data?.items ?? []).map((item) => [item.id, item.phone]),
  );

  const rentalOrderOptions: LookupOption[] = allRentalOrders.map((order) => ({
    id: order.id,
    label: order.orderNumber,
  }));

  const eligibleRentalOrderOptions = allRentalOrders
    .filter((order) => ELIGIBLE_DISPATCH_ORDER_STATUSES.has(order.status))
    .map((order) =>
      toRentalOrderSelectorOption(order, customerNameById, customerPhoneById),
    );

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

  const rentalOrderCustomerById = new Map(
    allRentalOrders.map((order) => [order.id, order.customerId]),
  );

  return {
    rentalOrderOptions,
    eligibleRentalOrderOptions,
    warehouseOptions,
    productOptions,
    rentalOrderLabelById,
    rentalOrderWarehouseById,
    rentalOrderCustomerById,
    customerNameById,
    warehouseLabelById,
    productLabelById,
    warehouseNameById,
    productNameById,
    isLoading:
      rentalOrders.isLoading ||
      customers.isLoading ||
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
  const summaryQuery = useQuery({
    queryKey: queryKeys.dispatches.summary({}),
    queryFn: () => getDispatchSummary({}),
    staleTime: 60_000,
  });

  return {
    stats: summaryQuery.data?.stats,
    statusCounts: summaryQuery.data?.statusCounts,
    isLoading: summaryQuery.isLoading,
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
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.summaries() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalOrders.lists() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.rentalOrders.detail(data.rentalOrderId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements.lists() }),
      ]);
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
        queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.summaries() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.detail(data.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalOrders.lists() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.rentalOrders.detail(data.rentalOrderId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements.lists() }),
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
        queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.summaries() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.detail(data.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalOrders.lists() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.rentalOrders.detail(data.rentalOrderId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements.lists() }),
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
        queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.summaries() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.detail(data.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.summaries() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalOrders.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalOrders.summaries() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.rentalOrders.detail(data.rentalOrderId),
        }),
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
        queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.summaries() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dispatches.detail(data.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalOrders.lists() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.rentalOrders.detail(data.rentalOrderId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.stockMovements.lists() }),
      ]);
    },
  });
}
