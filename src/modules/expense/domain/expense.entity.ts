import type { ExpenseId, UserId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import type { ExpenseStatus } from "./expense.constants";
import {
  assertCanApprove,
  assertCanPay,
  assertCanReject,
  assertCanSubmit,
  assertCanUpdate,
  assertExpenseTypeRequirements,
  normalizeCreateExpenseData,
  normalizeExpenseProps,
  normalizeRejectExpenseData,
  normalizeUpdateExpenseData,
  validateExpenseAmount,
} from "./expense.rules";
import type {
  CreateExpenseData,
  ExpenseProps,
  RejectExpenseData,
  UpdateExpenseData,
} from "./expense.types";

export class Expense implements Entity<ExpenseId> {
  readonly id: ExpenseId;
  readonly expenseNumber: string;
  readonly expenseDate: Date;
  readonly categoryId: ExpenseProps["categoryId"];
  readonly expenseType: ExpenseProps["expenseType"];
  readonly status: ExpenseStatus;
  readonly amount: number;
  readonly paymentMethod: ExpenseProps["paymentMethod"];
  readonly supplierId: ExpenseProps["supplierId"];
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
  readonly journalEntryId: ExpenseProps["journalEntryId"];
  readonly recordedById: ExpenseProps["recordedById"];
  readonly approvedById: UserId | null;
  readonly paidById: UserId | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: ExpenseProps) {
    const normalized = normalizeExpenseProps(props);

    this.id = normalized.id;
    this.expenseNumber = normalized.expenseNumber;
    this.expenseDate = normalized.expenseDate;
    this.categoryId = normalized.categoryId;
    this.expenseType = normalized.expenseType;
    this.status = normalized.status;
    this.amount = normalized.amount;
    this.paymentMethod = normalized.paymentMethod;
    this.supplierId = normalized.supplierId;
    this.vendorName = normalized.vendorName;
    this.description = normalized.description;
    this.notes = normalized.notes;
    this.attachmentRef = normalized.attachmentRef;
    this.referenceNumber = normalized.referenceNumber;
    this.rejectionReason = normalized.rejectionReason;
    this.submittedAt = normalized.submittedAt;
    this.approvedAt = normalized.approvedAt;
    this.rejectedAt = normalized.rejectedAt;
    this.paidAt = normalized.paidAt;
    this.journalEntryId = normalized.journalEntryId;
    this.recordedById = normalized.recordedById;
    this.approvedById = normalized.approvedById;
    this.paidById = normalized.paidById;
    this.createdAt = normalized.createdAt;
    this.updatedAt = normalized.updatedAt;
  }

  static create(
    data: CreateExpenseData,
  ): Omit<ExpenseProps, "id" | "createdAt" | "updatedAt"> {
    const normalized = normalizeCreateExpenseData(data);

    return normalized;
  }

  static reconstitute(props: ExpenseProps): Expense {
    return new Expense(props);
  }

  toProps(): ExpenseProps {
    return {
      id: this.id,
      expenseNumber: this.expenseNumber,
      expenseDate: this.expenseDate,
      categoryId: this.categoryId,
      expenseType: this.expenseType,
      status: this.status,
      amount: this.amount,
      paymentMethod: this.paymentMethod,
      supplierId: this.supplierId,
      vendorName: this.vendorName,
      description: this.description,
      notes: this.notes,
      attachmentRef: this.attachmentRef,
      referenceNumber: this.referenceNumber,
      rejectionReason: this.rejectionReason,
      submittedAt: this.submittedAt,
      approvedAt: this.approvedAt,
      rejectedAt: this.rejectedAt,
      paidAt: this.paidAt,
      journalEntryId: this.journalEntryId,
      recordedById: this.recordedById,
      approvedById: this.approvedById,
      paidById: this.paidById,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  withUpdated(data: UpdateExpenseData): Expense {
    assertCanUpdate(this.status);
    const normalized = normalizeUpdateExpenseData(data);
    const expenseType = normalized.expenseType ?? this.expenseType;
    const supplierId =
      normalized.supplierId !== undefined
        ? normalized.supplierId
        : this.supplierId;
    const vendorName =
      normalized.vendorName !== undefined
        ? normalized.vendorName
        : this.vendorName;

    assertExpenseTypeRequirements(expenseType, supplierId, vendorName);

    return Expense.reconstitute({
      ...this.toProps(),
      expenseDate: normalized.expenseDate ?? this.expenseDate,
      categoryId: normalized.categoryId ?? this.categoryId,
      expenseType,
      amount:
        normalized.amount !== undefined
          ? validateExpenseAmount(normalized.amount)
          : this.amount,
      paymentMethod:
        normalized.paymentMethod !== undefined
          ? normalized.paymentMethod
          : this.paymentMethod,
      supplierId,
      vendorName,
      description: normalized.description ?? this.description,
      notes: normalized.notes !== undefined ? normalized.notes : this.notes,
      attachmentRef:
        normalized.attachmentRef !== undefined
          ? normalized.attachmentRef
          : this.attachmentRef,
      referenceNumber:
        normalized.referenceNumber !== undefined
          ? normalized.referenceNumber
          : this.referenceNumber,
      updatedAt: new Date(),
    });
  }

  withSubmitted(): Expense {
    assertCanSubmit(this.status);

    return Expense.reconstitute({
      ...this.toProps(),
      status: "SUBMITTED",
      submittedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  withApproved(approvedById: UserId): Expense {
    assertCanApprove(this.status);

    return Expense.reconstitute({
      ...this.toProps(),
      status: "APPROVED",
      approvedAt: new Date(),
      approvedById,
      updatedAt: new Date(),
    });
  }

  withRejected(data: RejectExpenseData): Expense {
    assertCanReject(this.status);
    const normalized = normalizeRejectExpenseData(data);

    return Expense.reconstitute({
      ...this.toProps(),
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectionReason: normalized.rejectionReason,
      updatedAt: new Date(),
    });
  }

  withPaid(paidById: UserId): Expense {
    assertCanPay(this.status);

    return Expense.reconstitute({
      ...this.toProps(),
      status: "PAID",
      paidAt: new Date(),
      paidById,
      updatedAt: new Date(),
    });
  }
}
