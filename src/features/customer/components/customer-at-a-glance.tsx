"use client";

import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useRentalInvoices } from "@/features/rental-invoice/hooks";
import { useRentalOrders } from "@/features/rental-order/hooks";
import { usePaymentPermissions } from "@/features/payment/hooks";

type CustomerAtAGlanceProps = {
  customerId: string;
};

function Figure({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "neutral" | "owes";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3.5 shadow-soft">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-2xl font-semibold tabular-nums tracking-tight",
          tone === "owes" ? "text-warning-foreground" : "text-foreground",
        )}
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </div>
  );
}

/**
 * The three things people ask first about a customer: what they owe, how
 * many orders they have had, and when they last rented (usability revamp).
 * Money is only shown to people who may see payments.
 */
export function CustomerAtAGlance({ customerId }: CustomerAtAGlanceProps) {
  const { canRead: canSeeMoney } = usePaymentPermissions();
  const invoices = useRentalInvoices({ customerId, page: 1, pageSize: 100, sortOrder: "desc" });
  const orders = useRentalOrders({ customerId, page: 1, pageSize: 1, sortOrder: "desc" });

  const open = (invoices.data?.items ?? []).filter(
    (invoice) => invoice.status !== "VOID" && invoice.balance > 0,
  );
  const owed = open.reduce((sum, invoice) => sum + invoice.balance, 0);
  const lastOrder = orders.data?.items[0];
  const orderCount = orders.data?.meta.total ?? 0;

  return (
    <section
      aria-label="Customer at a glance"
      className={cn("grid gap-3", canSeeMoney ? "sm:grid-cols-3" : "sm:grid-cols-2")}
    >
      {canSeeMoney ? (
        <Figure
          label="Owes you"
          value={invoices.isLoading ? "…" : formatCurrency(owed)}
          note={
            invoices.isLoading
              ? "Checking invoices"
              : open.length === 0
                ? "Nothing owed"
                : `On ${open.length} unpaid invoice${open.length === 1 ? "" : "s"}`
          }
          tone={owed > 0 ? "owes" : "neutral"}
        />
      ) : null}
      <Figure
        label="Orders"
        value={orders.isLoading ? "…" : orderCount.toLocaleString()}
        note={orderCount === 1 ? "order so far" : "orders so far"}
      />
      <Figure
        label="Last order"
        value={lastOrder ? formatDate(lastOrder.startDate) : "—"}
        note={lastOrder ? lastOrder.orderNumber : "No orders yet"}
      />
    </section>
  );
}
