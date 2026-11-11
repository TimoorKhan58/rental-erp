import type { DispatchStatus } from "../types";
import { OPERATOR_DISPATCH_WORKFLOW_STEPS, getOperatorDispatchWorkflowIndex } from "../mappers/dispatch-workflow-presentation.mapper";

type DispatchStatusTimelineProps = {
  status: DispatchStatus;
};

export function DispatchStatusTimeline({ status }: DispatchStatusTimelineProps) {
  if (status === "CANCELLED") {
    return (
      <ol className="space-y-3" aria-label="Dispatch operator workflow">
        <li className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="size-2 rounded-full bg-muted-foreground" aria-hidden="true" />
          Cancelled
        </li>
      </ol>
    );
  }

  const currentIndex = getOperatorDispatchWorkflowIndex(status);

  return (
    <ol className="space-y-3" aria-label="Dispatch operator workflow">
      {OPERATOR_DISPATCH_WORKFLOW_STEPS.map((step, index) => {
        const isComplete =
          index < currentIndex ||
          (status === "COMPLETED" && index === currentIndex);
        const isCurrent = status !== "COMPLETED" && index === currentIndex;

        return (
          <li
            key={step.id}
            className={
              isComplete || isCurrent
                ? "flex flex-col gap-1 text-sm"
                : "flex flex-col gap-1 text-sm text-muted-foreground"
            }
            aria-current={isCurrent ? "step" : undefined}
          >
            <div className="flex items-center gap-3">
              <span
                className={
                  isComplete || isCurrent
                    ? "size-2 shrink-0 rounded-full bg-primary"
                    : "size-2 shrink-0 rounded-full bg-muted"
                }
                aria-hidden="true"
              />
              <span className="font-medium">{step.label}</span>
            </div>
            {isCurrent ? (
              <p className="pl-5 text-xs text-muted-foreground">{step.operationalHint}</p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
