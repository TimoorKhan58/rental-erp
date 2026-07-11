import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getDispatches } from "@/features/dispatch/services";
import { getProducts } from "@/features/product/services";
import { getRentalOrders } from "@/features/rental-order/services";
import type { ListReturnsParams } from "../types";
import {
  cancelReturn,
  completeReturn,
  createReturn,
  getReturn,
  getReturns,
  inspectReturn,
  receiveReturn,
  updateReturn,
} from "../services";

type LookupOption = {
  id: string;
  label: string;
};

export function useReturnPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.returns.read),
    canCreate: permissions.includes(PERMISSIONS.returns.create),
    canUpdate: permissions.includes(PERMISSIONS.returns.update),
    canReceive: permissions.includes(PERMISSIONS.returns.receive),
    canInspect: permissions.includes(PERMISSIONS.returns.inspect),
    canComplete: permissions.includes(PERMISSIONS.returns.complete),
    canCancel: permissions.includes(PERMISSIONS.returns.cancel),
  };
}

export function useReturnFilterOptions() {
  const rentalOrders = useQuery({
    queryKey: queryKeys.rentalOrders.list({ pageSize: 100 }),
    queryFn: () => getRentalOrders({ pageSize: 100 }),
    staleTime: 5 * 60_000,
  });

  const completedDispatches = useQuery({
    queryKey: queryKeys.dispatches.list({ pageSize: 100, status: "COMPLETED" }),
    queryFn: () => getDispatches({ pageSize: 100, status: "COMPLETED" }),
    staleTime: 5 * 60_000,
  });

  const allDispatches = useQuery({
    queryKey: queryKeys.dispatches.list({ pageSize: 100 }),
    queryFn: () => getDispatches({ pageSize: 100 }),
    staleTime: 5 * 60_000,
  });

  const products = useQuery({
    queryKey: queryKeys.products.list({ pageSize: 100, isActive: true }),
    queryFn: () => getProducts({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  const rentalOrderOptions: LookupOption[] = (rentalOrders.data?.items ?? []).map((order) => ({
    id: order.id,
    label: order.orderNumber,
  }));

  const dispatchOptions: LookupOption[] = (allDispatches.data?.items ?? []).map((dispatch) => ({
    id: dispatch.id,
    label: dispatch.dispatchNumber,
  }));

  const completedDispatchOptions: LookupOption[] = (completedDispatches.data?.items ?? []).map(
    (dispatch) => ({
      id: dispatch.id,
      label: dispatch.dispatchNumber,
    }),
  );

  const rentalOrderLabelById = new Map(rentalOrderOptions.map((item) => [item.id, item.label]));
  const dispatchLabelById = new Map(dispatchOptions.map((item) => [item.id, item.label]));
  const dispatchRentalOrderById = new Map(
    (allDispatches.data?.items ?? []).map((dispatch) => [dispatch.id, dispatch.rentalOrderId]),
  );
  const productLabelById = new Map(
    (products.data?.items ?? []).map((item) => [item.id, `${item.productCode} — ${item.name}`]),
  );
  const rentalOrderItemLabelById = new Map<string, string>();

  for (const order of rentalOrders.data?.items ?? []) {
    for (const item of order.items) {
      rentalOrderItemLabelById.set(
        item.id,
        productLabelById.get(item.productId) ?? item.productId,
      );
    }
  }

  return {
    rentalOrderOptions,
    dispatchOptions,
    completedDispatchOptions,
    rentalOrderLabelById,
    dispatchLabelById,
    dispatchRentalOrderById,
    productLabelById,
    rentalOrderItemLabelById,
    isLoading:
      rentalOrders.isLoading ||
      completedDispatches.isLoading ||
      allDispatches.isLoading ||
      products.isLoading,
  };
}

export function useReturns(params: ListReturnsParams) {
  return useQuery({
    queryKey: queryKeys.returns.list(params),
    queryFn: () => getReturns(params),
  });
}

export function useReturn(id: string) {
  return useQuery({
    queryKey: queryKeys.returns.detail(id),
    queryFn: () => getReturn(id),
    enabled: Boolean(id),
  });
}

export function useReturnsByDispatch(dispatchId: string) {
  return useQuery({
    queryKey: queryKeys.returns.list({ dispatchId, pageSize: 100 }),
    queryFn: () => getReturns({ dispatchId, pageSize: 100 }),
    enabled: Boolean(dispatchId),
    staleTime: 60_000,
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: createReturn,
    showSuccessToast: true,
    successMessage: "Return created successfully.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.returns.lists() });
    },
  });
}

export function useUpdateReturn() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof updateReturn>[1];
    }) => updateReturn(id, payload),
    showSuccessToast: true,
    successMessage: "Return updated successfully.",
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.returns.detail(id) });

      const previous = queryClient.getQueryData(queryKeys.returns.detail(id));

      if (previous) {
        queryClient.setQueryData(queryKeys.returns.detail(id), {
          ...previous,
          ...payload,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.returns.detail(id), context.previous);
      }
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.returns.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.returns.detail(data.id) }),
      ]);
    },
  });
}

export function useReceiveReturn() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: receiveReturn,
    showSuccessToast: true,
    successMessage: "Return marked as received.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.returns.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.returns.detail(data.id) }),
      ]);
    },
  });
}

export function useInspectReturn() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof inspectReturn>[1];
    }) => inspectReturn(id, payload),
    showSuccessToast: true,
    successMessage: "Inspection recorded successfully.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.returns.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.returns.detail(data.id) }),
      ]);
    },
  });
}

export function useCompleteReturn() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: completeReturn,
    showSuccessToast: true,
    successMessage: "Return completed successfully.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.returns.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.returns.detail(data.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() }),
      ]);
    },
  });
}

export function useCancelReturn() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: cancelReturn,
    showSuccessToast: true,
    successMessage: "Return cancelled.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.returns.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.returns.detail(data.id) }),
      ]);
    },
  });
}
