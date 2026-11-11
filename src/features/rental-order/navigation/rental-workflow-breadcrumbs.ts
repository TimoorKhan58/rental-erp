import { ROUTES } from "@/config/routes";
import type { BreadcrumbItem } from "@/components/layout/page-header";

export type RentalWorkflowParent = {
  rentalOrderId: string;
  rentalOrderNumber: string;
};

/**
 * Resolves rental parent context for workflow breadcrumbs/back links.
 * Returns null when rental order ID is missing — callers must fall back to module list.
 */
export function resolveRentalWorkflowParent(input: {
  rentalOrderId?: string | null;
  rentalOrderNumber?: string | null;
}): RentalWorkflowParent | null {
  const rentalOrderId = input.rentalOrderId?.trim();
  if (!rentalOrderId) {
    return null;
  }

  const rentalOrderNumber = input.rentalOrderNumber?.trim();
  return {
    rentalOrderId,
    rentalOrderNumber:
      rentalOrderNumber && rentalOrderNumber.length > 0
        ? rentalOrderNumber
        : "Rental order",
  };
}

export function buildWorkflowDetailBreadcrumbs(input: {
  rentalParent: RentalWorkflowParent | null;
  module: { label: string; href: string };
  currentLabel: string;
}): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [
    { label: "Dashboard", href: ROUTES.dashboard },
    { label: "Rental Orders", href: ROUTES.rentalOrders },
  ];

  if (input.rentalParent) {
    crumbs.push({
      label: input.rentalParent.rentalOrderNumber,
      href: ROUTES.rentalOrderDetail(input.rentalParent.rentalOrderId),
    });
  }

  crumbs.push({ label: input.module.label, href: input.module.href });
  crumbs.push({ label: input.currentLabel });
  return crumbs;
}

export function buildPaymentDetailBreadcrumbs(input: {
  rentalParent: RentalWorkflowParent | null;
  invoice: { id: string; invoiceNumber: string } | null;
  paymentNumber: string;
}): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [
    { label: "Dashboard", href: ROUTES.dashboard },
    { label: "Rental Orders", href: ROUTES.rentalOrders },
  ];

  if (input.rentalParent) {
    crumbs.push({
      label: input.rentalParent.rentalOrderNumber,
      href: ROUTES.rentalOrderDetail(input.rentalParent.rentalOrderId),
    });
  }

  crumbs.push({ label: "Rental Invoices", href: ROUTES.rentalInvoices });

  if (input.invoice) {
    crumbs.push({
      label: input.invoice.invoiceNumber,
      href: ROUTES.rentalInvoiceDetail(input.invoice.id),
    });
  }

  crumbs.push({ label: input.paymentNumber });
  return crumbs;
}

export function rentalOrderBackHref(
  rentalParent: RentalWorkflowParent | null,
): string | null {
  if (!rentalParent) {
    return null;
  }

  return ROUTES.rentalOrderDetail(rentalParent.rentalOrderId);
}

export function rentalOrderBackLabel(rentalParent: RentalWorkflowParent): string {
  return `Back to ${rentalParent.rentalOrderNumber}`;
}
