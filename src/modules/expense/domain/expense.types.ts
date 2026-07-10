import type {
  ExpenseCategoryId,
  ExpenseId,
  JournalEntryId,
  SupplierId,
  UserId,
} from "@/shared/domain/ids";

import type {
  ExpensePaymentMethod,
  ExpenseStatus,
  ExpenseType,
} from "./expense.constants";

export interface ExpenseProps {
  readonly id: ExpenseId;
  readonly expenseNumber: string;
  readonly expenseDate: Date;
  readonly categoryId: ExpenseCategoryId;
  readonly expenseType: ExpenseType;
  readonly status: ExpenseStatus;
  readonly amount: number;
  readonly paymentMethod: ExpensePaymentMethod | null;
  readonly supplierId: SupplierId | null;
  readonly vendorName: string | null;
  readonly description: string;
  readonly notes: string | null;
  readonly attachmentRef: string | null;
  readonly referenceNumber: string | null;
  readonly rejectionReason: string | null;
  readonly submittedAt: Date | null;
  readonly approvedAt: Date | null;
  readonly rejectedAt: Date | null;
  readonly paidAt: Date | null;
  readonly journalEntryId: JournalEntryId | null;
  readonly recordedById: UserId;
  readonly approvedById: UserId | null;
  readonly paidById: UserId | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateExpenseData {
  readonly expenseNumber: string;
  readonly expenseDate: Date;
  readonly categoryId: ExpenseCategoryId;
  readonly expenseType: ExpenseType;
  readonly amount: number;
  readonly paymentMethod?: ExpensePaymentMethod | null;
  readonly supplierId?: SupplierId | null;
  readonly vendorName?: string | null;
  readonly description: string;
  readonly notes?: string | null;
  readonly attachmentRef?: string | null;
  readonly referenceNumber?: string | null;
  readonly recordedById: UserId;
}

export interface UpdateExpenseData {
  readonly expenseDate?: Date;
  readonly categoryId?: ExpenseCategoryId;
  readonly expenseType?: ExpenseType;
  readonly amount?: number;
  readonly paymentMethod?: ExpensePaymentMethod | null;
  readonly supplierId?: SupplierId | null;
  readonly vendorName?: string | null;
  readonly description?: string;
  readonly notes?: string | null;
  readonly attachmentRef?: string | null;
  readonly referenceNumber?: string | null;
}

export interface UpdateExpenseStatusData {
  readonly status: ExpenseStatus;
  readonly submittedAt?: Date | null;
  readonly approvedAt?: Date | null;
  readonly rejectedAt?: Date | null;
  readonly paidAt?: Date | null;
  readonly rejectionReason?: string | null;
  readonly approvedById?: UserId | null;
  readonly paidById?: UserId | null;
  readonly journalEntryId?: JournalEntryId | null;
}

export interface RejectExpenseData {
  readonly rejectionReason: string;
}
