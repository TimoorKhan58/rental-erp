import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import type {
  CreateSupplierPaymentPayload,
  ListSupplierPaymentsParams,
} from "../types/supplier-payment.types";
import {
  createPurchaseOrderSupplierPayment,
  getPurchaseOrderSupplierPayments,
  getSupplierPayments,
  postSupplierPayment,
  voidSupplierPayment,
} from "../services/supplier-payment.service";

const PAYABLE_PO_STATUSES = [
  "APPROVED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
] as const;

export function useSupplierPaymentPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.supplierPayments.read),
    canCreate: permissions.includes(PERMISSIONS.supplierPayments.create),
    canPost: permissions.includes(PERMISSIONS.supplierPayments.post),
    canVoid: permissions.includes(PERMISSIONS.supplierPayments.void),
  };
}

export function isPurchaseOrderPayable(status: string): boolean {
  return (PAYABLE_PO_STATUSES as readonly string[]).includes(status);
}

export function usePurchaseOrderSupplierPayments(
  purchaseOrderId: string,
  params: Omit<ListSupplierPaymentsParams, "purchaseOrderId"> = {},
) {
  return useQuery({
    queryKey: queryKeys.supplierPayments.list({
      purchaseOrderId,
      ...params,
    }),
    queryFn: () => getPurchaseOrderSupplierPayments(purchaseOrderId, params),
    enabled: Boolean(purchaseOrderId),
  });
}

export function useSupplierPayments(params: ListSupplierPaymentsParams = {}) {
  return useQuery({
    queryKey: queryKeys.supplierPayments.list(params),
    queryFn: () => getSupplierPayments(params),
  });
}

export function useCreatePurchaseOrderSupplierPayment(purchaseOrderId: string) {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: (
      payload: Omit<CreateSupplierPaymentPayload, "purchaseOrderId">,
    ) => createPurchaseOrderSupplierPayment(purchaseOrderId, payload),
    showSuccessToast: true,
    successMessage: "Supplier payment recorded.",
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.supplierPayments.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.procurement.detail(purchaseOrderId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.procurement.lists(),
        }),
      ]);
    },
  });
}

export function usePostSupplierPayment(purchaseOrderId?: string) {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: postSupplierPayment,
    showSuccessToast: true,
    successMessage: "Supplier payment posted.",
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.supplierPayments.lists(),
        }),
        purchaseOrderId
          ? queryClient.invalidateQueries({
              queryKey: queryKeys.procurement.detail(purchaseOrderId),
            })
          : Promise.resolve(),
        queryClient.invalidateQueries({
          queryKey: queryKeys.procurement.lists(),
        }),
      ]);
    },
  });
}

export function useVoidSupplierPayment(purchaseOrderId?: string) {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: voidSupplierPayment,
    showSuccessToast: true,
    successMessage: "Supplier payment voided.",
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.supplierPayments.lists(),
        }),
        purchaseOrderId
          ? queryClient.invalidateQueries({
              queryKey: queryKeys.procurement.detail(purchaseOrderId),
            })
          : Promise.resolve(),
        queryClient.invalidateQueries({
          queryKey: queryKeys.procurement.lists(),
        }),
      ]);
    },
  });
}
