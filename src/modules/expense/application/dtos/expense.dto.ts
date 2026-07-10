import type {
  ExpensePaymentMethod,
  ExpenseStatus,
  ExpenseType,
} from "@/modules/expense/domain/expense.constants";

export interface ExpenseDto {
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
}

export interface CreateExpenseDto {
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
}

export interface UpdateExpenseDto {
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
}

export interface RejectExpenseDto {
  rejectionReason: string;
}

export interface ExpenseIdParamDto {
  id: string;
}
