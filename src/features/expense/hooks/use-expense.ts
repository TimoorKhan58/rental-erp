import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import { getSuppliers } from "@/features/supplier/services";
import type { ListExpensesParams } from "../types";
import {
  computeExpenseStatusCounts,
  computeExpenseSummary,
} from "../mappers/expense-summary.mapper";
import {
  approveExpense,
  createExpense,
  createExpenseCategory,
  deleteExpenseCategory,
  getExpense,
  getExpenseCategories,
  getExpenses,
  payExpense,
  rejectExpense,
  submitExpense,
  updateExpense,
  updateExpenseCategory,
} from "../services";

type LookupOption = {
  id: string;
  label: string;
};

export function useExpensePermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead: permissions.includes(PERMISSIONS.expenses.read),
    canCreate: permissions.includes(PERMISSIONS.expenses.create),
    canUpdate: permissions.includes(PERMISSIONS.expenses.update),
    canApprove: permissions.includes(PERMISSIONS.expenses.approve),
    canReject: permissions.includes(PERMISSIONS.expenses.reject),
    canPay: permissions.includes(PERMISSIONS.expenses.pay),
  };
}

export function useExpenseFilterOptions() {
  const categories = useQuery({
    queryKey: queryKeys.expenseCategories.list({ pageSize: 100, isActive: true }),
    queryFn: () => getExpenseCategories({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  const suppliers = useQuery({
    queryKey: queryKeys.suppliers.list({ pageSize: 100, isActive: true }),
    queryFn: () => getSuppliers({ pageSize: 100, isActive: true }),
    staleTime: 5 * 60_000,
  });

  const categoryOptions: LookupOption[] = (categories.data?.items ?? []).map(
    (item) => ({
      id: item.id,
      label: item.name,
    }),
  );

  const supplierOptions: LookupOption[] = (suppliers.data?.items ?? []).map(
    (item) => ({
      id: item.id,
      label: `${item.supplierCode} — ${item.name}`,
    }),
  );

  const categoryLabelById = new Map(
    categoryOptions.map((item) => [item.id, item.label]),
  );
  const supplierLabelById = new Map(
    supplierOptions.map((item) => [item.id, item.label]),
  );

  return {
    categoryOptions,
    supplierOptions,
    categoryLabelById,
    supplierLabelById,
    isLoading: categories.isLoading || suppliers.isLoading,
  };
}

export function useExpenseSummaryStats() {
  const listQuery = useQuery({
    queryKey: queryKeys.expenses.list({ pageSize: 100 }),
    queryFn: () => getExpenses({ pageSize: 100 }),
    staleTime: 60_000,
  });

  const stats = useMemo(() => {
    if (!listQuery.data) {
      return undefined;
    }

    return computeExpenseSummary(listQuery.data.items);
  }, [listQuery.data]);

  const statusCounts = useMemo(() => {
    if (!listQuery.data) {
      return undefined;
    }

    return computeExpenseStatusCounts(listQuery.data.items);
  }, [listQuery.data]);

  return {
    stats,
    statusCounts,
    isLoading: listQuery.isLoading,
  };
}

export function useExpenses(params: ListExpensesParams) {
  return useQuery({
    queryKey: queryKeys.expenses.list(params),
    queryFn: () => getExpenses(params),
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: queryKeys.expenses.detail(id),
    queryFn: () => getExpense(id),
    enabled: Boolean(id),
  });
}

export function useExpenseCategories(params: { pageSize?: number; isActive?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.expenseCategories.list(params),
    queryFn: () => getExpenseCategories(params),
  });
}

function invalidateExpenseQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  id?: string,
) {
  const tasks = [
    queryClient.invalidateQueries({ queryKey: queryKeys.expenses.lists() }),
  ];

  if (id) {
    tasks.push(
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.detail(id) }),
    );
  }

  return Promise.all(tasks);
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: createExpense,
    showSuccessToast: true,
    successMessage: "Expense recorded successfully.",
    onSuccess: async () => {
      await invalidateExpenseQueries(queryClient);
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof updateExpense>[1];
    }) => updateExpense(id, payload),
    showSuccessToast: true,
    successMessage: "Expense updated successfully.",
    onSuccess: async (data) => {
      await invalidateExpenseQueries(queryClient, data.id);
    },
  });
}

export function useSubmitExpense() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: submitExpense,
    showSuccessToast: true,
    successMessage: "Expense submitted for approval.",
    onSuccess: async (data) => {
      await invalidateExpenseQueries(queryClient, data.id);
    },
  });
}

export function useApproveExpense() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: approveExpense,
    showSuccessToast: true,
    successMessage: "Expense approved.",
    onSuccess: async (data) => {
      await invalidateExpenseQueries(queryClient, data.id);
    },
  });
}

export function useRejectExpense() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({
      id,
      rejectionReason,
    }: {
      id: string;
      rejectionReason: string;
    }) => rejectExpense(id, { rejectionReason }),
    showSuccessToast: true,
    successMessage: "Expense rejected.",
    onSuccess: async (data) => {
      await invalidateExpenseQueries(queryClient, data.id);
    },
  });
}

export function usePayExpense() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: payExpense,
    showSuccessToast: true,
    successMessage: "Expense marked as paid.",
    onSuccess: async (data) => {
      await invalidateExpenseQueries(queryClient, data.id);
    },
  });
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: createExpenseCategory,
    showSuccessToast: true,
    successMessage: "Expense category created.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.expenseCategories.lists(),
      });
    },
  });
}

export function useUpdateExpenseCategory() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof updateExpenseCategory>[1];
    }) => updateExpenseCategory(id, payload),
    showSuccessToast: true,
    successMessage: "Expense category updated.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.expenseCategories.lists(),
      });
    },
  });
}

export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: deleteExpenseCategory,
    showSuccessToast: true,
    successMessage: "Expense category deleted.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.expenseCategories.lists(),
      });
    },
  });
}
