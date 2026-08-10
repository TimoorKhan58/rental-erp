import type { ExpenseStatus } from "../types";
import { STATUS_LABELS } from "../mappers";

type ExpenseStatusTimelineProps = {
  status: ExpenseStatus;
};

const HAPPY_PATH: ExpenseStatus[] = ["DRAFT", "SUBMITTED", "APPROVED", "PAID"];

export function ExpenseStatusTimeline({ status }: ExpenseStatusTimelineProps) {
  if (status === "REJECTED") {
    return (
      <ol className="space-y-3" aria-label="Expense status timeline">
        {(["DRAFT", "SUBMITTED", "REJECTED"] as const).map((step, index) => {
          const isCurrent = step === "REJECTED";
          return (
            <li key={step} className="flex items-center gap-3">
              <span
                className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                  isCurrent
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-primary/20 text-primary"
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

  const currentIndex = HAPPY_PATH.indexOf(status);

  return (
    <ol className="space-y-3" aria-label="Expense status timeline">
      {HAPPY_PATH.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li key={step} className="flex items-center gap-3">
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                isCurrent
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
