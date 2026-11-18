/**
 * "Your work today" and the next 7 days for the dashboard (usability revamp
 * R2). Pure, so it is unit tested; dates are calendar days stored as
 * midnight UTC, and `today` is the business's own date (SaaS phase 4a).
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const DASHBOARD_SCHEDULE_DAYS = 7;
/** Enough for a busy week; the full list is on the calendar. */
export const DASHBOARD_SCHEDULE_LIMIT = 60;

/** Booked and waiting to go out. */
const GOING_OUT_STATUSES = new Set(["CONFIRMED", "RESERVED"]);
/** With the customer (fully or partly). */
const OUT_STATUSES = new Set(["DISPATCHED", "ON_RENT", "PARTIALLY_RETURNED"]);
/** Invoices that still need money. */
const UNPAID_INVOICE_STATUSES = new Set(["ISSUED", "PARTIALLY_PAID"]);

export interface WorklistOrder {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  eventStartDate: Date;
  expectedReturnDate: Date;
}

export interface WorklistInvoice {
  status: string;
  balance: number;
  dueDate: Date | null;
}

export interface DashboardScheduleEntry {
  /** YYYY-MM-DD (business calendar day). */
  date: string;
  direction: "out" | "back";
  orderId: string;
  orderNumber: string;
  customerName: string;
}

export interface DashboardWorklist {
  /** The business's date the worklist was built for (YYYY-MM-DD). */
  today: string;
  ordersGoingOutToday: number;
  ordersOutWithCustomers: number;
  lateReturns: number;
  unpaidInvoices: number;
  overdueInvoices: number;
  oldestOverdueDays: number | null;
  amountToCollect: number;
  schedule: DashboardScheduleEntry[];
}

function dayKey(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function isoDay(key: number): string {
  return new Date(key).toISOString().slice(0, 10);
}

export function buildDashboardWorklist(input: {
  orders: readonly WorklistOrder[];
  invoices: readonly WorklistInvoice[];
  today: Date;
}): DashboardWorklist {
  const today = dayKey(input.today);
  const windowEnd = today + (DASHBOARD_SCHEDULE_DAYS - 1) * DAY_MS;
  const inWindow = (key: number) => key >= today && key <= windowEnd;

  let ordersGoingOutToday = 0;
  let ordersOutWithCustomers = 0;
  let lateReturns = 0;
  const schedule: DashboardScheduleEntry[] = [];

  for (const order of input.orders) {
    const start = dayKey(order.eventStartDate);
    const back = dayKey(order.expectedReturnDate);

    if (GOING_OUT_STATUSES.has(order.status)) {
      if (start === today) ordersGoingOutToday += 1;
      if (inWindow(start)) {
        schedule.push({ date: isoDay(start), direction: "out", orderId: order.id, orderNumber: order.orderNumber, customerName: order.customerName });
      }
    }

    if (OUT_STATUSES.has(order.status)) {
      ordersOutWithCustomers += 1;
      if (back < today) lateReturns += 1;
      if (inWindow(back)) {
        schedule.push({ date: isoDay(back), direction: "back", orderId: order.id, orderNumber: order.orderNumber, customerName: order.customerName });
      }
    }
  }

  schedule.sort((a, b) => a.date.localeCompare(b.date) || a.direction.localeCompare(b.direction) || a.orderNumber.localeCompare(b.orderNumber));

  let unpaidInvoices = 0;
  let overdueInvoices = 0;
  let oldestOverdueDays: number | null = null;
  let amountToCollect = 0;
  for (const invoice of input.invoices) {
    if (!UNPAID_INVOICE_STATUSES.has(invoice.status)) continue;
    unpaidInvoices += 1;
    amountToCollect += invoice.balance;
    if (invoice.dueDate !== null && dayKey(invoice.dueDate) < today) {
      overdueInvoices += 1;
      const days = Math.round((today - dayKey(invoice.dueDate)) / DAY_MS);
      oldestOverdueDays = Math.max(oldestOverdueDays ?? 0, days);
    }
  }

  return {
    today: isoDay(today),
    ordersGoingOutToday,
    ordersOutWithCustomers,
    lateReturns,
    unpaidInvoices,
    overdueInvoices,
    oldestOverdueDays,
    amountToCollect: Math.round(amountToCollect * 100) / 100,
    schedule: schedule.slice(0, DASHBOARD_SCHEDULE_LIMIT),
  };
}
