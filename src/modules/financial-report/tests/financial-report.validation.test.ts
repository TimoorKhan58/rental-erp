import { describe, expect, it } from "vitest";

import {
  AccountLedgerQuerySchema,
  AccountsSummaryQuerySchema,
  BalanceSheetQuerySchema,
  CashFlowSummaryQuerySchema,
  ExpenseSummaryQuerySchema,
  GeneralLedgerQuerySchema,
  JournalReportQuerySchema,
  ProfitLossQuerySchema,
  RevenueSummaryQuerySchema,
  TrialBalanceQuerySchema,
} from "@/modules/financial-report/application/schemas/financial-report.schemas";

import { CASH_ACCOUNT_ID } from "./helpers/financial-report.fixtures";

describe("TrialBalanceQuerySchema", () => {
  it("accepts empty query", () => {
    expect(TrialBalanceQuerySchema.parse({})).toEqual({});
  });

  it("coerces date strings", () => {
    const result = TrialBalanceQuerySchema.parse({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });
    expect(result.dateFrom).toBeInstanceOf(Date);
    expect(result.dateTo).toBeInstanceOf(Date);
  });

  it("rejects dateFrom after dateTo", () => {
    expect(() =>
      TrialBalanceQuerySchema.parse({
        dateFrom: "2026-02-01",
        dateTo: "2026-01-01",
      }),
    ).toThrow();
  });
});

describe("BalanceSheetQuerySchema", () => {
  it("accepts asOfDate", () => {
    const result = BalanceSheetQuerySchema.parse({
      asOfDate: "2026-01-31",
    });
    expect(result.asOfDate).toBeInstanceOf(Date);
  });

  it("accepts empty query", () => {
    expect(BalanceSheetQuerySchema.parse({})).toEqual({});
  });
});

describe("ProfitLossQuerySchema", () => {
  it("accepts date range", () => {
    const result = ProfitLossQuerySchema.parse({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });
    expect(result.dateFrom).toBeInstanceOf(Date);
  });

  it("rejects inverted date range", () => {
    expect(() =>
      ProfitLossQuerySchema.parse({
        dateFrom: "2026-03-01",
        dateTo: "2026-01-01",
      }),
    ).toThrow();
  });
});

describe("AccountLedgerQuerySchema", () => {
  it("requires accountId uuid", () => {
    expect(() => AccountLedgerQuerySchema.parse({})).toThrow();
  });

  it("rejects invalid accountId", () => {
    expect(() =>
      AccountLedgerQuerySchema.parse({ accountId: "not-a-uuid" }),
    ).toThrow();
  });

  it("applies pagination defaults", () => {
    const result = AccountLedgerQuerySchema.parse({
      accountId: CASH_ACCOUNT_ID,
    });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.sortOrder).toBe("asc");
  });

  it("coerces page and pageSize from strings", () => {
    const result = AccountLedgerQuerySchema.parse({
      accountId: CASH_ACCOUNT_ID,
      page: "2",
      pageSize: "10",
    });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
  });

  it("rejects pageSize over 100", () => {
    expect(() =>
      AccountLedgerQuerySchema.parse({
        accountId: CASH_ACCOUNT_ID,
        pageSize: 101,
      }),
    ).toThrow();
  });

  it("accepts ledger sort fields", () => {
    const result = AccountLedgerQuerySchema.parse({
      accountId: CASH_ACCOUNT_ID,
      sortBy: "journalNumber",
      sortOrder: "desc",
    });
    expect(result.sortBy).toBe("journalNumber");
    expect(result.sortOrder).toBe("desc");
  });

  it("rejects invalid sort field", () => {
    expect(() =>
      AccountLedgerQuerySchema.parse({
        accountId: CASH_ACCOUNT_ID,
        sortBy: "accountCode",
      }),
    ).toThrow();
  });

  it("rejects inverted date range", () => {
    expect(() =>
      AccountLedgerQuerySchema.parse({
        accountId: CASH_ACCOUNT_ID,
        dateFrom: "2026-02-01",
        dateTo: "2026-01-01",
      }),
    ).toThrow();
  });
});

describe("GeneralLedgerQuerySchema", () => {
  it("mirrors account ledger validation", () => {
    const result = GeneralLedgerQuerySchema.parse({
      accountId: CASH_ACCOUNT_ID,
      page: "1",
    });
    expect(result.accountId).toBe(CASH_ACCOUNT_ID);
  });
});

describe("JournalReportQuerySchema", () => {
  it("applies pagination defaults", () => {
    const result = JournalReportQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("accepts status filter", () => {
    const result = JournalReportQuerySchema.parse({ status: "POSTED" });
    expect(result.status).toBe("POSTED");
  });

  it("rejects invalid status", () => {
    expect(() =>
      JournalReportQuerySchema.parse({ status: "OPEN" }),
    ).toThrow();
  });

  it("rejects search over 200 characters", () => {
    expect(() =>
      JournalReportQuerySchema.parse({ search: "x".repeat(201) }),
    ).toThrow();
  });

  it("accepts search under limit", () => {
    const result = JournalReportQuerySchema.parse({ search: "JE-001" });
    expect(result.search).toBe("JE-001");
  });

  it("accepts journal sort fields", () => {
    const result = JournalReportQuerySchema.parse({
      sortBy: "journalNumber",
      sortOrder: "asc",
    });
    expect(result.sortBy).toBe("journalNumber");
  });

  it("rejects inverted date range", () => {
    expect(() =>
      JournalReportQuerySchema.parse({
        dateFrom: "2026-05-01",
        dateTo: "2026-01-01",
      }),
    ).toThrow();
  });
});

describe("summary query schemas", () => {
  it("accepts cash flow date range", () => {
    const result = CashFlowSummaryQuerySchema.parse({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });
    expect(result.dateFrom).toBeInstanceOf(Date);
  });

  it("accepts revenue summary empty query", () => {
    expect(RevenueSummaryQuerySchema.parse({})).toEqual({});
  });

  it("accepts expense summary empty query", () => {
    expect(ExpenseSummaryQuerySchema.parse({})).toEqual({});
  });

  it("accepts accounts summary empty query", () => {
    expect(AccountsSummaryQuerySchema.parse({})).toEqual({});
  });

  it("rejects inverted cash flow dates", () => {
    expect(() =>
      CashFlowSummaryQuerySchema.parse({
        dateFrom: "2026-12-01",
        dateTo: "2026-01-01",
      }),
    ).toThrow();
  });
});
