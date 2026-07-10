import type { Expense } from "@/modules/expense/domain/expense.entity";
import type { AuditValues } from "@/shared/infrastructure/audit/audit-logger.interface";

export function toExpenseAuditValues(expense: Expense): AuditValues {
  const props = expense.toProps();

  return {
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
  };
}
