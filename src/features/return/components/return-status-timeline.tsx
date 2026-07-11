import type { ReturnStatus } from "../types";
import { STATUS_LABELS } from "../mappers";

const STATUS_FLOW: ReturnStatus[] = ["DRAFT", "RECEIVED", "INSPECTED", "COMPLETED"];

type ReturnStatusTimelineProps = {
  status: ReturnStatus;
};

export function ReturnStatusTimeline({ status }: ReturnStatusTimelineProps) {
  if (status === "CANCELLED") {
    return (
      <ol className="space-y-3" aria-label="Return status timeline">
        <li className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="size-2 rounded-full bg-muted-foreground" aria-hidden="true" />
          Cancelled
        </li>
      </ol>
    );
  }

  const currentIndex = STATUS_FLOW.indexOf(status);

  return (
    <ol className="space-y-3" aria-label="Return status timeline">
      {STATUS_FLOW.map((step, index) => {
        const isComplete = index <= currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <li
            key={step}
            className={
              isComplete
                ? "flex items-center gap-3 text-sm"
                : "flex items-center gap-3 text-sm text-muted-foreground"
            }
            aria-current={isCurrent ? "step" : undefined}
          >
            <span
              className={
                isComplete
                  ? "size-2 rounded-full bg-primary"
                  : "size-2 rounded-full bg-muted"
              }
              aria-hidden="true"
            />
            {STATUS_LABELS[step]}
          </li>
        );
      })}
    </ol>
  );
}
