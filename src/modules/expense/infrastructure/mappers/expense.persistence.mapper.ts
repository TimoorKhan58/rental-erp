import { Prisma } from "@/generated/prisma/client";
import { Expense } from "@/modules/expense/domain/expense.entity";
import type { ExpenseStatus } from "@/modules/expense/domain/expense.constants";
import type {
  CreateExpenseData,
  UpdateExpenseData,
  UpdateExpenseStatusData,
} from "@/modules/expense/domain/expense.types";
import type {
  ExpenseCategoryId,
  ExpenseId,
  JournalEntryId,
  SupplierId,
  UserId,
} from "@/shared/domain/ids";

function decimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

function toPrismaDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function toExpenseDomain(record: {
  id: string;
  expenseNumber: string;
  expenseDate: Date;
  categoryId: string;
  expenseType: Expense["expenseType"];
  status: ExpenseStatus;
  amount: Prisma.Decimal;
  paymentMethod: Expense["paymentMethod"];
  supplierId: string | null;
  vendorName: string | null;
  description: string;
  notes: string | null;
  attachmentRef: string | null;
  referenceNumber: string | null;
  rejectionReason: string | null;
  submittedAt: Date | null;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  paidAt: Date | null;
  journalEntryId: string | null;
  recordedById: string;
  approvedById: string | null;
  paidById: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Expense {
  return Expense.reconstitute({
    id: record.id as ExpenseId,
    expenseNumber: record.expenseNumber,
    expenseDate: record.expenseDate,
    categoryId: record.categoryId as ExpenseCategoryId,
    expenseType: record.expenseType,
    status: record.status,
    amount: decimalToNumber(record.amount),
    paymentMethod: record.paymentMethod,
    supplierId: record.supplierId as SupplierId | null,
    vendorName: record.vendorName,
    description: record.description,
    notes: record.notes,
    attachmentRef: record.attachmentRef,
    referenceNumber: record.referenceNumber,
    rejectionReason: record.rejectionReason,
    submittedAt: record.submittedAt,
    approvedAt: record.approvedAt,
    rejectedAt: record.rejectedAt,
    paidAt: record.paidAt,
    journalEntryId: record.journalEntryId as JournalEntryId | null,
    recordedById: record.recordedById as UserId,
    approvedById: record.approvedById as UserId | null,
    paidById: record.paidById as UserId | null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
}

export function toExpenseCreateInput(
  data: CreateExpenseData,
): Prisma.ExpenseCreateInput {
  const normalized = Expense.create(data);

  return {
    expenseNumber: normalized.expenseNumber,
    expenseDate: normalized.expenseDate,
    category: { connect: { id: normalized.categoryId } },
    expenseType: normalized.expenseType,
    amount: toPrismaDecimal(normalized.amount),
    paymentMethod: normalized.paymentMethod,
    supplier:
      normalized.supplierId !== null
        ? { connect: { id: normalized.supplierId } }
        : undefined,
    vendorName: normalized.vendorName,
    description: normalized.description,
    notes: normalized.notes,
    attachmentRef: normalized.attachmentRef,
    referenceNumber: normalized.referenceNumber,
    status: normalized.status,
    recordedBy: { connect: { id: normalized.recordedById } },
  };
}

export function toExpenseUpdateInput(
  data: UpdateExpenseData,
  existing: Expense,
): Prisma.ExpenseUpdateInput {
  const updated = existing.withUpdated(data);
  const props = updated.toProps();
  const update: Prisma.ExpenseUpdateInput = {};

  if (data.expenseDate !== undefined) {
    update.expenseDate = data.expenseDate;
  }

  if (data.categoryId !== undefined) {
    update.category = { connect: { id: data.categoryId } };
  }

  if (data.expenseType !== undefined) {
    update.expenseType = data.expenseType;
  }

  if (data.amount !== undefined) {
    update.amount = toPrismaDecimal(props.amount);
  }

  if (data.paymentMethod !== undefined) {
    update.paymentMethod = data.paymentMethod;
  }

  if (data.supplierId !== undefined) {
    update.supplier =
      data.supplierId !== null
        ? { connect: { id: data.supplierId } }
        : { disconnect: true };
  }

  if (data.vendorName !== undefined) {
    update.vendorName = data.vendorName;
  }

  if (data.description !== undefined) {
    update.description = data.description;
  }

  if (data.notes !== undefined) {
    update.notes = data.notes;
  }

  if (data.attachmentRef !== undefined) {
    update.attachmentRef = data.attachmentRef;
  }

  if (data.referenceNumber !== undefined) {
    update.referenceNumber = data.referenceNumber;
  }

  return update;
}

export function toExpenseStatusUpdateInput(
  data: UpdateExpenseStatusData,
): Prisma.ExpenseUpdateInput {
  const update: Prisma.ExpenseUpdateInput = {
    status: data.status,
  };

  if (data.submittedAt !== undefined) {
    update.submittedAt = data.submittedAt;
  }

  if (data.approvedAt !== undefined) {
    update.approvedAt = data.approvedAt;
  }

  if (data.rejectedAt !== undefined) {
    update.rejectedAt = data.rejectedAt;
  }

  if (data.paidAt !== undefined) {
    update.paidAt = data.paidAt;
  }

  if (data.rejectionReason !== undefined) {
    update.rejectionReason = data.rejectionReason;
  }

  if (data.approvedById !== undefined) {
    update.approvedBy =
      data.approvedById !== null
        ? { connect: { id: data.approvedById } }
        : { disconnect: true };
  }

  if (data.paidById !== undefined) {
    update.paidBy =
      data.paidById !== null
        ? { connect: { id: data.paidById } }
        : { disconnect: true };
  }

  if (data.journalEntryId !== undefined) {
    update.journalEntry =
      data.journalEntryId !== null
        ? { connect: { id: data.journalEntryId } }
        : { disconnect: true };
  }

  return update;
}
