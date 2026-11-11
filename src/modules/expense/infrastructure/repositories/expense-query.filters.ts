import type { Prisma } from "@/generated/prisma/client";

import type { Expense } from "@/modules/expense/domain/expense.entity";
import type { ExpenseSummaryQuery } from "@/modules/expense/domain/expense-summary.query";
import { EXPENSE_SEARCH_FIELDS } from "@/modules/expense/domain/expense.constants";
import { buildSearchWhereFromInput } from "@/shared/infrastructure/database/repository/query/build-search";
import { mergePrismaWhere } from "@/shared/infrastructure/database/repository/query/merge-prisma-where";

export function mapExpenseFilter(
  filter: Record<string, unknown>,
): Prisma.ExpenseWhereInput | undefined {
  const where: Prisma.ExpenseWhereInput = {};

  if (filter.status !== undefined) {
    where.status = filter.status as Expense["status"];
  }

  if (filter.expenseType !== undefined) {
    where.expenseType = filter.expenseType as Expense["expenseType"];
  }

  if (filter.categoryId !== undefined) {
    where.categoryId = String(filter.categoryId);
  }

  if (filter.supplierId !== undefined) {
    where.supplierId = String(filter.supplierId);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

export function toExpenseFilterRecord(
  query: ExpenseSummaryQuery,
): Record<string, unknown> | undefined {
  const filter: Record<string, unknown> = {};

  if (query.status !== undefined) {
    filter.status = query.status;
  }

  if (query.expenseType !== undefined) {
    filter.expenseType = query.expenseType;
  }

  if (query.categoryId !== undefined) {
    filter.categoryId = query.categoryId;
  }

  if (query.supplierId !== undefined) {
    filter.supplierId = query.supplierId;
  }

  return Object.keys(filter).length > 0 ? filter : undefined;
}

export function buildExpenseSummaryWhere(
  query: ExpenseSummaryQuery,
): Prisma.ExpenseWhereInput | undefined {
  const filterRecord = toExpenseFilterRecord(query);
  const filterWhere = filterRecord ? mapExpenseFilter(filterRecord) : undefined;
  const searchWhere = buildSearchWhereFromInput<Prisma.ExpenseWhereInput>(
    query.search !== undefined && query.search.trim().length > 0
      ? { term: query.search.trim(), fields: EXPENSE_SEARCH_FIELDS }
      : undefined,
    EXPENSE_SEARCH_FIELDS,
  );

  return mergePrismaWhere(filterWhere, searchWhere);
}

export function mergeExpenseWhere(
  base: Prisma.ExpenseWhereInput | undefined,
  extra: Prisma.ExpenseWhereInput,
): Prisma.ExpenseWhereInput {
  return mergePrismaWhere(base, extra) ?? extra;
}
