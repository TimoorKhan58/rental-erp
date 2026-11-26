import { cn } from "@/lib/utils";

type InventoryQuantityBreakdownProps = {
  quantityOnHand: number;
  reservedQuantity: number;
  availableQuantity: number;
  /** compact = table cell; detail = larger hierarchy */
  size?: "compact" | "detail" | "inline";
  className?: string;
};

/**
 * Displays authoritative API quantity fields only.
 * Does not recompute availableQuantity.
 */
export function InventoryQuantityBreakdown({
  quantityOnHand,
  reservedQuantity,
  availableQuantity,
  size = "compact",
  className,
}: InventoryQuantityBreakdownProps) {
  if (size === "inline") {
    // Table rows: the number people act on (free to rent) first, the rest in
    // small text. The three labelled columns repeated on every row were noise.
    return (
      <div
        className={cn("min-w-[10rem] tabular-nums", className)}
        aria-label={`On hand ${quantityOnHand}, committed ${reservedQuantity}, available ${availableQuantity}`}
      >
        <p className="text-sm">
          <span className={cn("text-base font-semibold", availableQuantity <= 0 && "text-destructive")}>
            {availableQuantity.toLocaleString()}
          </span>{" "}
          <span className="text-muted-foreground">free to rent</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {quantityOnHand.toLocaleString()} in stock
          {reservedQuantity > 0 ? ` · ${reservedQuantity.toLocaleString()} booked` : ""}
        </p>
      </div>
    );
  }

  if (size === "detail") {
    return (
      <dl
        className={cn(
          "grid gap-3 sm:grid-cols-3",
          className,
        )}
      >
        <QuantityTile
          label="In stock"
          value={quantityOnHand}
          hint="Units physically in warehouse"
          emphasize="primary"
        />
        <QuantityTile
          label="Booked"
          value={reservedQuantity}
          hint="Reserved by active workflows"
          emphasize="muted"
        />
        <QuantityTile
          label="Free to rent"
          value={availableQuantity}
          hint="Can go on a new order"
          emphasize={availableQuantity <= 0 ? "danger" : "success"}
        />
      </dl>
    );
  }

  return (
    <div
      className={cn(
        "grid min-w-[11rem] grid-cols-3 gap-2 text-xs tabular-nums",
        className,
      )}
      aria-label={`On hand ${quantityOnHand}, committed ${reservedQuantity}, available ${availableQuantity}`}
    >
      <QuantityCell label="In stock" value={quantityOnHand} />
      <QuantityCell
        label="Booked"
        value={reservedQuantity}
        muted={reservedQuantity === 0}
      />
      <QuantityCell
        label="Free to rent"
        value={availableQuantity}
        emphasize={availableQuantity <= 0}
      />
    </div>
  );
}

function QuantityCell({
  label,
  value,
  muted,
  emphasize,
}: {
  label: string;
  value: number;
  muted?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "font-medium",
          muted && "text-muted-foreground",
          emphasize && "text-destructive",
        )}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function QuantityTile({
  label,
  value,
  hint,
  emphasize,
}: {
  label: string;
  value: number;
  hint: string;
  emphasize: "primary" | "muted" | "success" | "danger";
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 px-3 py-3">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 font-heading text-2xl font-semibold tracking-tight tabular-nums",
          emphasize === "muted" && "text-muted-foreground",
          emphasize === "success" && "text-success",
          emphasize === "danger" && "text-destructive",
        )}
      >
        {value.toLocaleString()}
      </dd>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
