import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
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
  computeOrderStatusCounts,
  computeRentalOrderSummary,
  computeReservationStatusCounts,
} from "../mappers/rental-order-summary.mapper";
import {
  cancelRentalOrder,
  confirmRentalOrder,
  createRentalOrder,
  getDateAwareAvailability,
  getRentalOrder,
  getRentalOrderShortfall,
  getRentalOrders,
  reserveRentalOrder,
  sourceRentalOrderExternally,
  updateRentalOrder,
} from "../services";
import type {
  GetDateAwareAvailabilityParams,
  SourceRentalOrderExternallyPayload,
} from "../types";
import { useExternalRentalPermissions } from "@/features/external-rental/hooks";

type LookupOption = {
  id: string;
  label: string;
  keywords?: string;
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
    label: item.name,
    keywords: item.productCode,
  }));

  const customerLabelById = new Map(customerOptions.map((item) => [item.id, item.label]));
  const warehouseLabelById = new Map(warehouseOptions.map((item) => [item.id, item.label]));
  const productLabelById = new Map(productOptions.map((item) => [item.id, item.label]));
  const customerNameById = new Map(
    (customers.data?.items ?? []).map((item) => [item.id, item.name]),
  );
  const warehouseNameById = new Map(
    (warehouses.data?.items ?? []).map((item) => [item.id, item.name]),
  );
  const productNameById = new Map(
    (products.data?.items ?? []).map((item) => [item.id, item.name]),
  );

  return {
    customerOptions,
    warehouseOptions,
    productOptions,
    customerLabelById,
    warehouseLabelById,
    productLabelById,
    customerNameById,
    warehouseNameById,
    productNameById,
    isLoading: customers.isLoading || warehouses.isLoading || products.isLoading,
  };
}

export function useRentalOrders(params: ListRentalOrdersParams) {
  return useQuery({
    queryKey: queryKeys.rentalOrders.list(params),
    queryFn: () => getRentalOrders(params),
  });
}

export function useRentalOrderSummaryStats() {
  const listQuery = useQuery({
    queryKey: queryKeys.rentalOrders.list({ pageSize: 100 }),
    queryFn: () => getRentalOrders({ pageSize: 100 }),
    staleTime: 60_000,
  });

  const stats = useMemo(() => {
    if (!listQuery.data) {
      return undefined;
    }

    return computeRentalOrderSummary(listQuery.data.items);
  }, [listQuery.data]);

  const orderStatusCounts = useMemo(() => {
    if (!listQuery.data) {
      return undefined;
    }

    return computeOrderStatusCounts(listQuery.data.items);
  }, [listQuery.data]);

  const reservationStatusCounts = useMemo(() => {
    if (!listQuery.data) {
      return undefined;
    }

    return computeReservationStatusCounts(listQuery.data.items);
  }, [listQuery.data]);

  return {
    stats,
    orderStatusCounts,
    reservationStatusCounts,
    isLoading: listQuery.isLoading,
  };
}

export function useRentalOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.rentalOrders.detail(id),
    queryFn: () => getRentalOrder(id),
    enabled: Boolean(id),
  });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidAvailabilityQuery(
  params: Partial<GetDateAwareAvailabilityParams> | null | undefined,
): params is GetDateAwareAvailabilityParams {
  if (
    params === null ||
    params === undefined ||
    !params.productId ||
    !params.warehouseId ||
    !params.startDate ||
    !params.endDate
  ) {
    return false;
  }

  if (
    !UUID_RE.test(params.productId) ||
    !UUID_RE.test(params.warehouseId) ||
    (params.excludeRentalOrderId !== undefined &&
      !UUID_RE.test(params.excludeRentalOrderId))
  ) {
    return false;
  }

  const start = new Date(params.startDate);
  const end = new Date(params.endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }

  return end.getTime() >= start.getTime();
}

/**
 * F-02 informational date-aware availability query.
 * Does not fire when inputs are incomplete/invalid.
 * Reserve UoW remains the authoritative enforcement point.
 */
export function useDateAwareAvailability(
  params: Partial<GetDateAwareAvailabilityParams> | null | undefined,
) {
  const enabled = isValidAvailabilityQuery(params);

  return useQuery({
    queryKey: queryKeys.rentalOrders.availability(params ?? {}),
    queryFn: () =>
      getDateAwareAvailability(params as GetDateAwareAvailabilityParams),
    enabled,
    staleTime: 30_000,
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
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.rentalOrders.all, "availability"],
        }),
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

export function useRentalOrderShortfall(orderId: string) {
  return useQuery({
    queryKey: queryKeys.rentalOrders.shortfall(orderId),
    queryFn: () => getRentalOrderShortfall(orderId),
    enabled: Boolean(orderId),
    staleTime: 30_000,
  });
}

export function useCanSourceExternallyPermission() {
  const { canCreate, isLoading } = useExternalRentalPermissions();
  return { canCreateExternalRental: canCreate, isLoading };
}

export function useSourceRentalOrderExternally(orderId: string) {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: (payload: SourceRentalOrderExternallyPayload) =>
      sourceRentalOrderExternally(orderId, payload),
    showSuccessToast: true,
    successMessage: "External rental agreement created from shortfall.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.rentalOrders.detail(orderId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.rentalOrders.shortfall(orderId),
        }),
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.rentalOrders.all, "availability"],
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.externalRentals.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.externalRentals.detail(data.id),
        }),
      ]);
    },
  });
}
