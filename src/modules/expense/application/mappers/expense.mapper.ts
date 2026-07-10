import type { Expense } from "@/modules/expense/domain/expense.entity";
import type { ExpenseListQuery } from "@/modules/expense/domain/expense-list.query";
import type {
  CreateExpenseData,
  UpdateExpenseData,
} from "@/modules/expense/domain/expense.types";
import type {
  ExpenseCategoryId,
  ExpenseId,
  SupplierId,
  UserId,
} from "@/shared/domain/ids";

import type { ExpenseDto } from "../dtos/expense.dto";
import type {
  CreateExpenseInput,
  RejectExpenseInput,
  UpdateExpenseInput,
} from "../schemas/expense.schemas";
import type { ListExpensesInput } from "../schemas/list-expenses.schema";

export function toExpenseDto(expense: Expense): ExpenseDto {
  const props = expense.toProps();

  return {
    id: props.id,
    expenseNumber: props.expenseNumber,
    expenseDate: props.expenseDate.toISOString(),
    categoryId: props.categoryId,
    expenseType: props.expenseType,
    status: props.status,
    amount: props.amount,
    paymentMethod: props.paymentMethod,
    supplierId: props.supplierId,
    vendorName: props.vendorName,
    description: props.description,
    notes: props.notes,
    attachmentRef: props.attachmentRef,
    referenceNumber: props.referenceNumber,
    rejectionReason: props.rejectionReason,
    submittedAt: props.submittedAt?.toISOString() ?? null,
    approvedAt: props.approvedAt?.toISOString() ?? null,
    rejectedAt: props.rejectedAt?.toISOString() ?? null,
    paidAt: props.paidAt?.toISOString() ?? null,
    journalEntryId: props.journalEntryId,
    recordedById: props.recordedById,
    approvedById: props.approvedById,
    paidById: props.paidById,
    createdAt: props.createdAt.toISOString(),
    updatedAt: props.updatedAt.toISOString(),
  };
}

export function toCreateExpenseData(
  input: CreateExpenseInput,
  recordedById: UserId,
): CreateExpenseData {
  return {
    expenseNumber: input.expenseNumber,
    expenseDate: input.expenseDate,
    categoryId: input.categoryId as ExpenseCategoryId,
    expenseType: input.expenseType,
    amount: input.amount,
    paymentMethod: input.paymentMethod ?? null,
    supplierId: (input.supplierId ?? null) as SupplierId | null,
    vendorName: input.vendorName ?? null,
    description: input.description,
    notes: input.notes ?? null,
    attachmentRef: input.attachmentRef ?? null,
    referenceNumber: input.referenceNumber ?? null,
    recordedById,
  };
}

export function toUpdateExpenseData(input: UpdateExpenseInput): UpdateExpenseData {
  return {
    expenseDate: input.expenseDate,
    categoryId: input.categoryId as ExpenseCategoryId | undefined,
    expenseType: input.expenseType,
    amount: input.amount,
    paymentMethod: input.paymentMethod,
    supplierId:
      input.supplierId !== undefined
        ? (input.supplierId as SupplierId | null)
        : undefined,
    vendorName: input.vendorName,
    description: input.description,
    notes: input.notes,
    attachmentRef: input.attachmentRef,
    referenceNumber: input.referenceNumber,
  };
}

export function toRejectExpenseData(input: RejectExpenseInput): {
  rejectionReason: string;
} {
  return {
    rejectionReason: input.rejectionReason,
  };
}

export function toExpenseId(id: string): ExpenseId {
  return id as ExpenseId;
}

export function toExpenseCategoryId(id: string): ExpenseCategoryId {
  return id as ExpenseCategoryId;
}

export function toSupplierId(id: string): SupplierId {
  return id as SupplierId;
}

export function toUserId(id: string): UserId {
  return id as UserId;
}

export function toExpenseListQuery(input: ListExpensesInput): ExpenseListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    sortBy: input.sortBy,
    sortOrder: input.sortOrder,
    search: input.search,
    status: input.status,
    expenseType: input.expenseType,
    categoryId: input.categoryId as ExpenseCategoryId | undefined,
    supplierId: input.supplierId as SupplierId | undefined,
  };
}
