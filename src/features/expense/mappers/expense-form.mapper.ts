import type {
  CreateExpenseFormValues,
  UpdateExpenseFormValues,
} from "../schemas";
import type {
  CreateExpensePayload,
  ExpensePaymentMethod,
  ExpenseResponse,
  UpdateExpensePayload,
} from "../types";

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }

  return value.trim();
}

function normalizePaymentMethod(
  value: string | null | undefined,
): ExpensePaymentMethod | null {
  if (!value || value.trim() === "") {
    return null;
  }

  return value as ExpensePaymentMethod;
}

export function generateExpenseNumber(): string {
  const date = new Date();
  const ymd = date.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = String(date.getTime()).slice(-4);
  return `EXP-${ymd}-${suffix}`;
}

export function toCreateExpensePayload(
  values: CreateExpenseFormValues,
): CreateExpensePayload {
  const expenseType = values.expenseType;

  return {
    expenseNumber: values.expenseNumber?.trim() || generateExpenseNumber(),
    expenseDate: values.expenseDate,
    categoryId: values.categoryId,
    expenseType,
    amount: values.amount,
    paymentMethod: normalizePaymentMethod(values.paymentMethod),
    supplierId:
      expenseType === "VENDOR"
        ? normalizeOptionalString(values.supplierId)
        : null,
    vendorName:
      expenseType === "MANUAL"
        ? normalizeOptionalString(values.vendorName)
        : null,
    description: values.description.trim(),
    notes: normalizeOptionalString(values.notes),
    referenceNumber: normalizeOptionalString(values.referenceNumber),
  };
}

export function toUpdateExpensePayload(
  values: UpdateExpenseFormValues,
): UpdateExpensePayload {
  const expenseType = values.expenseType;

  return {
    expenseDate: values.expenseDate,
    categoryId: values.categoryId,
    expenseType,
    amount: values.amount,
    paymentMethod: normalizePaymentMethod(values.paymentMethod),
    supplierId:
      expenseType === "VENDOR"
        ? normalizeOptionalString(values.supplierId)
        : null,
    vendorName:
      expenseType === "MANUAL"
        ? normalizeOptionalString(values.vendorName)
        : null,
    description: values.description.trim(),
    notes: normalizeOptionalString(values.notes),
    referenceNumber: normalizeOptionalString(values.referenceNumber),
  };
}

export function toExpenseFormValues(
  expense: ExpenseResponse,
): UpdateExpenseFormValues {
  return {
    expenseDate: expense.expenseDate,
    categoryId: expense.categoryId,
    expenseType: expense.expenseType,
    amount: expense.amount,
    paymentMethod: expense.paymentMethod ?? "",
    supplierId: expense.supplierId ?? "",
    vendorName: expense.vendorName ?? "",
    description: expense.description,
    notes: expense.notes ?? "",
    referenceNumber: expense.referenceNumber ?? "",
  };
}
