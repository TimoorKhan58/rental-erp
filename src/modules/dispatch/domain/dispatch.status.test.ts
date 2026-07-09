import { describe, expect, it } from "vitest";

import { Dispatch } from "@/modules/dispatch/domain/dispatch.entity";
import {
  assertCanCancel,
  assertCanComplete,
  assertCanMarkReady,
  assertCanUpdate,
} from "@/modules/dispatch/domain/dispatch.rules";
import { DispatchInvalidStatusError } from "@/modules/dispatch/domain/dispatch.errors";

import {
  buildCompletedDispatchEntity,
  buildCreateDispatchData,
  buildDispatchEntity,
  buildDispatchedDispatchEntity,
} from "../tests/helpers/dispatch.fixtures";

describe("status transition guards", () => {
  it("assertCanUpdate allows draft", () => {
    expect(() => assertCanUpdate("DRAFT")).not.toThrow();
  });

  it("assertCanUpdate rejects ready", () => {
    expect(() => assertCanUpdate("READY")).toThrow(DispatchInvalidStatusError);
  });

  it("assertCanMarkReady allows draft", () => {
    expect(() => assertCanMarkReady("DRAFT")).not.toThrow();
  });

  it("assertCanMarkReady rejects ready", () => {
    expect(() => assertCanMarkReady("READY")).toThrow(
      DispatchInvalidStatusError,
    );
  });

  it("assertCanComplete allows ready", () => {
    expect(() => assertCanComplete("READY")).not.toThrow();
  });

  it("assertCanComplete rejects draft", () => {
    expect(() => assertCanComplete("DRAFT")).toThrow(
      DispatchInvalidStatusError,
    );
  });

  it("assertCanCancel allows draft", () => {
    expect(() => assertCanCancel("DRAFT")).not.toThrow();
  });

  it("assertCanCancel allows ready", () => {
    expect(() => assertCanCancel("READY")).not.toThrow();
  });

  it("assertCanCancel rejects dispatched", () => {
    expect(() => assertCanCancel("DISPATCHED")).toThrow(
      DispatchInvalidStatusError,
    );
  });
});

describe("dispatch entity edge cases", () => {
  it("transitions through full workflow", () => {
    const draft = buildDispatchEntity();
    const ready = draft.withReady();
    const dispatched = ready.withDispatched();
    const completed = dispatched.withCompleted();

    expect(completed.status).toBe("COMPLETED");
    expect(completed.readyAt).not.toBeNull();
    expect(completed.dispatchedAt).not.toBeNull();
    expect(completed.completedAt).not.toBeNull();
  });

  it("rejects cancel on dispatched entity", () => {
    const dispatched = buildDispatchedDispatchEntity();

    expect(() => dispatched.withCancelled()).toThrow(
      DispatchInvalidStatusError,
    );
  });

  it("rejects cancel on completed entity", () => {
    const completed = buildCompletedDispatchEntity();

    expect(() => completed.withCancelled()).toThrow(
      DispatchInvalidStatusError,
    );
  });

  it("normalizes optional remarks to null", () => {
    const dispatch = Dispatch.create(
      buildCreateDispatchData({ remarks: "   " }),
    );

    expect(dispatch.remarks).toBeNull();
  });
});
