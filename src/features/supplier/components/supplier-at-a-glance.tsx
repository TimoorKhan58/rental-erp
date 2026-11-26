"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { useSupplierBalances } from "../hooks/use-supplier-balances";

type SupplierAtAGlanceProps = {
  supplierId: string;
};

/**
 * What you owe this supplier, first: unpaid purchases plus unpaid hire-ins
 * (usability revamp). It used to be a small figure inside the purchases box.
 */
export function SupplierAtAGlance({ supplierId }: SupplierAtAGlanceProps) {
  const { owedBySupplier, isLoaded } = useSupplierBalances();
  const owed = owedBySupplier.get(supplierId) ?? 0;

  return (
    <section
      aria-label="What you owe this supplier"
      className="flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3.5 shadow-soft"
    >
      <span className="text-xs text-muted-foreground">You owe this supplier</span>
      <span
        className={cn(
          "text-2xl font-semibold tabular-nums tracking-tight",
          owed > 0 ? "text-warning-foreground" : "text-foreground",
        )}
      >
        {isLoaded ? formatCurrency(owed) : "…"}
      </span>
      <span className="text-xs text-muted-foreground">
        {!isLoaded ? "Checking purchases and hire-ins" : owed > 0 ? "Unpaid purchases and hire-ins" : "Nothing owed"}
      </span>
    </section>
  );
}
