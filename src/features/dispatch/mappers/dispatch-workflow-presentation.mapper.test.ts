import { describe, expect, it } from "vitest";
import {
  getDispatchOperatorGuidance,
  getOperatorDispatchWorkflowIndex,
  getOperatorDispatchWorkflowProgress,
  getOperatorFacingStatusLabel,
} from "./dispatch-workflow-presentation.mapper";

describe("dispatch operator workflow presentation", () => {
  it("uses three operator steps (no standalone Dispatched step)", () => {
    expect(getOperatorDispatchWorkflowIndex("DRAFT")).toBe(0);
    expect(getOperatorDispatchWorkflowIndex("READY")).toBe(1);
    expect(getOperatorDispatchWorkflowIndex("DISPATCHED")).toBe(2);
    expect(getOperatorDispatchWorkflowIndex("COMPLETED")).toBe(2);
  });

  it("progress reaches 100% only when complete", () => {
    expect(getOperatorDispatchWorkflowProgress("DRAFT")).toBe(33);
    expect(getOperatorDispatchWorkflowProgress("READY")).toBe(67);
    expect(getOperatorDispatchWorkflowProgress("COMPLETED")).toBe(100);
  });

  it("guides mark ready from draft and complete from ready", () => {
    const draft = getDispatchOperatorGuidance({
      status: "DRAFT",
      deliveryMethod: "CUSTOMER_PICKUP",
    });
    expect(draft.nextActionLabel).toBe("Mark ready");

    const ready = getDispatchOperatorGuidance({
      status: "READY",
      deliveryMethod: "DELIVERY",
    });
    expect(ready.nextActionLabel).toBe("Complete dispatch");
    expect(ready.nextActionHint).toMatch(/no separate/i);
  });

  it("labels ephemeral DISPATCHED as Completing for operators", () => {
    expect(getOperatorFacingStatusLabel("DISPATCHED")).toBe("Completing");
    expect(getOperatorFacingStatusLabel("READY")).toBe("Ready");
  });
});
