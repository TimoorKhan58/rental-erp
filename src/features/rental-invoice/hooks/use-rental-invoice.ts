"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { ROUTES } from "@/config/routes";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getCustomers } from "@/features/customer/services";
import { getRentalOrders } from "@/features/rental-order/services";
import type { ListRentalInvoicesParams } from "../types";
import {
  computeRentalInvoicePaymentStatusCounts,
  computeRentalInvoiceStatusCounts,
  computeRentalInvoiceSummary,
} from "../mappers/rental-invoice-summary.mapper";
import {
  convertMissingToLoss,
  generateRentalInvoiceFromOrder,
  getRentalInvoice,
  getRentalInvoices,
  issueRentalInvoice,
  updateRentalInvoice,
  voidRentalInvoice,
} from "../services";
import type { GenerateInvoiceChargesFormValues } from "../schemas/generate-invoice-charges-form.schema";
import type { RentalInvoiceResponse } from "../types";

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

export function useRentalInvoiceSummaryStats() {
  const listQuery = useQuery({
    queryKey: queryKeys.rentalInvoices.list({ pageSize: 100 }),
    queryFn: () => getRentalInvoices({ pageSize: 100 }),
    staleTime: 60_000,
  });

  const stats = useMemo(() => {
    if (!listQuery.data) {
      return undefined;
    }

    return computeRentalInvoiceSummary(listQuery.data.items);
  }, [listQuery.data]);

  const statusCounts = useMemo(() => {
    if (!listQuery.data) {
      return undefined;
    }

    return computeRentalInvoiceStatusCounts(listQuery.data.items);
  }, [listQuery.data]);

  const paymentStatusCounts = useMemo(() => {
    if (!listQuery.data) {
      return undefined;
    }

    return computeRentalInvoicePaymentStatusCounts(listQuery.data.items);
  }, [listQuery.data]);

  return {
    stats,
    statusCounts,
    paymentStatusCounts,
    isLoading: listQuery.isLoading,
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

export function useGenerateRentalInvoiceFromOrder() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useAppMutation({
    mutationFn: generateRentalInvoiceFromOrder,
    showSuccessToast: true,
    successMessage: "Customer invoice generated successfully.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalInvoices.lists() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalOrders.all }),
      ]);
      router.push(ROUTES.rentalInvoiceDetail(data.id));
    },
  });
}

export function useConvertMissingToLoss() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: convertMissingToLoss,
    showSuccessToast: true,
    successMessage:
      "Missing items converted to loss and charged at actual / replacement price.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalInvoices.lists() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.rentalInvoices.detail(data.id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.returns.lists() }),
      ]);
    },
  });
}

const ADDITIONAL_CHARGE_TYPES = new Set([
  "DELIVERY_CHARGE",
  "LABOUR_CHARGE",
  "TAX",
]);

export function useUpdateRentalInvoiceAdditionalCharges() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: async ({
      id,
      invoice,
      charges,
    }: {
      id: string;
      invoice: RentalInvoiceResponse;
      charges: GenerateInvoiceChargesFormValues;
    }) => {
      const keptItems = invoice.items
        .filter((item) => !ADDITIONAL_CHARGE_TYPES.has(item.lineType))
        .map((item, index) => ({
          lineType: item.lineType,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sortOrder: index,
          productName: item.productName,
          dailyRate: item.dailyRate,
          numberOfDays: item.numberOfDays,
          damagedQuantity: item.damagedQuantity,
          lostQuantity: item.lostQuantity,
          missingQuantity: item.missingQuantity,
          notes: item.notes,
          lineTotal: item.lineTotal,
        }));

      const appendCharge = (
        lineType: "DELIVERY_CHARGE" | "LABOUR_CHARGE" | "TAX",
        description: string,
        amount: number,
      ) => {
        if (amount <= 0) {
          return;
        }
        keptItems.push({
          lineType,
          description,
          quantity: 1,
          unitPrice: amount,
          sortOrder: keptItems.length,
          productName: null,
          dailyRate: null,
          numberOfDays: null,
          damagedQuantity: 0,
          lostQuantity: 0,
          missingQuantity: 0,
          notes: null,
          lineTotal: amount,
        });
      };

      appendCharge("DELIVERY_CHARGE", "Delivery charges", charges.deliveryCharges);
      appendCharge("LABOUR_CHARGE", "Labour charge", charges.labourCharges);
      appendCharge("TAX", "Tax", charges.taxAmount);

      return updateRentalInvoice(id, { items: keptItems });
    },
    showSuccessToast: true,
    successMessage: "Additional charges updated.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.rentalInvoices.lists() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.rentalInvoices.detail(data.id),
        }),
      ]);
    },
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
