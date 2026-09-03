import { describe, expect, it } from "vitest";

import { GetDispatchSummaryService } from "@/modules/dispatch/application/services/get-dispatch-summary.service";
import { computeDispatchSummaryResult } from "@/modules/dispatch/domain/dispatch-summary.rules";
import type { DispatchId } from "@/shared/domain/ids";

import {
  buildDispatchEntity,
  DISPATCH_ID,
} from "../tests/helpers/dispatch.fixtures";
import {
  createSeededDispatchRepository,
  InMemoryDispatchRepository,
} from "../tests/helpers/in-memory-dispatch.repository";

function buildManyDraftDispatches(count: number) {
  return Array.from({ length: count }, (_, index) =>
    buildDispatchEntity({
      id: `bb0e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}` as DispatchId,
      status: "DRAFT",
    }),
  );
}

describe("N-39-PATTERN-01 Batch 1 — dispatch summary stats completeness", () => {
  it("returns correct summary for exactly 100 dispatches", async () => {
    const repository = createSeededDispatchRepository(buildManyDraftDispatches(100));
    const service = new GetDispatchSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalDispatches).toBe(100);
    expect(summary.statusCounts.all).toBe(100);
    expect(summary.statusCounts.DRAFT).toBe(100);
  });

  it("returns correct summary for 101 dispatches (pagination boundary)", async () => {
    const repository = createSeededDispatchRepository(buildManyDraftDispatches(101));
    const service = new GetDispatchSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalDispatches).toBe(101);
    expect(summary.statusCounts.all).toBe(101);
    expect(summary.statusCounts.DRAFT).toBe(101);
  });

  it("returns correct summary for 150 dispatches", async () => {
    const repository = createSeededDispatchRepository(buildManyDraftDispatches(150));
    const service = new GetDispatchSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalDispatches).toBe(150);
    expect(summary.statusCounts.DRAFT).toBe(150);
  });

  it("counts each status across the full dataset", async () => {
    const dispatches = [
      buildDispatchEntity({ id: DISPATCH_ID, status: "DRAFT" }),
      buildDispatchEntity({
        id: "bb0e8400-e29b-41d4-a716-446655440002" as DispatchId,
        status: "COMPLETED",
      }),
      buildDispatchEntity({
        id: "bb0e8400-e29b-41d4-a716-446655440003" as DispatchId,
        status: "CANCELLED",
      }),
    ];
    const repository = createSeededDispatchRepository(dispatches);
    const service = new GetDispatchSummaryService(repository);

    const summary = await service.execute({});
    const expected = computeDispatchSummaryResult(dispatches);

    expect(summary).toEqual(expected);
    expect(summary.stats.activeDispatches).toBe(2);
    expect(summary.statusCounts.CANCELLED).toBe(1);
  });

  it("applies status filter to summary counts", async () => {
    const repository = createSeededDispatchRepository([
      buildDispatchEntity({ status: "DRAFT" }),
      buildDispatchEntity({
        id: "bb0e8400-e29b-41d4-a716-446655440004" as DispatchId,
        status: "COMPLETED",
      }),
    ]);
    const service = new GetDispatchSummaryService(repository);

    const summary = await service.execute({ status: "DRAFT" });

    expect(summary.stats.totalDispatches).toBe(1);
    expect(summary.statusCounts.DRAFT).toBe(1);
  });

  it("returns zeroed summary for empty dataset", async () => {
    const repository = new InMemoryDispatchRepository();
    const service = new GetDispatchSummaryService(repository);

    const summary = await service.execute({});

    expect(summary.stats.totalDispatches).toBe(0);
    expect(summary.statusCounts.all).toBe(0);
    expect(summary.stats.totalUnits).toBe(0);
  });
});
