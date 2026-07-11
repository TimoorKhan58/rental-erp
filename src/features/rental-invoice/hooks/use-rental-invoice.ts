import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getCustomers } from "@/features/customer/services";
import { getRentalOrders } from "@/features/rental-order/services";
import type { ListRentalInvoicesParams } from "../types";
import {
  getRentalInvoice,
  getRentalInvoices,
  issueRentalInvoice,
  voidRentalInvoice,
} from "../services";

type LookupOption = {
  id: string;
  label: string;
};

export function useRentalInvoicePermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.rentalInvoices.read),
    canCreate: permissions.includes(PERMISSIONS.rentalInvoices.create),
    canUpdate: permissions.includes(PERMISSIONS.rentalInvoices.update),
    canIssue: permissions.includes(PERMISSIONS.rentalInvoices.issue),
    canVoid: permissions.includes(PERMISSIONS.rentalInvoices.void),
  };
}

export function useRentalInvoiceFilterOptions() {
  const customers = useQuery({
    queryKey: queryKeys.customers.list({ pageSize: 100, isActive: true }),
    queryFn: () => getCustomers({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  const rentalOrders = useQuery({
    queryKey: queryKeys.rentalOrders.list({ pageSize: 100 }),
    queryFn: () => getRentalOrders({ pageSize: 100 }),
    staleTime: 5 * 60_000,
  });

  const customerOptions: LookupOption[] = (customers.data?.items ?? []).map((item) => ({
    id: item.id,
    label: `${item.customerCode} — ${item.name}`,
  }));

  const rentalOrderOptions: LookupOption[] = (rentalOrders.data?.items ?? []).map((item) => ({
    id: item.id,
    label: item.orderNumber,
  }));

  const customerLabelById = new Map(customerOptions.map((item) => [item.id, item.label]));
  const rentalOrderLabelById = new Map(rentalOrderOptions.map((item) => [item.id, item.label]));

  return {
    customerOptions,
    rentalOrderOptions,
    customerLabelById,
    rentalOrderLabelById,
    isLoading: customers.isLoading || rentalOrders.isLoading,
  };
}

export function useRentalInvoices(params: ListRentalInvoicesParams) {
  return useQuery({
    queryKey: queryKeys.rentalInvoices.list(params),
    queryFn: () => getRentalInvoices(params),
  });
}

export function useRentalInvoice(id: string) {
  return useQuery({
    queryKey: queryKeys.rentalInvoices.detail(id),
    queryFn: () => getRentalInvoice(id),
    enabled: Boolean(id),
  });
}

export function useIssueRentalInvoice() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: issueRentalInvoice,
    showSuccessToast: true,
    successMessage: "Invoice issued successfully.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalInvoices.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalInvoices.detail(data.id) }),
      ]);
    },
  });
}

export function useVoidRentalInvoice() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: voidRentalInvoice,
    showSuccessToast: true,
    successMessage: "Invoice voided.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalInvoices.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalInvoices.detail(data.id) }),
      ]);
    },
  });
}
