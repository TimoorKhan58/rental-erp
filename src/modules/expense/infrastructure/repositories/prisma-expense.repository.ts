import type { Prisma } from "@/generated/prisma/client";
import type { ExpenseListQuery } from "@/modules/expense/domain/expense-list.query";
import type { ExpenseId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryCreate,
  repositoryFindFirst,
  repositoryUpdate,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";

import { Expense } from "@/modules/expense/domain/expense.entity";
import type { IExpenseRepository } from "@/modules/expense/domain/expense.repository.interface";
import { EXPENSE_SEARCH_FIELDS } from "@/modules/expense/domain/expense.constants";
import type {
  CreateExpenseData,
  UpdateExpenseData,
  UpdateExpenseStatusData,
} from "@/modules/expense/domain/expense.types";

import {
  toExpenseCreateInput,
  toExpenseDomain,
  toExpenseStatusUpdateInput,
  toExpenseUpdateInput,
} from "../mappers/expense.persistence.mapper";

const MODEL = "Expense";

const DEFAULT_ORDER_BY: Prisma.ExpenseOrderByWithRelationInput = {
  createdAt: "desc",
};

function mapExpenseFilter(
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

function mapExpenseSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.ExpenseOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as Prisma.ExpenseOrderByWithRelationInput;
}

export class PrismaExpenseRepository implements IExpenseRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: ExpenseId): Promise<Expense | null> {
    return repositoryFindFirst(
      this.runner,
      (db) => db.expense.findUnique({ where: { id } }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toExpenseDomain(record) : null));
  }

  findByExpenseNumber(expenseNumber: string): Promise<Expense | null> {
    return repositoryFindFirst(
      this.runner,
      (db) => db.expense.findUnique({ where: { expenseNumber } }),
      { model: MODEL, operation: "findByExpenseNumber" },
    ).then((record) => (record ? toExpenseDomain(record) : null));
  }

  findPaged(query: ExpenseListQuery): Promise<PaginatedResult<Expense>> {
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

    return runRepositoryPagedQuery(this.runner, {
      spec: createRepositoryQuerySpec({
        page: query.page,
        pageSize: query.pageSize,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        search: query.search,
        searchFields: EXPENSE_SEARCH_FIELDS,
      }),
      searchFields: EXPENSE_SEARCH_FIELDS,
      mapFilter: mapExpenseFilter,
      mapSort: mapExpenseSort,
      handlers: {
        findMany: (db, args) =>
          db.expense.findMany({
            where: args.where,
            orderBy: args.orderBy,
            skip: args.skip,
            take: args.take,
          }),
        count: (db, args) =>
          db.expense.count({
            where: args.where,
          }),
      },
      meta: { model: MODEL, operation: "findPaged" },
    }).then((result) => ({
      items: result.items.map(toExpenseDomain),
      meta: result.meta,
    }));
  }

  create(data: CreateExpenseData): Promise<Expense> {
    return repositoryCreate(
      this.runner,
      (db) =>
        db.expense.create({
          data: toExpenseCreateInput(data),
        }),
      { model: MODEL, operation: "create" },
    ).then(toExpenseDomain);
  }

  update(
    id: ExpenseId,
    data: UpdateExpenseData,
    existing: Expense,
  ): Promise<Expense> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.expense.update({
          where: { id },
          data: toExpenseUpdateInput(data, existing),
        }),
      { model: MODEL, operation: "update" },
    ).then(toExpenseDomain);
  }

  updateStatus(
    id: ExpenseId,
    data: UpdateExpenseStatusData,
  ): Promise<Expense> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.expense.update({
          where: { id },
          data: toExpenseStatusUpdateInput(data),
        }),
      { model: MODEL, operation: "updateStatus" },
    ).then(toExpenseDomain);
  }
}
