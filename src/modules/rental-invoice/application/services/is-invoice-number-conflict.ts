import { Prisma } from "@/generated/prisma/client";
import { ConflictError } from "@/shared/infrastructure/errors";

function conflictTargetIncludesInvoiceNumber(target: unknown): boolean {
  if (Array.isArray(target)) {
    return target.some((field) => String(field).includes("invoiceNumber"));
  }

  if (typeof target === "string") {
    return target.includes("invoiceNumber");
  }

  return false;
}

function isPrismaInvoiceNumberP2002(cause: unknown): boolean {
  if (!(cause instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (cause.code !== "P2002") {
    return false;
  }

  return conflictTargetIncludesInvoiceNumber(cause.meta?.target);
}

/**
 * Phase 55 (N-51-01): detects invoice-number allocation conflicts for retry.
 * Matches application pre-check conflicts and Prisma P2002 on invoiceNumber.
 */
export function isInvoiceNumberConflict(error: unknown): boolean {
  if (!(error instanceof ConflictError)) {
    return false;
  }

  if (error.message === "Invoice number already exists") {
    return true;
  }

  if (isPrismaInvoiceNumberP2002(error.cause)) {
    return true;
  }

  const details = error.details;
  if (
    typeof details === "object" &&
    details !== null &&
    "target" in details &&
    conflictTargetIncludesInvoiceNumber((details as { target: unknown }).target)
  ) {
    return true;
  }

  return false;
}
