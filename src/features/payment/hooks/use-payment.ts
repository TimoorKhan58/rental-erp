import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getCustomers } from "@/features/customer/services";
import { getRentalInvoices } from "@/features/rental-invoice/services";
import type { ListPaymentsParams } from "../types";
import {
  computePaymentMethodCounts,
  computePaymentStatusCounts,
  computePaymentSummary,
} from "../mappers/payment-summary.mapper";
import {
  createPayment,
  getPayment,
  getPayments,
  postPayment,
  updatePayment,
  voidPayment,
} from "../services";

type LookupOption = {
  id: string;
  label: string;
};

const PAYABLE_INVOICE_STATUSES = ["ISSUED", "PARTIALLY_PAID"] as const;

export function usePaymentPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.payments.read),
    canCreate: permissions.includes(PERMISSIONS.payments.create),
    canUpdate: permissions.includes(PERMISSIONS.payments.update),
    canPost: permissions.includes(PERMISSIONS.payments.post),
    canVoid: permissions.includes(PERMISSIONS.payments.void),
    canDelete: permissions.includes(PERMISSIONS.payments.void),
  };
}

export function usePaymentFilterOptions() {
  const customers = useQuery({
    queryKey: queryKeys.customers.list({ pageSize: 100, isActive: true }),
    queryFn: () => getCustomers({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  const rentalInvoices = useQuery({
    queryKey: queryKeys.rentalInvoices.list({ pageSize: 100 }),
    queryFn: () => getRentalInvoices({ pageSize: 100 }),
    staleTime: 5 * 60_000,
  });

  const customerOptions: LookupOption[] = (customers.data?.items ?? []).map((item) => ({
    id: item.id,
    label: `${item.customerCode} — ${item.name}`,
  }));

  const invoiceOptions = (rentalInvoices.data?.items ?? []).map((item) => ({
    id: item.id,
    customerId: item.customerId,
    label: `${item.invoiceNumber} (${item.status})`,
    balance: item.balance,
    status: item.status,
  }));

  const customerLabelById = new Map(customerOptions.map((item) => [item.id, item.label]));
  const invoiceLabelById = new Map(invoiceOptions.map((item) => [item.id, item.label]));

  return {
    customerOptions,
    invoiceOptions,
    customerLabelById,
    invoiceLabelById,
    isLoading: customers.isLoading || rentalInvoices.isLoading,
  };
}

export function usePaymentSummaryStats() {
  const listQuery = useQuery({
    queryKey: queryKeys.payments.list({ pageSize: 100 }),
    queryFn: () => getPayments({ pageSize: 100 }),
    staleTime: 60_000,
  });

  const stats = useMemo(() => {
    if (!listQuery.data) {
      return undefined;
    }

    return computePaymentSummary(listQuery.data.items);
  }, [listQuery.data]);

  const statusCounts = useMemo(() => {
    if (!listQuery.data) {
      return undefined;
    }

    return computePaymentStatusCounts(listQuery.data.items);
  }, [listQuery.data]);

  const methodCounts = useMemo(() => {
    if (!listQuery.data) {
      return undefined;
    }

    return computePaymentMethodCounts(listQuery.data.items);
  }, [listQuery.data]);

  return {
    stats,
    statusCounts,
    methodCounts,
    isLoading: listQuery.isLoading,
  };
}

export function usePayableInvoices(customerId: string) {
  return useQuery({
    queryKey: queryKeys.rentalInvoices.list({ customerId, pageSize: 100 }),
    queryFn: () => getRentalInvoices({ customerId, pageSize: 100 }),
    enabled: Boolean(customerId),
    select: (data) =>
      data.items.filter((invoice) =>
        PAYABLE_INVOICE_STATUSES.includes(
          invoice.status as (typeof PAYABLE_INVOICE_STATUSES)[number],
        ),
      ),
    staleTime: 60_000,
  });
}

export function usePayments(params: ListPaymentsParams) {
  return useQuery({
    queryKey: queryKeys.payments.list(params),
    queryFn: () => getPayments(params),
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: queryKeys.payments.detail(id),
    queryFn: () => getPayment(id),
    enabled: Boolean(id),
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: createPayment,
    showSuccessToast: true,
    successMessage: "Payment recorded successfully.",
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalInvoices.lists() }),
      ]);
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof updatePayment>[1];
    }) => updatePayment(id, payload),
    showSuccessToast: true,
    successMessage: "Payment updated successfully.",
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.payments.detail(id) });

      const previous = queryClient.getQueryData(queryKeys.payments.detail(id));

      if (previous) {
        queryClient.setQueryData(queryKeys.payments.detail(id), {
          ...previous,
          ...payload,
          updatedAt: new Date().toISOString(),
        });
      }

      return { previous };
    },
    onError: (_error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.payments.detail(id), context.previous);
      }
    },
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.detail(data.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalInvoices.lists() }),
      ]);
    },
  });
}

export function usePostPayment() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: postPayment,
    showSuccessToast: true,
    successMessage: "Payment posted successfully.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.detail(data.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalInvoices.lists() }),
      ]);
    },
  });
}

export function useVoidPayment() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: voidPayment,
    showSuccessToast: true,
    successMessage: "Payment voided.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.detail(data.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalInvoices.lists() }),
      ]);
    },
  });
}

/** Backend has no hard delete — void is the cancellation mechanism. */
export function useDeletePayment() {
  return useVoidPayment();
}
