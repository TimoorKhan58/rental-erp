import type { ExpenseDto } from "@/modules/expense/application/dtos/expense.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface ExpenseResponse {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  categoryId: string;
  expenseType: ExpenseDto["expenseType"];
  status: ExpenseDto["status"];
  amount: number;
  paymentMethod: ExpenseDto["paymentMethod"];
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

export interface ExpenseListResponse {
  items: ExpenseResponse[];
  meta: PaginationMeta;
}

export function toExpenseResponse(dto: ExpenseDto): ExpenseResponse {
  return {
    id: dto.id,
    expenseNumber: dto.expenseNumber,
    expenseDate: dto.expenseDate,
    categoryId: dto.categoryId,
    expenseType: dto.expenseType,
    status: dto.status,
    amount: dto.amount,
    paymentMethod: dto.paymentMethod,
    supplierId: dto.supplierId,
    vendorName: dto.vendorName,
    description: dto.description,
    notes: dto.notes,
    attachmentRef: dto.attachmentRef,
    referenceNumber: dto.referenceNumber,
    rejectionReason: dto.rejectionReason,
    submittedAt: dto.submittedAt,
    approvedAt: dto.approvedAt,
    rejectedAt: dto.rejectedAt,
    paidAt: dto.paidAt,
    journalEntryId: dto.journalEntryId,
    recordedById: dto.recordedById,
    approvedById: dto.approvedById,
    paidById: dto.paidById,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toExpenseListResponse(
  result: PaginatedResult<ExpenseDto>,
): ExpenseListResponse {
  return {
    items: result.items.map(toExpenseResponse),
    meta: result.meta,
  };
}
