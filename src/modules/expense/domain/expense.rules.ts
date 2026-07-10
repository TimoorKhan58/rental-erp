import type { ExpenseStatus, ExpenseType } from "./expense.constants";
import {
  ExpenseEligibilityError,
  ExpenseInvalidStatusError,
  ExpenseInvariantError,
  createExpenseNumber,
} from "./expense.errors";
import type {
  CreateExpenseData,
  ExpenseProps,
  RejectExpenseData,
  UpdateExpenseData,
} from "./expense.types";

export function validateExpenseAmount(amount: number): number {
  if (amount <= 0) {
    throw new ExpenseInvariantError(
      "Expense amount must be greater than zero",
      "amount",
    );
  }

  return roundMoney(amount);
}

export function assertCanUpdate(status: ExpenseStatus): void {
  if (status !== "DRAFT") {
    throw new ExpenseInvalidStatusError(status, "update");
  }
}

export function assertCanSubmit(status: ExpenseStatus): void {
  if (status !== "DRAFT") {
    throw new ExpenseInvalidStatusError(status, "submit");
  }
}

export function assertCanApprove(status: ExpenseStatus): void {
  if (status !== "SUBMITTED") {
    throw new ExpenseInvalidStatusError(status, "approve");
  }
}

export function assertCanReject(status: ExpenseStatus): void {
  if (status !== "SUBMITTED") {
    throw new ExpenseInvalidStatusError(status, "reject");
  }
}

export function assertCanPay(status: ExpenseStatus): void {
  if (status !== "APPROVED") {
    throw new ExpenseInvalidStatusError(status, "pay");
  }
}

export function assertExpenseTypeRequirements(
  expenseType: ExpenseType,
  supplierId: string | null | undefined,
  vendorName: string | null | undefined,
): void {
  if (expenseType === "VENDOR" && (supplierId === null || supplierId === undefined)) {
    throw new ExpenseEligibilityError(
      "Supplier is required for vendor expenses",
    );
  }

  if (
    expenseType === "MANUAL" &&
    (vendorName === null || vendorName === undefined || vendorName.trim().length === 0)
  ) {
    throw new ExpenseEligibilityError(
      "Vendor name is required for manual expenses",
    );
  }
}

export function normalizeCreateExpenseData(
  data: CreateExpenseData,
): Omit<ExpenseProps, "id" | "createdAt" | "updatedAt"> {
  const supplierId = data.supplierId ?? null;
  const vendorName = normalizeOptionalText(data.vendorName);

  assertExpenseTypeRequirements(data.expenseType, supplierId, vendorName);

  return {
    expenseNumber: createExpenseNumber(data.expenseNumber),
    expenseDate: data.expenseDate,
    categoryId: data.categoryId,
    expenseType: data.expenseType,
    status: "DRAFT",
    amount: validateExpenseAmount(data.amount),
    paymentMethod: data.paymentMethod ?? null,
    supplierId,
    vendorName,
    description: normalizeRequiredText(data.description, "description"),
    notes: normalizeOptionalText(data.notes),
    attachmentRef: normalizeOptionalText(data.attachmentRef),
    referenceNumber: normalizeOptionalText(data.referenceNumber),
    rejectionReason: null,
    submittedAt: null,
    approvedAt: null,
    rejectedAt: null,
    paidAt: null,
    journalEntryId: null,
    recordedById: data.recordedById,
    approvedById: null,
    paidById: null,
  };
}

export function normalizeExpenseProps(props: ExpenseProps): ExpenseProps {
  return {
    ...props,
    expenseNumber: createExpenseNumber(props.expenseNumber),
    amount: validateExpenseAmount(props.amount),
    vendorName: normalizeOptionalText(props.vendorName),
    description: normalizeRequiredText(props.description, "description"),
    notes: normalizeOptionalText(props.notes),
    attachmentRef: normalizeOptionalText(props.attachmentRef),
    referenceNumber: normalizeOptionalText(props.referenceNumber),
    rejectionReason: normalizeOptionalText(props.rejectionReason),
  };
}

export function normalizeUpdateExpenseData(
  data: UpdateExpenseData,
): UpdateExpenseData {
  const normalized: {
    -readonly [K in keyof UpdateExpenseData]: UpdateExpenseData[K];
  } = { ...data };

  if (data.amount !== undefined) {
    normalized.amount = validateExpenseAmount(data.amount);
  }

  if (data.vendorName !== undefined) {
    normalized.vendorName = normalizeOptionalText(data.vendorName);
  }

  if (data.description !== undefined) {
    normalized.description = normalizeRequiredText(data.description, "description");
  }

  if (data.notes !== undefined) {
    normalized.notes = normalizeOptionalText(data.notes);
  }

  if (data.attachmentRef !== undefined) {
    normalized.attachmentRef = normalizeOptionalText(data.attachmentRef);
  }

  if (data.referenceNumber !== undefined) {
    normalized.referenceNumber = normalizeOptionalText(data.referenceNumber);
  }

  return normalized;
}

export function normalizeRejectExpenseData(
  data: RejectExpenseData,
): RejectExpenseData {
  return {
    rejectionReason: normalizeRequiredText(
      data.rejectionReason,
      "rejectionReason",
    ),
  };
}

function normalizeRequiredText(value: string, field: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new ExpenseInvariantError(`${field} is required`, field);
  }

  return trimmed;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
