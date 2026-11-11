import { describe, expect, it } from "vitest";
import {
  canCancelDispatch,
  canCompleteDispatch,
  canEditDispatch,
  canMarkDispatchReady,
} from "./dispatch-status.mapper";

describe("dispatch status action gating", () => {
  it("allows edit and mark-ready only while draft", () => {
    expect(canEditDispatch("DRAFT")).toBe(true);
    expect(canMarkDispatchReady("DRAFT")).toBe(true);
    expect(canEditDispatch("READY")).toBe(false);
    expect(canMarkDispatchReady("READY")).toBe(false);
    expect(canEditDispatch("COMPLETED")).toBe(false);
  });

  it("allows complete only from ready", () => {
    expect(canCompleteDispatch("READY")).toBe(true);
    expect(canCompleteDispatch("DRAFT")).toBe(false);
    expect(canCompleteDispatch("DISPATCHED")).toBe(false);
    expect(canCompleteDispatch("COMPLETED")).toBe(false);
  });

  it("allows cancel for draft and ready only", () => {
    expect(canCancelDispatch("DRAFT")).toBe(true);
    expect(canCancelDispatch("READY")).toBe(true);
    expect(canCancelDispatch("DISPATCHED")).toBe(false);
    expect(canCancelDispatch("COMPLETED")).toBe(false);
    expect(canCancelDispatch("CANCELLED")).toBe(false);
  });
});
