import type { PaginationMeta } from "@/types/api";

export const EXPENSE_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "PAID",
] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const EXPENSE_TYPES = ["VENDOR", "MANUAL"] as const;
export type ExpenseType = (typeof EXPENSE_TYPES)[number];

export const EXPENSE_PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "CHEQUE",
  "CARD",
  "ONLINE",
  "OTHER",
] as const;
export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];

export type ExpenseResponse = {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  categoryId: string;
  expenseType: ExpenseType;
  status: ExpenseStatus;
  amount: number;
  paymentMethod: ExpensePaymentMethod | null;
  supplierId: string | null;
  vendorName: string | null;
  description: string;
  notes: string | null;
  attachmentRef: string | null;
  referenceNumber: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  paidAt: string | null;
  journalEntryId: string | null;
  recordedById: string;
  approvedById: string | null;
  paidById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseListResponse = {
  items: ExpenseResponse[];
  meta: PaginationMeta;
};

export type ExpenseSortField =
  | "expenseNumber"
  | "expenseDate"
  | "amount"
  | "status"
  | "createdAt";

export type ListExpensesParams = {
  page?: number;
  pageSize?: number;
  sortBy?: ExpenseSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: ExpenseStatus;
  expenseType?: ExpenseType;
  categoryId?: string;
  supplierId?: string;
};

export type CreateExpensePayload = {
  expenseNumber: string;
  expenseDate: string;
  categoryId: string;
  expenseType: ExpenseType;
  amount: number;
  paymentMethod?: ExpensePaymentMethod | null;
  supplierId?: string | null;
  vendorName?: string | null;
  description: string;
  notes?: string | null;
  attachmentRef?: string | null;
  referenceNumber?: string | null;
};

export type UpdateExpensePayload = {
  expenseDate?: string;
  categoryId?: string;
  expenseType?: ExpenseType;
  amount?: number;
  paymentMethod?: ExpensePaymentMethod | null;
  supplierId?: string | null;
  vendorName?: string | null;
  description?: string;
  notes?: string | null;
  attachmentRef?: string | null;
  referenceNumber?: string | null;
};

export type RejectExpensePayload = {
  rejectionReason: string;
};

export type ExpenseCategoryResponse = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ExpenseCategoryListResponse = {
  items: ExpenseCategoryResponse[];
  meta: PaginationMeta;
};

export type ListExpenseCategoriesParams = {
  page?: number;
  pageSize?: number;
  sortBy?: "name" | "isActive" | "createdAt";
  sortOrder?: "asc" | "desc";
  search?: string;
  isActive?: boolean;
};

export type CreateExpenseCategoryPayload = {
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export type UpdateExpenseCategoryPayload = {
  name?: string;
  description?: string | null;
  isActive?: boolean;
};
