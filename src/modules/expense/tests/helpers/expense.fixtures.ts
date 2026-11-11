import { Expense } from "@/modules/expense/domain/expense.entity";
import type {
  ExpenseCategoryId,
  ExpenseId,
  UserId,
} from "@/shared/domain/ids";

export const USER_ID =
  "aa0e8400-e29b-41d4-a716-446655440000" as UserId;

export const EXPENSE_ID =
  "bb0e8400-e29b-41d4-a716-446655440010" as ExpenseId;

export const EXPENSE_CATEGORY_ID =
  "cc0e8400-e29b-41d4-a716-446655440010" as ExpenseCategoryId;

export function buildApprovedExpenseEntity(
  override: Partial<ReturnType<Expense["toProps"]>> = {},
): Expense {
  const now = new Date("2026-03-01T10:00:00.000Z");

  return Expense.reconstitute({
    id: EXPENSE_ID,
    expenseNumber: "EXP-2026-001",
    expenseDate: new Date("2026-03-01T00:00:00.000Z"),
    categoryId: EXPENSE_CATEGORY_ID,
    expenseType: "OPERATING",
    status: "APPROVED",
    amount: 250,
    paymentMethod: "CASH",
    supplierId: null,
    vendorName: "Office Supplies Co",
    description: "Printer toner",
    notes: null,
    attachmentRef: null,
    referenceNumber: null,
    rejectionReason: null,
    submittedAt: now,
    approvedAt: now,
    rejectedAt: null,
    paidAt: null,
    journalEntryId: null,
    recordedById: USER_ID,
    approvedById: USER_ID,
    paidById: null,
    createdAt: now,
    updatedAt: now,
    ...override,
  });
}
