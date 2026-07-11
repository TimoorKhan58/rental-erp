import type { PaymentStatus } from "../types";
import { STATUS_LABELS } from "../mappers";

type PaymentStatusTimelineProps = {
  status: PaymentStatus;
};

const STATUS_ORDER: PaymentStatus[] = ["PENDING", "POSTED", "VOID"];

export function PaymentStatusTimeline({ status }: PaymentStatusTimelineProps) {
  const currentIndex = STATUS_ORDER.indexOf(status);

  return (
    <ol className="space-y-3" aria-label="Payment status timeline">
      {STATUS_ORDER.map((step, index) => {
        const isComplete = index < currentIndex || (index === currentIndex && status !== "VOID");
        const isCurrent = index === currentIndex;
        const isVoidTerminal = status === "VOID" && step === "VOID";

        return (
          <li key={step} className="flex items-center gap-3">
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                isVoidTerminal
                  ? "bg-muted text-muted-foreground"
                  : isCurrent
                    ? "bg-primary text-primary-foreground"
                    : isComplete
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
              }`}
              aria-current={isCurrent ? "step" : undefined}
            >
              {index + 1}
            </span>
            <span className={isCurrent ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
              {STATUS_LABELS[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
