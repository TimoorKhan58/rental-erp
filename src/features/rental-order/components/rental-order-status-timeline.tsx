import type { RentalOrderStatus } from "../types";
import { STATUS_LABELS } from "../mappers";
import { cn } from "@/lib/utils";

const STATUS_FLOW: RentalOrderStatus[] = [
  "DRAFT",
  "CONFIRMED",
  "RESERVED",
  "DISPATCHED",
  "ON_RENT",
  "PARTIALLY_RETURNED",
  "RETURNED",
  "COMPLETED",
];

type RentalOrderStatusTimelineProps = {
  status: RentalOrderStatus;
};

export function RentalOrderStatusTimeline({ status }: RentalOrderStatusTimelineProps) {
  if (status === "CANCELLED") {
    return (
      <ol className="space-y-2" aria-label="Rental order status timeline">
        <li className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="size-2 rounded-full bg-muted-foreground" aria-hidden="true" />
          Cancelled
        </li>
      </ol>
    );
  }

  const currentIndex = STATUS_FLOW.indexOf(status);

  return (
    <ol className="space-y-2" aria-label="Rental order status timeline">
      {STATUS_FLOW.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li
            key={step}
            className={cn(
              "flex items-center gap-3 text-sm",
              isCurrent
                ? "font-medium text-foreground"
                : isComplete
                  ? "text-foreground"
                  : "text-muted-foreground",
            )}
            aria-current={isCurrent ? "step" : undefined}
          >
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                isCurrent
                  ? "bg-primary ring-2 ring-primary/25"
                  : isComplete
                    ? "bg-primary"
                    : "bg-muted",
              )}
              aria-hidden="true"
            />
            {STATUS_LABELS[step]}
          </li>
        );
      })}
    </ol>
  );
}
