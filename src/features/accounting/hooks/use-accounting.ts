import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { PERMISSIONS } from "@/shared/application/authorization/permissions";
import { queryKeys } from "@/lib/query";
import { useAppMutation } from "@/lib/query";
import { getCurrentUserPermissions } from "@/features/customer/services";
import type {
  DateRangeParams,
  GeneralLedgerParams,
  ListAccountsParams,
  ListJournalEntriesParams,
  TrialBalanceParams,
} from "../types";
import { getChartOfAccounts } from "../services/account.service";
import {
  getAccountingSummary,
  getGeneralLedger,
  getTrialBalance,
} from "../services/financial-report.service";
import {
  getJournalEntries,
  getJournalEntry,
  postJournalEntry,
  voidJournalEntry,
} from "../services/journal-entry.service";

export function useAccountingPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.permissions.me(),
    queryFn: getCurrentUserPermissions,
    staleTime: 5 * 60_000,
  });

  const permissions = data?.permissions ?? [];

  return {
    isLoading,
    canRead:
      permissions.includes(PERMISSIONS.accounts.read) ||
      permissions.includes(PERMISSIONS.journalEntries.read) ||
      permissions.includes(PERMISSIONS.financialReports.read),
    canReadAccounts: permissions.includes(PERMISSIONS.accounts.read),
    canCreateAccounts: permissions.includes(PERMISSIONS.accounts.create),
    canUpdateAccounts: permissions.includes(PERMISSIONS.accounts.update),
    canReadJournals: permissions.includes(PERMISSIONS.journalEntries.read),
    canCreateJournals: permissions.includes(PERMISSIONS.journalEntries.create),
    canUpdateJournals: permissions.includes(PERMISSIONS.journalEntries.update),
    canPostJournals: permissions.includes(PERMISSIONS.journalEntries.post),
    canVoidJournals: permissions.includes(PERMISSIONS.journalEntries.void),
    canReadReports: permissions.includes(PERMISSIONS.financialReports.read),
    canDelete: permissions.includes(PERMISSIONS.journalEntries.void),
    canPost: permissions.includes(PERMISSIONS.journalEntries.post),
    canVoid: permissions.includes(PERMISSIONS.journalEntries.void),
  };
}

export function useAccountingSummary(params: DateRangeParams = {}) {
  return useQuery({
    queryKey: queryKeys.accounting.summary(params),
    queryFn: () => getAccountingSummary(params),
    enabled: true,
  });
}

export function useChartOfAccounts(params: ListAccountsParams) {
  return useQuery({
    queryKey: queryKeys.accounting.accounts.list(params),
    queryFn: () => getChartOfAccounts(params),
  });
}

export function useJournalEntries(params: ListJournalEntriesParams) {
  return useQuery({
    queryKey: queryKeys.accounting.journalEntries.list(params),
    queryFn: () => getJournalEntries(params),
  });
}

export function useJournalEntry(id: string) {
  return useQuery({
    queryKey: queryKeys.accounting.journalEntries.detail(id),
    queryFn: () => getJournalEntry(id),
    enabled: Boolean(id),
  });
}

export function useGeneralLedger(params: GeneralLedgerParams | null) {
  return useQuery({
    queryKey: queryKeys.accounting.generalLedger(params ?? {}),
    queryFn: () => getGeneralLedger(params!),
    enabled: Boolean(params?.accountId),
  });
}

export function useTrialBalance(params: TrialBalanceParams) {
  return useQuery({
    queryKey: queryKeys.accounting.trialBalance(params),
    queryFn: () => getTrialBalance(params),
  });
}

export function usePostJournalEntry() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: postJournalEntry,
    showSuccessToast: true,
    successMessage: "Journal entry posted successfully.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.accounting.journalEntries.lists() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.accounting.journalEntries.detail(data.id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.accounting.trialBalance({}) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.accounting.generalLedger({}) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.accounting.summary({}) }),
      ]);
    },
  });
}

export function useVoidJournalEntry() {
  const queryClient = useQueryClient();

  return useAppMutation({
    mutationFn: voidJournalEntry,
    showSuccessToast: true,
    successMessage: "Journal entry voided.",
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.accounting.journalEntries.lists() }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.accounting.journalEntries.detail(data.id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.accounting.trialBalance({}) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.accounting.generalLedger({}) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.accounting.summary({}) }),
      ]);
    },
  });
}

/** Backend has no hard delete — void is the cancellation mechanism for draft/posted entries. */
export function useDeleteJournalEntry() {
  return useVoidJournalEntry();
}
