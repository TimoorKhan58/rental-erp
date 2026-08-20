import { ROUTES } from "@/config/routes";

const REFERENCE_ROUTE_BUILDERS: Record<string, (id: string) => string> = {
  PURCHASE_ORDER: ROUTES.procurementDetail,
  RENTAL_ORDER: ROUTES.rentalOrderDetail,
  MAINTENANCE: ROUTES.maintenanceDetail,
  REPAIR: ROUTES.repairDetail,
  EXTERNAL_RENTAL_AGREEMENT: ROUTES.externalRentalDetail,
};

const REFERENCE_TYPE_LABELS: Record<string, string> = {
  PURCHASE_ORDER: "Purchase order",
  RENTAL_ORDER: "Rental order",
  MAINTENANCE: "Maintenance",
  REPAIR: "Repair",
  EXTERNAL_RENTAL_AGREEMENT: "External rental",
};

export function formatMovementType(type: string): string {
  const labels: Record<string, string> = {
    IN: "Stock in",
    OUT: "Stock out",
    RESERVE: "Reserved",
    RELEASE: "Released",
    ADJUSTMENT: "Adjusted",
  };

  return labels[type] ?? type;
}

export function formatReferenceType(referenceType: string | null): string {
  if (!referenceType) {
    return "Manual";
  }

  return REFERENCE_TYPE_LABELS[referenceType] ?? referenceType.replaceAll("_", " ");
}

export function resolveReferenceHref(
  referenceType: string | null,
  referenceId: string | null,
): string | null {
  if (!referenceType || !referenceId) {
    return null;
  }

  const builder = REFERENCE_ROUTE_BUILDERS[referenceType];
  return builder ? builder(referenceId) : null;
}
