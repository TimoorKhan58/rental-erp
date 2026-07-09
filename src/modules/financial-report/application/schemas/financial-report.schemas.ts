import { z } from "zod";

import { JOURNAL_ENTRY_STATUSES } from "@/modules/accounting/domain/journal-entry.constants";
import {
  DateSchema,
  PaginationSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import {
  JOURNAL_REPORT_SORT_FIELDS,
  LEDGER_SORT_FIELDS,
} from "@/modules/financial-report/domain/financial-report.constants";

const DateRangeRefine = (
  value: { dateFrom?: Date; dateTo?: Date },
  ctx: z.RefinementCtx,
) => {
  if (
    value.dateFrom !== undefined &&
    value.dateTo !== undefined &&
    value.dateFrom.getTime() > value.dateTo.getTime()
  ) {
    ctx.addIssue({
      code: "custom",
      message: "dateFrom must be on or before dateTo",
      path: ["dateFrom"],
    });
  }
};

export const DateRangeQuerySchema = z
  .object({
    dateFrom: DateSchema.optional(),
    dateTo: DateSchema.optional(),
  })
  .superRefine(DateRangeRefine);

export const TrialBalanceQuerySchema = DateRangeQuerySchema;

export const BalanceSheetQuerySchema = z.object({
  asOfDate: DateSchema.optional(),
});

export const ProfitLossQuerySchema = DateRangeQuerySchema;

export const AccountLedgerQuerySchema = PaginationSchema.extend({
  accountId: UUIDSchema,
  dateFrom: DateSchema.optional(),
  dateTo: DateSchema.optional(),
  sortBy: z.enum(LEDGER_SORT_FIELDS).optional(),
}).superRefine(DateRangeRefine);

export const GeneralLedgerQuerySchema = AccountLedgerQuerySchema;

export const JournalReportQuerySchema = PaginationSchema.extend({
  dateFrom: DateSchema.optional(),
  dateTo: DateSchema.optional(),
  status: z.enum(JOURNAL_ENTRY_STATUSES).optional(),
  sortBy: z.enum(JOURNAL_REPORT_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  DateRangeRefine(value, ctx);

  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export const CashFlowSummaryQuerySchema = DateRangeQuerySchema;
export const RevenueSummaryQuerySchema = DateRangeQuerySchema;
export const ExpenseSummaryQuerySchema = DateRangeQuerySchema;
export const AccountsSummaryQuerySchema = z.object({});

export type TrialBalanceQueryInput = z.input<typeof TrialBalanceQuerySchema>;
export type BalanceSheetQueryInput = z.input<typeof BalanceSheetQuerySchema>;
export type ProfitLossQueryInput = z.input<typeof ProfitLossQuerySchema>;
export type AccountLedgerQueryInput = z.input<typeof AccountLedgerQuerySchema>;
export type GeneralLedgerQueryInput = z.input<typeof GeneralLedgerQuerySchema>;
export type JournalReportQueryInput = z.input<typeof JournalReportQuerySchema>;
export type CashFlowSummaryQueryInput = z.input<
  typeof CashFlowSummaryQuerySchema
>;
export type RevenueSummaryQueryInput = z.input<
  typeof RevenueSummaryQuerySchema
>;
export type ExpenseSummaryQueryInput = z.input<
  typeof ExpenseSummaryQuerySchema
>;
export type AccountsSummaryQueryInput = z.input<
  typeof AccountsSummaryQuerySchema
>;

export type TrialBalanceQueryParsed = z.infer<typeof TrialBalanceQuerySchema>;
export type BalanceSheetQueryParsed = z.infer<typeof BalanceSheetQuerySchema>;
export type ProfitLossQueryParsed = z.infer<typeof ProfitLossQuerySchema>;
export type AccountLedgerQueryParsed = z.infer<typeof AccountLedgerQuerySchema>;
export type GeneralLedgerQueryParsed = z.infer<typeof GeneralLedgerQuerySchema>;
export type JournalReportQueryParsed = z.infer<typeof JournalReportQuerySchema>;
export type CashFlowSummaryQueryParsed = z.infer<
  typeof CashFlowSummaryQuerySchema
>;
export type RevenueSummaryQueryParsed = z.infer<
  typeof RevenueSummaryQuerySchema
>;
export type ExpenseSummaryQueryParsed = z.infer<
  typeof ExpenseSummaryQuerySchema
>;
export type AccountsSummaryQueryParsed = z.infer<
  typeof AccountsSummaryQuerySchema
>;
