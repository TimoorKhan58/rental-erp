import { describe, expect, it } from "vitest";

import { GetExpenseSummaryService } from "@/modules/expense/application/services/get-expense-summary.service";
import { computeExpenseSummaryResult } from "@/modules/expense/domain/expense-summary.rules";
import { Expense } from "@/modules/expense/domain/expense.entity";
import type { ExpenseId } from "@/shared/domain/ids";

import {
  buildApprovedExpenseEntity,
  EXPENSE_CATEGORY_ID,
  EXPENSE_ID,
  USER_ID,
} from "../tests/helpers/expense.fixtures";
import { InMemoryExpenseRepository } from "../tests/helpers/in-memory-expense.repository";

function buildManyDraftExpenses(count: number) {
  return Array.from({ length: count }, (_, index) =>
    buildApprovedExpenseEntity({
      id: `bb0e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}` as ExpenseId,
      expenseNumber: `EXP-2026-${String(index + 1).padStart(3, "0")}`,
      status: "DRAFT",
      expenseType: "VENDOR",
      amount: 100,
    }),
  );
}

function createSeededExpenseRepository(expenses: Expense[]) {
  const repository = new InMemoryExpenseRepository();
  repository.seed(expenses);
  return repository;
}

describe("N-39-PATTERN-01 Batch 2 — expense summary stats completeness", () => {
  it("returns correct summary for exactly 100 expenses", async () => {
    const repository = createSeededExpenseRepository(buildManyDraftExpenses(100));
    const service = new GetExpenseSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalExpenses).toBe(100);
    expect(summary.statusCounts.all).toBe(100);
    expect(summary.statusCounts.DRAFT).toBe(100);
  });

  it("returns correct summary for 101 expenses (pagination boundary)", async () => {
    const repository = createSeededExpenseRepository(buildManyDraftExpenses(101));
    const service = new GetExpenseSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalExpenses).toBe(101);
    expect(summary.statusCounts.all).toBe(101);
    expect(summary.statusCounts.DRAFT).toBe(101);
  });

  it("returns correct summary for 150 expenses", async () => {
    const repository = createSeededExpenseRepository(buildManyDraftExpenses(150));
    const service = new GetExpenseSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalExpenses).toBe(150);
    expect(summary.statusCounts.DRAFT).toBe(150);
  });

  it("counts each status and amount across the full dataset", async () => {
    const expenses = [
      buildApprovedExpenseEntity({
        id: EXPENSE_ID,
        status: "PAID",
        expenseType: "VENDOR",
        amount: 200,
      }),
      buildApprovedExpenseEntity({
        id: "bb0e8400-e29b-41d4-a716-446655440011" as ExpenseId,
        expenseNumber: "EXP-2026-002",
        status: "APPROVED",
        expenseType: "VENDOR",
        amount: 150,
      }),
      buildApprovedExpenseEntity({
        id: "bb0e8400-e29b-41d4-a716-446655440012" as ExpenseId,
        expenseNumber: "EXP-2026-003",
        status: "REJECTED",
        expenseType: "VENDOR",
        amount: 75,
      }),
    ];
    const repository = createSeededExpenseRepository(expenses);
    const service = new GetExpenseSummaryService(repository);

    const summary = await service.execute({});
    const expected = computeExpenseSummaryResult(
      expenses.map((expense) => ({
        status: expense.status,
        amount: expense.amount,
      })),
    );

    expect(summary).toEqual(expected);
    expect(summary.stats.totalPaidAmount).toBe(200);
    expect(summary.stats.totalPendingAmount).toBe(150);
  });

  it("applies status filter to summary counts", async () => {
    const repository = createSeededExpenseRepository([
      buildApprovedExpenseEntity({ status: "DRAFT", expenseType: "VENDOR" }),
      buildApprovedExpenseEntity({
        id: "bb0e8400-e29b-41d4-a716-446655440013" as ExpenseId,
        expenseNumber: "EXP-2026-004",
        status: "PAID",
        expenseType: "VENDOR",
      }),
    ]);
    const service = new GetExpenseSummaryService(repository);

    const summary = await service.execute({ status: "DRAFT" });

    expect(summary.stats.totalExpenses).toBe(1);
    expect(summary.statusCounts.DRAFT).toBe(1);
    expect(summary.statusCounts.PAID).toBe(0);
  });

  it("returns zeroed summary for empty dataset", async () => {
    const repository = new InMemoryExpenseRepository();
    const service = new GetExpenseSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalExpenses).toBe(0);
    expect(summary.statusCounts.all).toBe(0);
    expect(summary.stats.totalPaidAmount).toBe(0);
    expect(summary.stats.totalPendingAmount).toBe(0);
  });

  it("matches list filter semantics via shared summary query rules", async () => {
    const repository = createSeededExpenseRepository([
      buildApprovedExpenseEntity({
        categoryId: EXPENSE_CATEGORY_ID,
        expenseType: "VENDOR",
        status: "DRAFT",
      }),
      buildApprovedExpenseEntity({
        id: "bb0e8400-e29b-41d4-a716-446655440014" as ExpenseId,
        expenseNumber: "EXP-2026-005",
        categoryId: "cc0e8400-e29b-41d4-a716-446655440099" as typeof EXPENSE_CATEGORY_ID,
        expenseType: "MANUAL",
        status: "DRAFT",
      }),
    ]);
    const service = new GetExpenseSummaryService(repository);

    const summary = await service.execute({
      categoryId: EXPENSE_CATEGORY_ID,
      expenseType: "VENDOR",
    });

    expect(summary.stats.totalExpenses).toBe(1);
  });
});
