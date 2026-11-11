import { ROUTES } from "@/config/routes";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type {
  AttentionItem,
  BusinessPulse,
  DashboardMetric,
  LiveDashboardSummary,
  OpsHealthItem,
  QuickAction,
} from "../types";

function formatCount(value: number): string {
  return formatNumber(value);
}

function activeRentals(summary: LiveDashboardSummary): number {
  return summary.confirmedOrders + summary.reservedOrders;
}

function openAssetJobs(summary: LiveDashboardSummary): number {
  return (
    summary.repairsPending +
    summary.repairsInProgress +
    summary.maintenanceScheduled +
    summary.maintenanceInProgress
  );
}

function utilizationPercent(summary: LiveDashboardSummary): number {
  if (summary.inventoryQuantity <= 0) return 0;
  return Math.round((summary.reservedQuantity / summary.inventoryQuantity) * 100);
}

/**
 * Maps live reporting counters into Operations Control Center zones.
 * Priority: today field work → attention → money → inventory → upcoming.
 * Presentation only — no new business calculations beyond existing pulse math.
 */
export function toBusinessPulse(summary: LiveDashboardSummary): BusinessPulse {
  const rentalsActive = activeRentals(summary);
  const assetJobs = openAssetJobs(summary);
  const utilization = utilizationPercent(summary);
  const collectionGap = Math.max(
    0,
    summary.revenueThisMonth - summary.paymentsThisMonth,
  );

  const pulseMetrics: DashboardMetric[] = [
    {
      id: "revenue-mtd",
      label: "Revenue MTD",
      value: formatCurrency(summary.revenueThisMonth),
      subtitle: "Billed this month",
      trend: summary.revenueThisMonth > 0 ? "up" : "neutral",
      changeLabel:
        summary.averageRentalDuration > 0
          ? `Avg rental ${summary.averageRentalDuration.toFixed(1)} days`
          : "No rentals yet",
      icon: "payments",
      href: ROUTES.reportsRevenue,
    },
    {
      id: "cash-collected",
      label: "Cash collected",
      value: formatCurrency(summary.paymentsThisMonth),
      subtitle: "Payments received MTD",
      trend:
        collectionGap > 0
          ? "down"
          : summary.paymentsThisMonth > 0
            ? "up"
            : "neutral",
      changeLabel:
        collectionGap > 0
          ? `${formatCurrency(collectionGap)} still to collect`
          : "Collections on track",
      icon: "payments",
      href: ROUTES.payments,
    },
    {
      id: "active-rentals",
      label: "Active rentals",
      value: formatCount(rentalsActive),
      subtitle: `${formatCount(summary.reservedOrders)} reserved · ${formatCount(summary.confirmedOrders)} confirmed`,
      trend: rentalsActive > 0 ? "up" : "neutral",
      changeLabel: `${formatCount(summary.completedRentals)} completed`,
      icon: "orders",
      href: ROUTES.rentalOrders,
    },
    {
      id: "outstanding-ar",
      label: "Unpaid invoices",
      value: formatCount(summary.outstandingInvoices),
      subtitle: "Awaiting customer payment",
      trend: summary.outstandingInvoices > 0 ? "down" : "up",
      changeLabel: `${formatCount(summary.paidInvoices)} paid`,
      icon: "payments",
      href: `${ROUTES.rentalInvoices}?paymentStatus=unpaid`,
    },
  ];

  const attention: AttentionItem[] = [];

  if (summary.outstandingInvoices > 0) {
    attention.push({
      id: "ar",
      severity: summary.outstandingInvoices >= 5 ? "critical" : "warning",
      title: `${formatCount(summary.outstandingInvoices)} invoices unpaid`,
      detail: "Cash is sitting with customers — chase collections first.",
      href: `${ROUTES.rentalInvoices}?paymentStatus=unpaid`,
      cta: "Open invoices",
    });
  }

  if (collectionGap > 0 && summary.revenueThisMonth > 0) {
    attention.push({
      id: "collection-gap",
      severity: "warning",
      title: `${formatCurrency(collectionGap)} billed but not collected`,
      detail: "Month-to-date billing is ahead of cash in the door.",
      href: ROUTES.payments,
      cta: "Receive payment",
    });
  }

  if (summary.dispatchesReady > 0) {
    attention.push({
      id: "dispatch-ready",
      severity: "warning",
      title: `${formatCount(summary.dispatchesReady)} deliveries ready to leave`,
      detail: "Events fail when tents stay in the warehouse.",
      href: ROUTES.dispatches,
      cta: "View dispatches",
    });
  }

  if (summary.dispatchesInProgress > 0) {
    attention.push({
      id: "dispatch-transit",
      severity: "info",
      title: `${formatCount(summary.dispatchesInProgress)} deliveries in transit`,
      detail: "Track arrival and crew confirmation.",
      href: ROUTES.dispatches,
      cta: "Track deliveries",
    });
  }

  if (summary.pendingReturns > 0) {
    attention.push({
      id: "returns",
      severity: summary.pendingReturns >= 5 ? "critical" : "warning",
      title: `${formatCount(summary.pendingReturns)} returns pending`,
      detail: "Stock stays unavailable until returns are inspected.",
      href: ROUTES.returns,
      cta: "Process returns",
    });
  }

  if (assetJobs > 0) {
    attention.push({
      id: "asset-jobs",
      severity: "warning",
      title: `${formatCount(assetJobs)} assets in repair / maintenance`,
      detail: "Damaged gear cannot go out on the next booking.",
      href:
        summary.repairsPending + summary.repairsInProgress > 0
          ? ROUTES.repairs
          : ROUTES.maintenance,
      cta: "Open work queue",
    });
  }

  if (summary.openPurchaseOrders > 0) {
    attention.push({
      id: "procurement",
      severity: "info",
      title: `${formatCount(summary.openPurchaseOrders)} purchase orders open`,
      detail: "Watch supplier lead times before peak event dates.",
      href: ROUTES.procurements,
      cta: "View procurement",
    });
  }

  if (summary.availableQuantity === 0 && summary.inventoryQuantity > 0) {
    attention.push({
      id: "stock-out",
      severity: "critical",
      title: "No stock available to rent",
      detail: "Everything is reserved or out — new bookings will slip.",
      href: `${ROUTES.inventory}?stockStatus=out-of-stock`,
      cta: "Check inventory",
    });
  }

  const todayOps: OpsHealthItem[] = [
    {
      id: "ready-dispatch",
      label: "Ready to dispatch",
      value: formatCount(summary.dispatchesReady),
      hint: "Waiting to leave yard",
      tone: summary.dispatchesReady > 0 ? "warning" : "ok",
      href: ROUTES.dispatches,
    },
    {
      id: "in-transit",
      label: "In transit",
      value: formatCount(summary.dispatchesInProgress),
      hint: "On the road",
      tone: summary.dispatchesInProgress > 0 ? "neutral" : "ok",
      href: ROUTES.dispatches,
    },
    {
      id: "pending-returns",
      label: "Pending returns",
      value: formatCount(summary.pendingReturns),
      hint: "Need inspection",
      tone: summary.pendingReturns > 0 ? "warning" : "ok",
      href: ROUTES.returns,
    },
    {
      id: "asset-work",
      label: "Repair & maintenance",
      value: formatCount(assetJobs),
      hint: "Assets offline",
      tone: assetJobs > 0 ? "warning" : "ok",
      href:
        summary.repairsPending + summary.repairsInProgress > 0
          ? ROUTES.repairs
          : ROUTES.maintenance,
    },
  ];

  const inventoryHealth: OpsHealthItem[] = [
    {
      id: "on-hand",
      label: "On hand",
      value: formatCount(summary.inventoryQuantity),
      hint: formatCurrency(summary.inventoryValue) + " inventory value",
      tone: "neutral",
      href: ROUTES.inventory,
    },
    {
      id: "fleet-out",
      label: "Qty committed",
      value: formatCount(summary.reservedQuantity),
      hint: `${utilization}% of stock committed`,
      tone: utilization >= 85 ? "warning" : "neutral",
      href: ROUTES.inventory,
    },
    {
      id: "available",
      label: "Available to rent",
      value: formatCount(summary.availableQuantity),
      hint:
        summary.availableQuantity === 0 && summary.inventoryQuantity > 0
          ? "Stock-out risk"
          : "Ready for new bookings",
      tone: summary.availableQuantity === 0 && summary.inventoryQuantity > 0
        ? "critical"
        : "ok",
      href: ROUTES.inventory,
    },
  ];

  const upcoming: OpsHealthItem[] = [
    {
      id: "reserved-orders",
      label: "Reserved orders",
      value: formatCount(summary.reservedOrders),
      hint: "Holding availability",
      tone: summary.reservedOrders > 0 ? "neutral" : "ok",
      href: ROUTES.rentalOrders,
    },
    {
      id: "confirmed-orders",
      label: "Confirmed orders",
      value: formatCount(summary.confirmedOrders),
      hint: "Active commitments",
      tone: summary.confirmedOrders > 0 ? "neutral" : "ok",
      href: ROUTES.rentalOrders,
    },
    {
      id: "open-pos",
      label: "Open purchase orders",
      value: formatCount(summary.openPurchaseOrders),
      hint: "Inbound supply",
      tone: summary.openPurchaseOrders > 0 ? "warning" : "ok",
      href: ROUTES.procurements,
    },
  ];

  const opsHealth: OpsHealthItem[] = [...todayOps, ...inventoryHealth.slice(1)];

  const headline =
    attention.length === 0
      ? "Operations look clear — no urgent blockers right now."
      : attention.length === 1
        ? "1 issue needs attention in the next few minutes."
        : `${attention.length} issues need attention before the next event.`;

  return {
    headline,
    attentionCount: attention.length,
    pulseMetrics,
    attention,
    opsHealth,
    todayOps,
    inventoryHealth,
    upcoming,
    catalog: {
      customers: summary.totalCustomers,
      products: summary.totalProducts,
      suppliers: summary.totalSuppliers,
      warehouses: summary.totalWarehouses,
    },
  };
}

export const DASHBOARD_QUICK_ACTIONS: QuickAction[] = [
  { id: "new-rental", label: "New rental", href: ROUTES.rentalOrdersNew },
  { id: "receive-payment", label: "Receive payment", href: ROUTES.paymentsNew },
  { id: "new-invoice", label: "Rental invoices", href: ROUTES.rentalInvoices },
  { id: "purchase-order", label: "Purchase order", href: ROUTES.procurementsNew },
  { id: "new-customer", label: "New customer", href: ROUTES.customersNew },
  { id: "add-product", label: "Add product", href: ROUTES.productsNew },
];
