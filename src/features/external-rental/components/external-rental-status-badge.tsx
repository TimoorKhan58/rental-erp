import { SemanticBadge } from "@/components/design-system/badge";
import type {
  ExternalRentalAgreementStatus,
  ExternalRentalSettlementStatus,
} from "../types";

const STATUS_LABELS: Record<ExternalRentalAgreementStatus, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  PARTIALLY_RECEIVED: "Partially received",
  RECEIVED: "Received",
  ALLOCATED: "Allocated",
  IN_USE: "In use",
  RETURN_PENDING: "Return pending",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
};

const STATUS_SEMANTIC: Record<
  ExternalRentalAgreementStatus,
  "draft" | "pending" | "success" | "warning" | "inactive"
> = {
  DRAFT: "draft",
  CONFIRMED: "pending",
  PARTIALLY_RECEIVED: "warning",
  RECEIVED: "success",
  ALLOCATED: "pending",
  IN_USE: "success",
  RETURN_PENDING: "warning",
  RETURNED: "inactive",
  CANCELLED: "inactive",
};

const SETTLEMENT_LABELS: Record<ExternalRentalSettlementStatus, string> = {
  UNSETTLED: "Unsettled",
  PARTIALLY_SETTLED: "Partially settled",
  SETTLED: "Settled",
};

const SETTLEMENT_SEMANTIC: Record<
  ExternalRentalSettlementStatus,
  "draft" | "pending" | "success" | "warning" | "inactive"
> = {
  UNSETTLED: "draft",
  PARTIALLY_SETTLED: "warning",
  SETTLED: "success",
};

export function ExternalRentalStatusBadge({
  status,
}: {
  status: ExternalRentalAgreementStatus;
}) {
  return (
    <SemanticBadge semantic={STATUS_SEMANTIC[status]}>
      {STATUS_LABELS[status]}
    </SemanticBadge>
  );
}

export function ExternalRentalSettlementBadge({
  status,
}: {
  status: ExternalRentalSettlementStatus;
}) {
  return (
    <SemanticBadge semantic={SETTLEMENT_SEMANTIC[status]}>
      {SETTLEMENT_LABELS[status]}
    </SemanticBadge>
  );
}

/** UI gating mirrors domain assertCan* rules (not authorization). */
export function canConfirmExternalRental(status: ExternalRentalAgreementStatus) {
  return status === "DRAFT";
}

export function canReceiveExternalRental(status: ExternalRentalAgreementStatus) {
  return status === "CONFIRMED" || status === "PARTIALLY_RECEIVED";
}

export function canAllocateExternalRental(status: ExternalRentalAgreementStatus) {
  return (
    status === "PARTIALLY_RECEIVED" ||
    status === "RECEIVED" ||
    status === "ALLOCATED"
  );
}

export function canSupplierReturnExternalRental(
  status: ExternalRentalAgreementStatus,
) {
  return (
    status !== "DRAFT" &&
    status !== "CONFIRMED" &&
    status !== "CANCELLED" &&
    status !== "RETURNED"
  );
}

/** UI gating mirrors domain assertCanWriteOff (not authorization). */
export function canWriteOffExternalRental(
  status: ExternalRentalAgreementStatus,
) {
  return canSupplierReturnExternalRental(status);
}

export function canSettleExternalRental(
  status: ExternalRentalAgreementStatus,
  amountDue: number,
  amountPaid: number,
) {
  return status !== "DRAFT" && status !== "CANCELLED" && amountDue > amountPaid;
}

export function canCancelExternalRental(status: ExternalRentalAgreementStatus) {
  return status === "DRAFT" || status === "CONFIRMED";
}

/** Primary next action for operators on the detail page. */
export function getNextExternalRentalStep(
  status: ExternalRentalAgreementStatus,
  options?: {
    hasCompanyCustody?: boolean;
    outstandingBalance?: number;
  },
): { label: string; hint: string } | null {
  switch (status) {
    case "DRAFT":
      return {
        label: "Confirm",
        hint: "Confirm requested quantities with the supplier.",
      };
    case "CONFIRMED":
      return {
        label: "Receive",
        hint: "Record what arrived from the supplier.",
      };
    case "PARTIALLY_RECEIVED":
      return {
        label: "Receive / Allocate",
        hint: "Finish receiving remaining qty, or allocate what you already have.",
      };
    case "RECEIVED":
      return {
        label: "Allocate",
        hint: "Allocate received hire-in qty to the rental order.",
      };
    case "ALLOCATED":
      return {
        label: "Dispatch",
        hint: "Create a dispatch with external quantity for this rental order.",
      };
    case "IN_USE":
      return {
        label: "Customer return",
        hint: "When the customer returns items, process a return (external qty).",
      };
    case "RETURN_PENDING":
      if (options?.hasCompanyCustody) {
        return {
          label: "Supplier return",
          hint: "Return company-custody qty to the supplier (or write off).",
        };
      }
      return {
        label: "Wait for customer return",
        hint: "Customer still holds external qty.",
      };
    case "RETURNED":
      if ((options?.outstandingBalance ?? 0) > 0) {
        return {
          label: "Settle",
          hint: "Record supplier payment for the hire-in cost.",
        };
      }
      return null;
    default:
      return null;
  }
}
