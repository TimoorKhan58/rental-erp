import { describe, expect, it } from "vitest";
import { ROUTES } from "@/config/routes";
import {
  buildPaymentDetailBreadcrumbs,
  buildWorkflowDetailBreadcrumbs,
  rentalOrderBackHref,
  resolveRentalWorkflowParent,
} from "./rental-workflow-breadcrumbs";

describe("rental workflow breadcrumbs", () => {
  const parent = resolveRentalWorkflowParent({
    rentalOrderId: "ord-1",
    rentalOrderNumber: "RO-100",
  });

  it("returns null parent without rental order id", () => {
    expect(
      resolveRentalWorkflowParent({ rentalOrderId: "", rentalOrderNumber: "RO-1" }),
    ).toBeNull();
  });

  it("builds dispatch-style breadcrumbs with rental parent", () => {
    const crumbs = buildWorkflowDetailBreadcrumbs({
      rentalParent: parent,
      module: { label: "Dispatches", href: ROUTES.dispatches },
      currentLabel: "DIS-9",
    });

    expect(crumbs.map((c) => c.label)).toEqual([
      "Dashboard",
      "Rental Orders",
      "RO-100",
      "Dispatches",
      "DIS-9",
    ]);
    expect(crumbs[2].href).toBe(ROUTES.rentalOrderDetail("ord-1"));
  });

  it("falls back to module trail without rental parent", () => {
    const crumbs = buildWorkflowDetailBreadcrumbs({
      rentalParent: null,
      module: { label: "Returns", href: ROUTES.returns },
      currentLabel: "RET-1",
    });

    expect(crumbs.map((c) => c.label)).toEqual([
      "Dashboard",
      "Rental Orders",
      "Returns",
      "RET-1",
    ]);
  });

  it("builds payment chain with invoice and rental", () => {
    const crumbs = buildPaymentDetailBreadcrumbs({
      rentalParent: parent,
      invoice: { id: "inv-1", invoiceNumber: "INV-50" },
      paymentNumber: "PAY-7",
    });

    expect(crumbs.map((c) => c.label)).toEqual([
      "Dashboard",
      "Rental Orders",
      "RO-100",
      "Rental Invoices",
      "INV-50",
      "PAY-7",
    ]);
    expect(rentalOrderBackHref(parent)).toBe(ROUTES.rentalOrderDetail("ord-1"));
  });
});
