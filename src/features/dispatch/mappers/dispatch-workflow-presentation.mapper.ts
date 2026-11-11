import type { DispatchStatus } from "../types";
import {
  canCompleteDispatch,
  canMarkDispatchReady,
  DELIVERY_METHOD_LABELS,
  STATUS_LABELS,
} from "./dispatch-status.mapper";

/** Operator-visible workflow (actions the user performs). Domain may use ephemeral DISPATCHED during Complete. */
export const OPERATOR_DISPATCH_WORKFLOW_STEPS = [
  {
    id: "prepare",
    label: "Prepare",
    operationalHint:
      "Draft dispatch — edit lines and delivery details, then mark ready when stock is prepared.",
  },
  {
    id: "ready",
    label: "Ready",
    operationalHint:
      "Prepared for handoff — complete dispatch to post inventory out and finish this delivery.",
  },
  {
    id: "complete",
    label: "Complete",
    operationalHint:
      "Dispatch finished — inventory and rental order updates are recorded.",
  },
] as const;

export type OperatorDispatchWorkflowStepId =
  (typeof OPERATOR_DISPATCH_WORKFLOW_STEPS)[number]["id"];

/**
 * Maps persisted dispatch status to the operator workflow step index (0–2).
 * DISPATCHED is a short-lived domain state during Complete; operators treat it as finishing.
 */
export function getOperatorDispatchWorkflowIndex(status: DispatchStatus): number {
  switch (status) {
    case "DRAFT":
      return 0;
    case "READY":
      return 1;
    case "DISPATCHED":
    case "COMPLETED":
      return 2;
    case "CANCELLED":
      return -1;
    default:
      return 0;
  }
}

export function getOperatorDispatchWorkflowProgress(status: DispatchStatus): number {
  const index = getOperatorDispatchWorkflowIndex(status);
  if (index < 0) {
    return 0;
  }

  return Math.round(((index + 1) / OPERATOR_DISPATCH_WORKFLOW_STEPS.length) * 100);
}

export function getOperatorDispatchWorkflowCaption(): string {
  return "Prepare → Mark ready → Complete dispatch";
}

export type DispatchOperatorGuidance = {
  statusMeaning: string;
  nextActionLabel: string | null;
  nextActionHint: string | null;
};

export function getDispatchOperatorGuidance(input: {
  status: DispatchStatus;
  deliveryMethod: string;
}): DispatchOperatorGuidance {
  const method =
    DELIVERY_METHOD_LABELS[input.deliveryMethod] ?? input.deliveryMethod;

  switch (input.status) {
    case "DRAFT":
      return {
        statusMeaning: `Draft — ${method} not yet marked ready.`,
        nextActionLabel: canMarkDispatchReady("DRAFT") ? "Mark ready" : null,
        nextActionHint: canMarkDispatchReady("DRAFT")
          ? "Confirm preparation is done before the customer pickup or delivery run."
          : null,
      };
    case "READY":
      return {
        statusMeaning: `Ready — ${method} is prepared for handoff.`,
        nextActionLabel: canCompleteDispatch("READY") ? "Complete dispatch" : null,
        nextActionHint: canCompleteDispatch("READY")
          ? "Completing posts inventory OUT for owned stock and closes this dispatch. There is no separate “Dispatched” step to click."
          : null,
      };
    case "DISPATCHED":
      return {
        statusMeaning: "Completing dispatch (system step) — finishing inventory and status updates.",
        nextActionLabel: null,
        nextActionHint: null,
      };
    case "COMPLETED":
      return {
        statusMeaning: `Completed — ${method} is closed.`,
        nextActionLabel: null,
        nextActionHint: null,
      };
    case "CANCELLED":
      return {
        statusMeaning: "Cancelled — no further dispatch actions.",
        nextActionLabel: null,
        nextActionHint: null,
      };
    default:
      return {
        statusMeaning: "Dispatch status",
        nextActionLabel: null,
        nextActionHint: null,
      };
  }
}

/** Badge label; DISPATCHED is system-only during Complete — not a separate operator action. */
export function getOperatorFacingStatusLabel(status: DispatchStatus): string {
  if (status === "DISPATCHED") {
    return "Completing";
  }

  return STATUS_LABELS[status];
}
